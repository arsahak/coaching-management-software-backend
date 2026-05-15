/**
 * autoSMS.ts
 * Central utility for all automatic SMS triggers.
 * Each trigger function:
 *   1. Checks if the setting is enabled
 *   2. Fills the message template with real data
 *   3. Sends the SMS via smsService
 *   4. Creates a dashboard Notification record
 *   5. Never throws – failures are logged & a notification is created
 */

import Admission from "../modal/admission";
import Notification from "../modal/notification";
import SMSSetting, { DEFAULT_TEMPLATES, SMSSettingKey } from "../modal/smsSettings";
import { sendSMS } from "./smsService";

// ── Month names ───────────────────────────────────────────────────────────────
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Template engine ───────────────────────────────────────────────────────────
function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{${key}}`
  );
}

// ── Get setting (with default fallback + lazy seed) ───────────────────────────
async function getSetting(key: SMSSettingKey): Promise<{ enabled: boolean; message: string }> {
  let setting = await SMSSetting.findOne({ key });
  if (!setting) {
    // Seed the default on first access
    setting = await SMSSetting.create({
      key,
      enabled: false,
      message: DEFAULT_TEMPLATES[key],
    });
  }
  return { enabled: setting.enabled, message: setting.message };
}

// ── Collect all phone numbers for a student ───────────────────────────────────
function getNumbers(admission: {
  fatherMobile?: string;
  motherMobile?: string;
  studentMobile?: string;
  alarmMobile?: string[];
}): string[] {
  const candidates = [
    admission.fatherMobile,
    admission.motherMobile,
    admission.studentMobile,
    ...(admission.alarmMobile ?? []),
  ].filter((n): n is string => typeof n === "string" && n.trim() !== "");
  return [...new Set(candidates)];
}

// ── Formatted date ────────────────────────────────────────────────────────────
function fmtDate(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-GB"); // DD/MM/YYYY
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADMISSION
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerAdmissionSMS(admission: {
  _id: any;
  studentName: string;
  studentId?: string;
  class: string;
  batchName: string;
  admissionDate: Date;
  fatherMobile?: string;
  motherMobile?: string;
  studentMobile?: string;
  alarmMobile?: string[];
}): Promise<void> {
  try {
    const setting = await getSetting("admission");
    const numbers = getNumbers(admission);

    const msgText = fill(setting.message, {
      studentName: admission.studentName,
      studentId:   admission.studentId ?? "N/A",
      class:       admission.class,
      batch:       admission.batchName,
      date:        fmtDate(admission.admissionDate),
    });

    let smsSent = false;
    const smsNumbers: string[] = [];

    if (setting.enabled && numbers.length > 0) {
      const result = await sendSMS(numbers, msgText);
      smsSent = result.success;
      if (result.sentTo) smsNumbers.push(...result.sentTo);
    }

    await Notification.create({
      type:  "admission",
      title: `New Admission — ${admission.studentName}`,
      message: setting.enabled
        ? smsSent
          ? `Admission confirmed. SMS sent to ${smsNumbers.length} number(s).`
          : "Admission confirmed. Auto-SMS is enabled but delivery failed."
        : "Admission confirmed. Auto-SMS is disabled.",
      meta: {
        admissionId:  String(admission._id),
        studentName:  admission.studentName,
        studentId:    admission.studentId,
        smsSent,
        smsNumbers,
      },
    });
  } catch (err) {
    console.error("[autoSMS] triggerAdmissionSMS error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerAttendanceSMS(
  attendanceStatus: "present" | "absent",
  attendance: { _id: any; date: Date },
  admission: {
    _id: any;
    studentName: string;
    studentId?: string;
    class: string;
    batchName: string;
    fatherMobile?: string;
    motherMobile?: string;
    studentMobile?: string;
    alarmMobile?: string[];
  }
): Promise<void> {
  try {
    const key: SMSSettingKey =
      attendanceStatus === "absent" ? "attendanceAbsent" : "attendancePresent";
    const setting = await getSetting(key);
    const numbers = getNumbers(admission);

    const msgText = fill(setting.message, {
      studentName: admission.studentName,
      studentId:   admission.studentId ?? "N/A",
      class:       admission.class,
      batch:       admission.batchName,
      date:        fmtDate(attendance.date),
      status:      attendanceStatus.toUpperCase(),
    });

    let smsSent = false;
    const smsNumbers: string[] = [];

    if (setting.enabled && numbers.length > 0) {
      const result = await sendSMS(numbers, msgText);
      smsSent = result.success;
      if (result.sentTo) smsNumbers.push(...result.sentTo);
    }

    if (setting.enabled || attendanceStatus === "absent") {
      await Notification.create({
        type:  "attendance",
        title: `${attendanceStatus === "absent" ? "Absent" : "Present"} — ${admission.studentName}`,
        message: setting.enabled
          ? smsSent
            ? `Attendance (${attendanceStatus}) recorded. SMS sent to ${smsNumbers.length} number(s).`
            : "Attendance recorded. Auto-SMS enabled but delivery failed."
          : `Attendance (${attendanceStatus}) recorded. Auto-SMS is disabled.`,
        meta: {
          admissionId: String(admission._id),
          relatedId:   String(attendance._id),
          studentName: admission.studentName,
          studentId:   admission.studentId,
          smsSent,
          smsNumbers,
        },
      });
    }
  } catch (err) {
    console.error("[autoSMS] triggerAttendanceSMS error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EXAM RESULT
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerExamResultSMS(
  exam: {
    _id: any;
    subject?: string;
    marks?: number;
    totalMarks?: number;
    grade?: string;
    examDate?: Date;
  },
  admission: {
    _id: any;
    studentName: string;
    studentId?: string;
    class: string;
    batchName: string;
    fatherMobile?: string;
    motherMobile?: string;
    studentMobile?: string;
    alarmMobile?: string[];
  }
): Promise<void> {
  try {
    const setting = await getSetting("examResult");
    const numbers = getNumbers(admission);

    const msgText = fill(setting.message, {
      studentName: admission.studentName,
      studentId:   admission.studentId ?? "N/A",
      class:       admission.class,
      batch:       admission.batchName,
      subject:     exam.subject    ?? "N/A",
      marks:       exam.marks      ?? "N/A",
      totalMarks:  exam.totalMarks ?? "N/A",
      grade:       exam.grade      ?? "N/A",
      date:        fmtDate(exam.examDate ?? new Date()),
    });

    let smsSent = false;
    const smsNumbers: string[] = [];

    if (setting.enabled && numbers.length > 0) {
      const result = await sendSMS(numbers, msgText);
      smsSent = result.success;
      if (result.sentTo) smsNumbers.push(...result.sentTo);
    }

    await Notification.create({
      type:  "exam",
      title: `Exam Result — ${admission.studentName}`,
      message: setting.enabled
        ? smsSent
          ? `Exam result published. SMS sent to ${smsNumbers.length} number(s).`
          : "Exam result published. Auto-SMS enabled but delivery failed."
        : "Exam result published. Auto-SMS is disabled.",
      meta: {
        admissionId: String(admission._id),
        relatedId:   String(exam._id),
        studentName: admission.studentName,
        studentId:   admission.studentId,
        smsSent,
        smsNumbers,
      },
    });
  } catch (err) {
    console.error("[autoSMS] triggerExamResultSMS error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FEE PAID
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerFeePaymentSMS(
  fee: {
    _id: any;
    amountPaid: number;
    month: number;
    year: number;
    paymentMethod?: string;
    dueDate: Date;
  },
  admission: {
    _id: any;
    studentName: string;
    studentId?: string;
    class: string;
    batchName: string;
    fatherMobile?: string;
    motherMobile?: string;
    studentMobile?: string;
    alarmMobile?: string[];
  }
): Promise<void> {
  try {
    const setting = await getSetting("feePaid");
    const numbers = getNumbers(admission);

    const msgText = fill(setting.message, {
      studentName:   admission.studentName,
      studentId:     admission.studentId ?? "N/A",
      class:         admission.class,
      batch:         admission.batchName,
      amount:        fee.amountPaid.toLocaleString(),
      month:         MONTHS[fee.month - 1] ?? String(fee.month),
      year:          fee.year,
      paymentMethod: fee.paymentMethod ?? "cash",
      dueDate:       fmtDate(fee.dueDate),
    });

    let smsSent = false;
    const smsNumbers: string[] = [];

    if (setting.enabled && numbers.length > 0) {
      const result = await sendSMS(numbers, msgText);
      smsSent = result.success;
      if (result.sentTo) smsNumbers.push(...result.sentTo);
    }

    await Notification.create({
      type:  "fee_paid",
      title: `Fee Paid — ${admission.studentName} (৳${fee.amountPaid.toLocaleString()})`,
      message: setting.enabled
        ? smsSent
          ? `Payment recorded. SMS sent to ${smsNumbers.length} number(s).`
          : "Payment recorded. Auto-SMS enabled but delivery failed."
        : "Payment recorded. Auto-SMS is disabled.",
      meta: {
        admissionId: String(admission._id),
        relatedId:   String(fee._id),
        studentName: admission.studentName,
        studentId:   admission.studentId,
        smsSent,
        smsNumbers,
      },
    });
  } catch (err) {
    console.error("[autoSMS] triggerFeePaymentSMS error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FEE REMINDER
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerFeeReminderSMS(
  fee: {
    _id: any;
    monthlyFee: number;
    month: number;
    year: number;
    dueDate: Date;
  },
  admission: {
    _id: any;
    studentName: string;
    studentId?: string;
    class: string;
    batchName: string;
    fatherMobile?: string;
    motherMobile?: string;
    studentMobile?: string;
    alarmMobile?: string[];
  }
): Promise<void> {
  try {
    const setting = await getSetting("feeReminder");
    const numbers = getNumbers(admission);

    const msgText = fill(setting.message, {
      studentName: admission.studentName,
      studentId:   admission.studentId ?? "N/A",
      class:       admission.class,
      batch:       admission.batchName,
      amount:      fee.monthlyFee.toLocaleString(),
      month:       MONTHS[fee.month - 1] ?? String(fee.month),
      year:        fee.year,
      dueDate:     fmtDate(fee.dueDate),
    });

    let smsSent = false;
    const smsNumbers: string[] = [];

    if (setting.enabled && numbers.length > 0) {
      const result = await sendSMS(numbers, msgText);
      smsSent = result.success;
      if (result.sentTo) smsNumbers.push(...result.sentTo);
    }

    await Notification.create({
      type:  "fee_reminder",
      title: `Fee Reminder — ${admission.studentName}`,
      message: setting.enabled
        ? smsSent
          ? `Fee reminder sent to ${smsNumbers.length} number(s).`
          : "Fee reminder: Auto-SMS enabled but delivery failed."
        : "Fee reminder logged. Auto-SMS is disabled.",
      meta: {
        admissionId: String(admission._id),
        relatedId:   String(fee._id),
        studentName: admission.studentName,
        studentId:   admission.studentId,
        smsSent,
        smsNumbers,
      },
    });
  } catch (err) {
    console.error("[autoSMS] triggerFeeReminderSMS error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FEE OVERDUE
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerFeeOverdueSMS(
  fee: {
    _id: any;
    monthlyFee: number;
    amountDue: number;
    month: number;
    year: number;
    dueDate: Date;
  },
  admission: {
    _id: any;
    studentName: string;
    studentId?: string;
    class: string;
    batchName: string;
    fatherMobile?: string;
    motherMobile?: string;
    studentMobile?: string;
    alarmMobile?: string[];
  }
): Promise<void> {
  try {
    const setting = await getSetting("feeOverdue");
    const numbers = getNumbers(admission);

    const msgText = fill(setting.message, {
      studentName: admission.studentName,
      studentId:   admission.studentId ?? "N/A",
      class:       admission.class,
      batch:       admission.batchName,
      amount:      fee.amountDue.toLocaleString(),
      month:       MONTHS[fee.month - 1] ?? String(fee.month),
      year:        fee.year,
      dueDate:     fmtDate(fee.dueDate),
    });

    let smsSent = false;
    const smsNumbers: string[] = [];

    if (setting.enabled && numbers.length > 0) {
      const result = await sendSMS(numbers, msgText);
      smsSent = result.success;
      if (result.sentTo) smsNumbers.push(...result.sentTo);
    }

    await Notification.create({
      type:  "fee_overdue",
      title: `Fee Overdue — ${admission.studentName} (৳${fee.amountDue.toLocaleString()})`,
      message: setting.enabled
        ? smsSent
          ? `Overdue alert sent to ${smsNumbers.length} number(s).`
          : "Overdue fee detected. Auto-SMS enabled but delivery failed."
        : "Overdue fee detected. Auto-SMS is disabled.",
      meta: {
        admissionId: String(admission._id),
        relatedId:   String(fee._id),
        studentName: admission.studentName,
        studentId:   admission.studentId,
        smsSent,
        smsNumbers,
      },
    });
  } catch (err) {
    console.error("[autoSMS] triggerFeeOverdueSMS error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. EXAM SCHEDULED  (batch-wide — notifies all students in the class/batch)
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerExamScheduledSMS(exam: {
  _id: any;
  examName: string;
  subject: string;
  class: string;
  batchName?: string;
  examDate: Date;
  examTime?: string;
}): Promise<void> {
  try {
    const setting = await getSetting("examScheduled");

    // Find all active students in this class (+ optionally batch)
    const filter: Record<string, any> = { status: "active", class: exam.class };
    if (exam.batchName) filter.batchName = exam.batchName;

    const admissions = await Admission.find(filter).lean();
    if (admissions.length === 0) return;

    let totalSent = 0;
    let totalFailed = 0;

    if (setting.enabled) {
      for (const admission of admissions) {
        const numbers = getNumbers(admission);
        if (numbers.length === 0) continue;

        const msgText = fill(setting.message, {
          studentName: admission.studentName,
          studentId:   admission.studentId ?? "N/A",
          class:       exam.class,
          batch:       exam.batchName ?? "N/A",
          examName:    exam.examName,
          subject:     exam.subject,
          examDate:    fmtDate(exam.examDate),
          examTime:    exam.examTime ?? "N/A",
          date:        fmtDate(exam.examDate),
        });

        const result = await sendSMS(numbers, msgText);
        if (result.success) totalSent++;
        else totalFailed++;
      }
    }

    // Single summary notification for the dashboard
    await Notification.create({
      type:  "exam",
      title: `Exam Scheduled — ${exam.examName} (${exam.subject})`,
      message: setting.enabled
        ? `Exam notification sent to ${totalSent} student(s)${totalFailed > 0 ? `, failed for ${totalFailed}` : ""}.`
        : `Exam scheduled for ${admissions.length} student(s). Auto-SMS is disabled.`,
      meta: {
        relatedId:   String(exam._id),
        smsSent:     totalSent > 0,
        smsNumbers:  [],
      },
    });
  } catch (err) {
    console.error("[autoSMS] triggerExamScheduledSMS error:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. EXAM CUSTOM ALERT  (teacher sends a manual alert to batch from exam list)
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerExamAlertSMS(
  exam: {
    _id: any;
    examName: string;
    subject: string;
    class: string;
    batchName?: string;
    examDate: Date;
    examTime?: string;
  },
  customMessage: string   // raw message — may contain {vars} or be plain text
): Promise<{ sent: number; failed: number }> {
  const setting = await getSetting("examAlert");

  const filter: Record<string, any> = { status: "active", class: exam.class };
  if (exam.batchName) filter.batchName = exam.batchName;
  const admissions = await Admission.find(filter).lean();

  let sent = 0;
  let failed = 0;

  for (const admission of admissions) {
    const numbers = getNumbers(admission);
    if (numbers.length === 0) continue;

    // Use the setting's wrapper template if it has {alertMessage}, else send raw
    let finalMsg = customMessage;
    if (setting.message.includes("{alertMessage}")) {
      finalMsg = fill(setting.message, {
        studentName:  admission.studentName,
        studentId:    admission.studentId ?? "N/A",
        class:        exam.class,
        batch:        exam.batchName ?? "N/A",
        examName:     exam.examName,
        subject:      exam.subject,
        examDate:     fmtDate(exam.examDate),
        examTime:     exam.examTime ?? "N/A",
        alertMessage: customMessage,
      });
    }

    const result = await sendSMS(numbers, finalMsg);
    if (result.success) sent++;
    else failed++;
  }

  await Notification.create({
    type:  "exam",
    title: `Exam Alert Sent — ${exam.examName}`,
    message: `Custom alert sent to ${sent} student(s)${failed > 0 ? `, failed for ${failed}` : ""}.`,
    meta: { relatedId: String(exam._id), smsSent: sent > 0, smsNumbers: [] },
  });

  return { sent, failed };
}
