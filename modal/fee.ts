import mongoose, { Document, Schema } from "mongoose";

type FeeStatus = "pending" | "paid" | "overdue" | "partial";
type PaymentMethod = "cash" | "bank" | "mobile_banking" | "other";

export interface IFee extends Document {
  // Reference to Admission (student)
  admissionId: mongoose.Types.ObjectId | string;
  studentId?: string; // For quick reference
  studentName: string; // For quick reference

  // Fee Information
  monthlyFee: number; // Monthly fee amount
  amountPaid: number; // Amount paid
  amountDue: number; // Amount due (monthlyFee - amountPaid)
  status: FeeStatus;

  // Payment Information
  paymentDate?: Date; // Date when fee was paid
  dueDate: Date; // Due date for payment
  paymentMethod?: PaymentMethod;
  transactionId?: string; // Transaction reference

  // SMS Notifications
  paymentSmsSent: boolean; // Whether payment confirmation SMS was sent
  paymentSmsSentAt?: Date;
  reminderSmsSent: boolean; // Whether payment reminder SMS was sent
  reminderSmsSentAt?: Date;
  overdueSmsSent: boolean; // Whether overdue SMS was sent
  overdueSmsSentAt?: Date;

  // Month/Year for this fee
  month: number; // 1-12
  year: number; // e.g., 2025

  // Notes
  notes?: string;

  // Relations
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy?: mongoose.Types.ObjectId | string;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const feeSchema = new Schema<IFee>(
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
    monthlyFee: {
      type: Number,
      required: [true, "Monthly fee is required"],
      min: [0, "Monthly fee cannot be negative"],
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, "Amount paid cannot be negative"],
    },
    amountDue: {
      type: Number,
      default: function (this: IFee) {
        return this.monthlyFee - (this.amountPaid || 0);
      },
      min: [0, "Amount due cannot be negative"],
    },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue", "partial"],
      default: "pending",
      index: true,
    },
    paymentDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "mobile_banking", "other"],
    },
    transactionId: {
      type: String,
      trim: true,
    },
    paymentSmsSent: {
      type: Boolean,
      default: false,
    },
    paymentSmsSentAt: {
      type: Date,
    },
    reminderSmsSent: {
      type: Boolean,
      default: false,
    },
    reminderSmsSentAt: {
      type: Date,
    },
    overdueSmsSent: {
      type: Boolean,
      default: false,
    },
    overdueSmsSentAt: {
      type: Date,
    },
    month: {
      type: Number,
      required: [true, "Month is required"],
      min: [1, "Month must be between 1 and 12"],
      max: [12, "Month must be between 1 and 12"],
      index: true,
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: [2000, "Year must be valid"],
      index: true,
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

// Calculate amountDue before saving
feeSchema.pre("save", function (next) {
  this.amountDue = this.monthlyFee - (this.amountPaid || 0);
  
  // Update status based on payment
  if (this.amountPaid >= this.monthlyFee) {
    this.status = "paid";
  } else if (this.amountPaid > 0) {
    this.status = "partial";
  } else {
    // Check if overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(this.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      this.status = "overdue";
    } else {
      this.status = "pending";
    }
  }
  
  next();
});

// Compound index to ensure one fee record per student per month/year
feeSchema.index({ admissionId: 1, month: 1, year: 1 }, { unique: true });

// Indexes for queries
feeSchema.index({ dueDate: -1 });
feeSchema.index({ status: 1, dueDate: -1 });
feeSchema.index({ studentId: 1, year: 1, month: -1 });
feeSchema.index({ year: 1, month: 1 });

const Fee = mongoose.model<IFee>("Fee", feeSchema);

export default Fee;

