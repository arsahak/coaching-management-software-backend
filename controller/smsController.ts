import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Admission from "../modal/admission";
import SMS from "../modal/sms";
import { sendBulkSMS, sendSMS } from "../utils/smsService";

// Send single SMS
export const sendSingleSMS = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { mobileNumber, message, senderId, apiKey } = req.body;

    if (!mobileNumber || !message) {
      res.status(400).json({
        success: false,
        message: "Mobile number and message are required",
      });
      return;
    }

    // Send SMS
    const smsResult = await sendSMS(mobileNumber, message, senderId, apiKey);

    // Save SMS record
    const smsRecord = await SMS.create({
      type: "single",
      message,
      recipients: [
        {
          mobileNumber,
          status: smsResult.success ? "sent" : "failed",
          sentAt: smsResult.success ? new Date() : undefined,
          error: smsResult.success ? undefined : smsResult.message,
        },
      ],
      senderId: senderId || "Random",
      totalRecipients: 1,
      sentCount: smsResult.success ? 1 : 0,
      failedCount: smsResult.success ? 0 : 1,
      deliveredCount: 0,
      status: smsResult.success ? "sent" : "failed",
      createdBy: req.user?.userId,
    });

    res.status(200).json({
      success: smsResult.success,
      message:
        smsResult.message ||
        (smsResult.success ? "SMS sent successfully" : "Failed to send SMS"),
      code: smsResult.code,
      data: smsRecord,
    });
  } catch (error) {
    console.error("Send single SMS error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending SMS",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Send bulk SMS (same message to multiple recipients)
export const sendBulkSMSSameMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { mobileNumbers, message, senderId, apiKey } = req.body;

    if (
      !mobileNumbers ||
      !Array.isArray(mobileNumbers) ||
      mobileNumbers.length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide an array of mobile numbers",
      });
      return;
    }

    if (!message) {
      res.status(400).json({
        success: false,
        message: "Message is required",
      });
      return;
    }

    // Send SMS to all numbers
    const smsResult = await sendSMS(mobileNumbers, message, senderId, apiKey);

    // Prepare recipients array
    const recipients = mobileNumbers.map((num: string) => ({
      mobileNumber: num,
      status: smsResult.success ? "sent" : ("failed" as const),
      sentAt: smsResult.success ? new Date() : undefined,
      error: smsResult.success ? undefined : smsResult.message,
    }));

    // Save SMS record
    const smsRecord = await SMS.create({
      type: "bulk",
      message,
      recipients,
      senderId: senderId || "Random",
      totalRecipients: mobileNumbers.length,
      sentCount: smsResult.success ? mobileNumbers.length : 0,
      failedCount: smsResult.success ? 0 : mobileNumbers.length,
      deliveredCount: 0,
      status: smsResult.success ? "sent" : "failed",
      createdBy: req.user?.userId,
    });

    res.status(200).json({
      success: smsResult.success,
      message:
        smsResult.message ||
        (smsResult.success
          ? `SMS sent to ${mobileNumbers.length} recipient(s)`
          : "Failed to send SMS"),
      code: smsResult.code,
      data: smsRecord,
    });
  } catch (error) {
    console.error("Send bulk SMS error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending bulk SMS",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Send bulk SMS with different messages
export const sendBulkSMSDifferentMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { messages, senderId, apiKey } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        success: false,
        message: "Please provide an array of messages with numbers",
      });
      return;
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.number || !msg.message) {
        res.status(400).json({
          success: false,
          message: "Each message must have a number and message field",
        });
        return;
      }
    }

    // Send bulk SMS
    const smsResult = await sendBulkSMS(messages, senderId, apiKey);

    // Prepare recipients array
    const recipients = messages.map(
      (msg: { number: string; message: string }) => ({
        mobileNumber: msg.number,
        status: smsResult.success ? "sent" : ("failed" as const),
        sentAt: smsResult.success ? new Date() : undefined,
        error: smsResult.success ? undefined : smsResult.message,
      })
    );

    // Save SMS record
    const smsRecord = await SMS.create({
      type: "bulk",
      message: "Multiple messages", // For bulk with different messages
      recipients,
      senderId: senderId || "Random",
      totalRecipients: messages.length,
      sentCount: smsResult.success ? messages.length : 0,
      failedCount: smsResult.success ? 0 : messages.length,
      deliveredCount: 0,
      status: smsResult.success ? "sent" : "failed",
      metadata: {
        messages: messages.map((msg: { number: string; message: string }) => ({
          number: msg.number,
          message: msg.message,
        })),
      },
      createdBy: req.user?.userId,
    });

    res.status(200).json({
      success: smsResult.success,
      message:
        smsResult.message ||
        (smsResult.success
          ? `SMS sent to ${messages.length} recipient(s)`
          : "Failed to send SMS"),
      code: smsResult.code,
      data: smsRecord,
    });
  } catch (error) {
    console.error("Send bulk SMS with different messages error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending bulk SMS",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get SMS history
export const getSMSHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "50",
      type,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    // Apply filters
    if (type) query.type = type;
    if (status) query.status = status;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Text search
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: "i" } },
        { "recipients.mobileNumber": { $regex: search, $options: "i" } },
        { "recipients.name": { $regex: search, $options: "i" } },
      ];
    }

    const [smsRecords, total] = await Promise.all([
      SMS.find(query)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .populate("examId", "examName")
        .populate("feeId", "feeName")
        .populate("admissionId", "studentName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      SMS.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: smsRecords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: skip + limitNum < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Get SMS history error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching SMS history",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get single SMS by ID
export const getSMSById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const smsRecord = await SMS.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("examId", "examName")
      .populate("feeId", "feeName")
      .populate("admissionId", "studentName");

    if (!smsRecord) {
      res.status(404).json({
        success: false,
        message: "SMS record not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: smsRecord,
    });
  } catch (error) {
    console.error("Get SMS by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching SMS record",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Send SMS to students by filter
export const sendSMSToStudents = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { message, filters, senderId, apiKey } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        message: "Message is required",
      });
      return;
    }

    // Build query for admissions
    const query: any = { status: "active" };

    if (filters?.class) query.class = filters.class;
    if (filters?.batchName) query.batchName = filters.batchName;
    if (filters?.studentId) query.studentId = filters.studentId;

    // Get admissions with mobile numbers
    const admissions = await Admission.find(query);

    if (admissions.length === 0) {
      res.status(404).json({
        success: false,
        message: "No students found matching the criteria",
      });
      return;
    }

    // Collect mobile numbers
    const mobileNumbers: string[] = [];
    const recipients: Array<{
      mobileNumber: string;
      name?: string;
      studentId?: string;
      admissionId: string;
    }> = [];

    admissions.forEach((admission) => {
      // Try father's mobile first, then mother's
      const mobileNumber = admission.fatherMobile || admission.motherMobile;
      if (mobileNumber && mobileNumber.trim()) {
        mobileNumbers.push(mobileNumber);
        recipients.push({
          mobileNumber,
          name: admission.studentName,
          studentId: admission.studentId,
          admissionId: admission._id.toString(),
        });
      }
    });

    if (mobileNumbers.length === 0) {
      res.status(400).json({
        success: false,
        message: "No mobile numbers found for the selected students",
      });
      return;
    }

    // Send SMS
    const smsResult = await sendSMS(mobileNumbers, message, senderId, apiKey);

    // Prepare recipients with status
    const recipientsWithStatus = recipients.map((rec) => ({
      ...rec,
      status: smsResult.success ? ("sent" as const) : ("failed" as const),
      sentAt: smsResult.success ? new Date() : undefined,
      error: smsResult.success ? undefined : smsResult.message,
    }));

    // Save SMS record
    const smsRecord = await SMS.create({
      type: "custom",
      message,
      recipients: recipientsWithStatus,
      senderId: senderId || "Random",
      totalRecipients: mobileNumbers.length,
      sentCount: smsResult.success ? mobileNumbers.length : 0,
      failedCount: smsResult.success ? 0 : mobileNumbers.length,
      deliveredCount: 0,
      status: smsResult.success ? "sent" : "failed",
      metadata: {
        filters,
      },
      createdBy: req.user?.userId,
    });

    res.status(200).json({
      success: smsResult.success,
      message:
        smsResult.message ||
        (smsResult.success
          ? `SMS sent to ${mobileNumbers.length} student(s)`
          : "Failed to send SMS"),
      code: smsResult.code,
      data: smsRecord,
    });
  } catch (error) {
    console.error("Send SMS to students error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending SMS to students",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get SMS statistics
export const getSMSStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const query: any = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const [
      totalSMS,
      sentSMS,
      failedSMS,
      deliveredSMS,
      totalRecipients,
      totalSent,
      totalFailed,
    ] = await Promise.all([
      SMS.countDocuments(query),
      SMS.countDocuments({ ...query, status: "sent" }),
      SMS.countDocuments({ ...query, status: "failed" }),
      SMS.countDocuments({ ...query, status: "delivered" }),
      SMS.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$totalRecipients" } } },
      ]),
      SMS.aggregate([
        { $match: { ...query, status: "sent" } },
        { $group: { _id: null, total: { $sum: "$sentCount" } } },
      ]),
      SMS.aggregate([
        { $match: { ...query, status: "failed" } },
        { $group: { _id: null, total: { $sum: "$failedCount" } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSMS,
        sentSMS,
        failedSMS,
        deliveredSMS,
        totalRecipients: totalRecipients[0]?.total || 0,
        totalSent: totalSent[0]?.total || 0,
        totalFailed: totalFailed[0]?.total || 0,
      },
    });
  } catch (error) {
    console.error("Get SMS stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching SMS statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
