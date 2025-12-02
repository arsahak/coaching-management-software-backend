import mongoose, { Document, Schema } from "mongoose";

type QRCodeType = "student" | "exam" | "admission" | "custom" | "url" | "text";

export interface IQRCode extends Document {
  // QR Code Information
  name: string;
  type: QRCodeType;
  content: string; // The actual content encoded in the QR code
  description?: string;

  // Optional References
  studentId?: string;
  admissionId?: mongoose.Types.ObjectId | string;
  examId?: mongoose.Types.ObjectId | string;

  // Expiration
  expiresAt?: Date;
  isActive: boolean;

  // Metadata for additional information
  metadata?: Record<string, unknown>;

  // Relations
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy?: mongoose.Types.ObjectId | string;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const qrCodeSchema = new Schema<IQRCode>(
  {
    name: {
      type: String,
      required: [true, "QR code name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["student", "exam", "admission", "custom", "url", "text"],
      required: [true, "QR code type is required"],
      index: true,
    },
    content: {
      type: String,
      required: [true, "QR code content is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    studentId: {
      type: String,
      trim: true,
      index: true,
    },
    admissionId: {
      type: Schema.Types.ObjectId,
      ref: "Admission",
      index: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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
qrCodeSchema.index({ type: 1, isActive: 1 });
qrCodeSchema.index({ createdAt: -1 });
qrCodeSchema.index({ expiresAt: 1 });
qrCodeSchema.index({ admissionId: 1, isActive: 1 });
qrCodeSchema.index({ examId: 1, isActive: 1 });
qrCodeSchema.index({ studentId: 1, isActive: 1 });

// Text search index for name and content
qrCodeSchema.index({ name: "text", content: "text", description: "text" });

const QRCode = mongoose.model<IQRCode>("QRCode", qrCodeSchema);

export default QRCode;
