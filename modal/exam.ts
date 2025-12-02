import mongoose, { Document, Schema } from "mongoose";

type ExamStatus = "scheduled" | "completed" | "cancelled";
type ExamType = "quiz" | "midterm" | "final" | "assignment" | "other";

export interface IExam extends Document {
  // Exam Information
  examName: string;
  examType: ExamType;
  subject: string;
  class: string; // Which class this exam is for
  batchName?: string; // Optional: specific batch
  description?: string;

  // Exam Schedule
  examDate: Date;
  examTime: string; // e.g., "9:00 AM - 11:00 AM"
  duration?: number; // Duration in minutes

  // Status
  status: ExamStatus;

  // SMS Notifications
  scheduleSmsSent: boolean; // Whether schedule SMS was sent
  scheduleSmsSentAt?: Date;
  resultSmsSent: boolean; // Whether result SMS was sent
  resultSmsSentAt?: Date;

  // Relations
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy?: mongoose.Types.ObjectId | string;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// Exam Result Schema
export interface IExamResult extends Document {
  // Reference to Exam
  examId: mongoose.Types.ObjectId | string;
  examName?: string; // For quick reference

  // Reference to Admission (student)
  admissionId: mongoose.Types.ObjectId | string;
  studentId?: string; // For quick reference
  studentName: string; // For quick reference

  // Result Information
  marks: number;
  totalMarks: number;
  grade?: string; // e.g., "A+", "A", "B+", etc.
  percentage: number;

  // Attendance
  present: boolean; // Whether student was present for exam
  absentSmsSent: boolean; // Whether absent SMS was sent
  absentSmsSentAt?: Date;

  // Result SMS
  resultSmsSent: boolean; // Whether result SMS was sent
  resultSmsSentAt?: Date;

  // Notes
  notes?: string;

  // Relations
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy?: mongoose.Types.ObjectId | string;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const examSchema = new Schema<IExam>(
  {
    examName: {
      type: String,
      required: [true, "Exam name is required"],
      trim: true,
    },
    examType: {
      type: String,
      enum: ["quiz", "midterm", "final", "assignment", "other"],
      required: [true, "Exam type is required"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    class: {
      type: String,
      required: [true, "Class is required"],
      trim: true,
    },
    batchName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    examDate: {
      type: Date,
      required: [true, "Exam date is required"],
      index: true,
    },
    examTime: {
      type: String,
      required: [true, "Exam time is required"],
      trim: true,
    },
    duration: {
      type: Number,
      min: [1, "Duration must be at least 1 minute"],
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    scheduleSmsSent: {
      type: Boolean,
      default: false,
    },
    scheduleSmsSentAt: {
      type: Date,
    },
    resultSmsSent: {
      type: Boolean,
      default: false,
    },
    resultSmsSentAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const examResultSchema = new Schema<IExamResult>(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: [true, "Exam ID is required"],
      index: true,
    },
    examName: {
      type: String,
      trim: true,
    },
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
    marks: {
      type: Number,
      required: [true, "Marks are required"],
      min: [0, "Marks cannot be negative"],
    },
    totalMarks: {
      type: Number,
      required: [true, "Total marks are required"],
      min: [1, "Total marks must be at least 1"],
    },
    grade: {
      type: String,
      trim: true,
    },
    percentage: {
      type: Number,
      required: [true, "Percentage is required"],
      min: [0, "Percentage cannot be negative"],
      max: [100, "Percentage cannot exceed 100"],
    },
    present: {
      type: Boolean,
      default: true,
    },
    absentSmsSent: {
      type: Boolean,
      default: false,
    },
    absentSmsSentAt: {
      type: Date,
    },
    resultSmsSent: {
      type: Boolean,
      default: false,
    },
    resultSmsSentAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one result per student per exam
examResultSchema.index({ examId: 1, admissionId: 1 }, { unique: true });

// Indexes for queries
examSchema.index({ examDate: -1 });
examSchema.index({ class: 1, examDate: -1 });
examSchema.index({ status: 1 });

examResultSchema.index({ examId: 1, marks: -1 });
examResultSchema.index({ admissionId: 1 });
examResultSchema.index({ studentId: 1 });

const Exam = mongoose.model<IExam>("Exam", examSchema);
const ExamResult = mongoose.model<IExamResult>("ExamResult", examResultSchema);

export default Exam;
export { ExamResult };

