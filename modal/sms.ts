import mongoose, { Document, Schema } from "mongoose";

type SMSStatus = "pending" | "sent" | "failed" | "delivered";
type SMSType = "single" | "bulk" | "exam" | "fee" | "attendance" | "custom";

export interface ISMS extends Document {
  // SMS Information
  type: SMSType;
  message: string;

  // Recipients
  recipients: Array<{
    mobileNumber: string;
    name?: string;
    studentId?: string;
    admissionId?: mongoose.Types.ObjectId | string;
    status: SMSStatus;
    sentAt?: Date;
    deliveredAt?: Date;
    error?: string;
  }>;

  // SMS API Details
  senderId: string;
  apiKey?: string; // Store encrypted or just use from env

  // References
  examId?: mongoose.Types.ObjectId | string;
  feeId?: mongoose.Types.ObjectId | string;
  admissionId?: mongoose.Types.ObjectId | string;

  // Status Tracking
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  status: SMSStatus;

  // Metadata
  metadata?: Record<string, unknown>;

  // Relations
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy?: mongoose.Types.ObjectId | string;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const smsSchema = new Schema<ISMS>(
  {
    type: {
      type: String,
      enum: ["single", "bulk", "exam", "fee", "attendance", "custom"],
      required: [true, "SMS type is required"],
      index: true,
    },
    message: {
      type: String,
      required: [true, "SMS message is required"],
    },
    recipients: [
      {
        mobileNumber: {
          type: String,
          required: true,
        },
        name: {
          type: String,
        },
        studentId: {
          type: String,
        },
        admissionId: {
          type: Schema.Types.ObjectId,
          ref: "Admission",
        },
        status: {
          type: String,
          enum: ["pending", "sent", "failed", "delivered"],
          default: "pending",
        },
        sentAt: {
          type: Date,
        },
        deliveredAt: {
          type: Date,
        },
        error: {
          type: String,
        },
      },
    ],
    senderId: {
      type: String,
      required: [true, "Sender ID is required"],
      default: "Random",
    },
    apiKey: {
      type: String,
      // Don't store in production, use from env
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      index: true,
    },
    feeId: {
      type: Schema.Types.ObjectId,
      ref: "Fee",
      index: true,
    },
    admissionId: {
      type: Schema.Types.ObjectId,
      ref: "Admission",
      index: true,
    },
    totalRecipients: {
      type: Number,
      required: true,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "delivered"],
      default: "pending",
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

// Indexes for efficient queries
smsSchema.index({ type: 1, status: 1 });
smsSchema.index({ createdAt: -1 });
smsSchema.index({ examId: 1 });
smsSchema.index({ feeId: 1 });
smsSchema.index({ admissionId: 1 });
smsSchema.index({ "recipients.mobileNumber": 1 });

const SMS = mongoose.model<ISMS>("SMS", smsSchema);

export default SMS;
