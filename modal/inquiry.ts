import mongoose, { Document, Schema } from "mongoose";

export type InquiryStatus = "pending" | "contacted" | "enrolled" | "rejected";

export interface IInquiry extends Document {
  studentName: string;
  parentName: string;
  phone: string;
  email?: string;
  desiredClass: string;
  message?: string;
  status: InquiryStatus;
  source: "website";
  adminNotes?: string;
  handledBy?: mongoose.Types.ObjectId;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const inquirySchema = new Schema<IInquiry>(
  {
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    parentName: {
      type: String,
      required: [true, "Parent name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    desiredClass: {
      type: String,
      required: [true, "Desired class is required"],
      trim: true,
    },
    message: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "enrolled", "rejected"],
      default: "pending",
    },
    source: {
      type: String,
      enum: ["website"],
      default: "website",
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    handledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({
  studentName: "text",
  parentName: "text",
  phone: "text",
  desiredClass: "text",
});

const Inquiry = mongoose.model<IInquiry>("Inquiry", inquirySchema);

export default Inquiry;
