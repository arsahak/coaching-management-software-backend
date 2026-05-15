// Read env vars lazily (inside functions) so dotenv.config() in server.ts
// has time to run before these values are consumed.
function getSmsConfig() {
  const base =
    process.env.BLUKSMS_API_URL || "http://bulksmsbd.net/api/smsapi";
  return {
    apiUrl: base,
    // Many-SMS uses a different endpoint: smsapimany
    apiUrlMany: base.replace(/\/smsapi$/, "/smsapimany"),
    apiKey: process.env.BLUKSMS_API_KEY || "",
    senderId: process.env.BLUKSMS_API_SENDER || "8809617634353",
  };
}

export interface SMSResponse {
  success: boolean;
  code?: number;
  message?: string;
  sentTo?: string[];
  failedNumbers?: string[];
}

/**
 * Format phone number to Bangladesh format (880XXXXXXXXX)
 */
function formatPhoneNumber(num: string): string {
  // Remove spaces, dashes, and other characters
  let cleaned = num.replace(/[\s\-\(\)]/g, "");

  // Add country code if not present
  if (!cleaned.startsWith("880")) {
    // Remove leading 0 if present
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    cleaned = `880${cleaned}`;
  }

  return cleaned;
}

/**
 * Send SMS to single or multiple recipients
 */
export async function sendSMS(
  mobileNumbers: string | string[],
  message: string,
  senderId?: string,
  apiKey?: string
): Promise<SMSResponse> {
  const cfg = getSmsConfig();
  const resolvedApiKey = apiKey || cfg.apiKey;
  const resolvedSenderId = senderId || cfg.senderId;

  try {
    // Convert single number to array
    const numbers = Array.isArray(mobileNumbers)
      ? mobileNumbers
      : [mobileNumbers];

    // Format numbers (ensure they start with 880 for Bangladesh)
    const formattedNumbers = numbers.map(formatPhoneNumber);

    // POST to smsapi with JSON body
    const response = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: resolvedApiKey,
        senderid: resolvedSenderId,
        number: formattedNumbers.join(","),
        message,
      }),
    });

    // Get response text
    const responseText = await response.text();
    console.log("[SMS] Raw API response:", responseText);

    // Try to parse as JSON first
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // If not JSON, use the text as is
      responseData = responseText;
    }

    // BulkSMS BD returns: { response_code: 202, success: "success", message: "..." }
    // or on error:        { response_code: 1005, success: "error",   message: "..." }
    if (typeof responseData === "object" && responseData !== null) {
      const resCode =
        responseData.response_code ??
        responseData.code ??
        responseData.error_code;

      const isSuccess =
        resCode === 202 ||
        responseData.success === "success" ||
        responseData.status === "success";

      if (isSuccess) {
        return {
          success: true,
          code: 202,
          message: responseData.message || "SMS Submitted Successfully",
          sentTo: formattedNumbers,
        };
      }

      return {
        success: false,
        code: resCode,
        message:
          responseData.message || getErrorMessage(resCode),
      };
    }

    // Plain-text fallback
    if (typeof responseData === "string") {
      if (
        responseData.includes("202") ||
        responseData.toLowerCase().includes("success")
      ) {
        return {
          success: true,
          code: 202,
          message: "SMS Submitted Successfully",
          sentTo: formattedNumbers,
        };
      }
      const errorMatch = responseData.match(/1\d{3}/);
      if (errorMatch) {
        const errorCode = parseInt(errorMatch[0]);
        return {
          success: false,
          code: errorCode,
          message: getErrorMessage(errorCode),
        };
      }
    }

    // Default: assume success if we got a 200 HTTP response with no error indicator
    return {
      success: true,
      code: 202,
      message: "SMS Submitted Successfully",
      sentTo: formattedNumbers,
    };
  } catch (error) {
    console.error("SMS sending error:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error occurred while sending SMS",
    };
  }
}

/**
 * Send multiple SMS with different messages (Many SMS API)
 */
export async function sendBulkSMS(
  messages: Array<{ number: string; message: string }>,
  senderId?: string,
  apiKey?: string
): Promise<SMSResponse> {
  const cfg = getSmsConfig();
  const resolvedApiKey = apiKey || cfg.apiKey;
  const resolvedSenderId = senderId || cfg.senderId;

  try {
    // Format messages for the smsapimany endpoint: [{to, message}]
    const formattedMessages = messages.map((msg) => ({
      to: formatPhoneNumber(msg.number),
      message: msg.message,
    }));

    // POST to smsapimany with JSON body
    const response = await fetch(cfg.apiUrlMany, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: resolvedApiKey,
        senderid: resolvedSenderId,
        messages: formattedMessages,
      }),
    });
    const responseText = await response.text();

    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (typeof responseData === "object" && responseData !== null) {
      const resCode =
        responseData.response_code ??
        responseData.code ??
        responseData.error_code;

      const isSuccess =
        resCode === 202 ||
        responseData.success === "success" ||
        responseData.status === "success";

      if (!isSuccess && resCode) {
        return {
          success: false,
          code: resCode,
          message: responseData.message || getErrorMessage(resCode),
        };
      }
    }

    return {
      success: true,
      code: 202,
      message: "Bulk SMS Submitted Successfully",
      sentTo: formattedMessages.map((m) => m.to),
    };
  } catch (error) {
    console.error("Bulk SMS sending error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to send bulk SMS",
    };
  }
}

/**
 * Get error message from error code
 */
function getErrorMessage(code?: number): string {
  const errorMessages: Record<number, string> = {
    1001: "Invalid Number",
    1002: "Sender ID not correct or disabled",
    1003: "Please provide all required fields",
    1005: "Internal Error",
    1006: "Balance Validity Not Available",
    1007: "Balance Insufficient",
    1011: "User ID not found",
    1012: "Masking SMS must be sent in Bengali",
    1013: "Sender ID has not found Gateway by API key",
    1014: "Sender Type Name not found using this sender by API key",
    1015: "Sender ID has not found Any Valid Gateway by API key",
    1016: "Sender Type Name Active Price Info not found by this sender ID",
    1017: "Sender Type Name Price Info not found by this sender ID",
    1018: "The Owner of this Account is disabled",
    1019: "The (sender type name) Price of this Account is disabled",
    1020: "The parent of this account is not found",
    1021: "The parent active (sender type name) price of this account is not found",
    1031: "Your Account Not Verified, Please Contact Administrator",
    1032: "IP Not whitelisted — add your server IP in BulkSMS BD dashboard (API → IP Whitelist)",
  };

  return errorMessages[code || 1005] || "Unknown error occurred";
}
