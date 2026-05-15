import mongoose, { Document, Schema } from "mongoose";

export type NotificationType =
  | "admission"
  | "inquiry"
  | "attendance"
  | "exam"
  | "fee_paid"
  | "fee_reminder"
  | "fee_overdue"
  | "sms_failed"
  | "system";

export interface INotification extends Document {
  type: NotificationType;
  title: string;
  message: string;
  /** Related document IDs for deep-linking */
  meta?: {
    admissionId?: string;
    studentName?: string;
    studentId?: string;
    relatedId?: string;  // fee / exam / attendance _id
    smsSent?: boolean;
    smsNumbers?: string[];
  };
  isRead: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "admission",
        "inquiry",
        "attendance",
        "exam",
        "fee_paid",
        "fee_reminder",
        "fee_overdue",
        "sms_failed",
        "system",
      ],
    },
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    meta:    { type: Schema.Types.Mixed, default: {} },
    isRead:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index so dashboard queries are fast
notificationSchema.index({ isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

const Notification = mongoose.model<INotification>("Notification", notificationSchema);
export default Notification;
