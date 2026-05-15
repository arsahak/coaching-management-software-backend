import mongoose, { Document, Schema } from "mongoose";

export type SMSSettingKey =
  | "admission"
  | "attendancePresent"
  | "attendanceAbsent"
  | "examScheduled"
  | "examResult"
  | "examAlert"
  | "feePaid"
  | "feeReminder"
  | "feeOverdue";

export interface ISMSSetting extends Document {
  key: SMSSettingKey;
  enabled: boolean;
  message: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const smsSettingSchema = new Schema<ISMSSetting>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "admission",
        "attendancePresent",
        "attendanceAbsent",
        "examScheduled",
        "examResult",
        "examAlert",
        "feePaid",
        "feeReminder",
        "feeOverdue",
      ],
    },
    enabled: { type: Boolean, default: false },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const SMSSetting = mongoose.model<ISMSSetting>("SMSSetting", smsSettingSchema);
export default SMSSetting;

// ── Default templates seeded on first use ────────────────────────────────────
export const DEFAULT_TEMPLATES: Record<SMSSettingKey, string> = {
  admission:
    "Dear Parent, {studentName} (ID: {studentId}) has been successfully admitted to {class} — {batch}. Welcome! Date: {date}.",
  attendancePresent:
    "Dear Parent, {studentName} was PRESENT in today's class ({date}). Class: {class} | Batch: {batch}.",
  attendanceAbsent:
    "Dear Parent, {studentName} was ABSENT from today's class ({date}). Class: {class} | Batch: {batch}. Please ensure regular attendance.",
  examScheduled:
    "Dear Parent, {studentName}'s exam has been scheduled. Exam: {examName} | Subject: {subject} | Date: {examDate} | Time: {examTime}. Class: {class} | Batch: {batch}.",
  examResult:
    "Dear Parent, {studentName}'s exam result — Subject: {subject}, Marks: {marks}/{totalMarks}, Grade: {grade}. Class: {class} | Date: {date}.",
  examAlert:
    "Dear Parent, important notice for {studentName} ({class} | {batch}): {alertMessage}",
  feePaid:
    "Dear Parent, payment of ৳{amount} received for {studentName} ({class}). Month: {month} {year}. Payment method: {paymentMethod}. Thank you!",
  feeReminder:
    "Dear Parent, fee of ৳{amount} is due for {studentName} ({class}) for {month} {year}. Due date: {dueDate}. Please pay on time.",
  feeOverdue:
    "Dear Parent, fee of ৳{amount} for {studentName} ({class}) for {month} {year} is OVERDUE since {dueDate}. Please pay immediately.",
};
