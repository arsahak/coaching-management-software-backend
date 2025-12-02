import mongoose, { Document, Schema } from "mongoose";

type AttendanceStatus = "present" | "absent";

export interface IAttendance extends Document {
  // Reference to Admission (student)
  admissionId: mongoose.Types.ObjectId | string;
  studentId?: string; // For quick reference
  studentName: string; // For quick reference

  // Attendance Date
  date: Date;

  // Attendance Status
  status: AttendanceStatus;

  // SMS Notification
  smsSent: boolean;
  smsSentAt?: Date;
  smsRecipients?: string[]; // Mobile numbers that received SMS

  // Notes
  notes?: string;

  // Relations
  markedBy: mongoose.Types.ObjectId | string; // User who marked attendance
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    admissionId: {
      type: Schema.Types.ObjectId,
      ref: "Admission",
      required: [true, "Admission ID is required"],
      index: true,
    },
    studentId: {
      type: String,
      trim: true,
      index: true,
    },
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: [true, "Status is required"],
      default: "present",
    },
    smsSent: {
      type: Boolean,
      default: false,
    },
    smsSentAt: {
      type: Date,
    },
    smsRecipients: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one attendance record per student per date
attendanceSchema.index({ admissionId: 1, date: 1 }, { unique: true });

// Index for date range queries
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ status: 1, date: -1 });
attendanceSchema.index({ studentId: 1, date: -1 });

const Attendance = mongoose.model<IAttendance>("Attendance", attendanceSchema);

export default Attendance;

