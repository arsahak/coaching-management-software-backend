import mongoose, { Document, Model, Schema } from "mongoose";

type AdmissionStatus = "active" | "inactive" | "completed";

export interface IAdmission extends Document {
  // Student Information
  studentName: string;
  fatherName: string;
  motherName: string;
  schoolName: string;
  fatherMobile: string;
  motherMobile?: string;
  studentMobile?: string;
  class: string; // Grade/Class
  subjects: string[]; // Array of subjects
  batchName: string;
  batchTime: string; // Study time
  admissionDate: Date;
  monthlyFee: number;

  // Signatures (stored as base64 or file paths)
  studentSignature?: string;
  directorSignature?: string;

  // Additional fields
  studentId?: string; // Auto-generated student ID
  status: AdmissionStatus;
  notes?: string;

  // Notification & history
  alarmMobile?: string[]; // send sms to these mobile numbers
  smsHistory?: string[];
  emailHistory?: string[];

  // Relations (Mongoose will cast string → ObjectId)
  createdBy: mongoose.Types.ObjectId | string; // User who created the admission
  updatedBy?: mongoose.Types.ObjectId | string;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const admissionSchema = new Schema<IAdmission>(
  {
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "Father's name is required"],
      trim: true,
    },
    motherName: {
      type: String,
      required: [true, "Mother's name is required"],
      trim: true,
    },
    schoolName: {
      type: String,
      required: [true, "School name is required"],
      trim: true,
    },
    fatherMobile: {
      type: String,
      required: [true, "Father's mobile number is required"],
      trim: true,
    },
    motherMobile: {
      type: String,
      trim: true,
    },
    studentMobile: {
      type: String,
      trim: true,
    },
    class: {
      type: String,
      required: [true, "Class is required"],
      trim: true,
    },
    subjects: {
      type: [String],
      required: [true, "At least one subject is required"],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "At least one subject is required",
      },
    },
    batchName: {
      type: String,
      required: [true, "Batch name is required"],
      trim: true,
    },
    batchTime: {
      type: String,
      required: [true, "Batch time is required"],
      trim: true,
    },
    admissionDate: {
      type: Date,
      required: [true, "Admission date is required"],
      default: Date.now,
    },
    monthlyFee: {
      type: Number,
      required: [true, "Monthly fee is required"],
      min: [0, "Monthly fee cannot be negative"],
    },
    studentSignature: {
      type: String,
    },
    directorSignature: {
      type: String,
    },
    studentId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "completed"],
      default: "active",
    },
    notes: {
      type: String,
      trim: true,
    },
    alarmMobile: {
      type: [String],
      default: [],
    },
    smsHistory: {
      type: [String],
      default: [],
    },
    emailHistory: {
      type: [String],
      default: [],
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

// Generate student ID before saving
admissionSchema.pre<IAdmission>("save", async function (next) {
  try {
    // Only generate if it's missing
    if (!this.studentId) {
      // Generate student ID: ADM-YYYY-MMDD-XXXX (e.g., ADM-2025-0101-0001)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      // Get count of admissions created today (between start and end of day)
      const startOfDay = new Date(
        year,
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfDay = new Date(
        year,
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0
      );

      const AdmissionModel = this.constructor as Model<IAdmission>;
      const count = await AdmissionModel.countDocuments({
        createdAt: { $gte: startOfDay, $lt: endOfDay },
      });

      const sequence = String(count + 1).padStart(4, "0");
      this.studentId = `ADM-${year}-${month}${day}-${sequence}`;
    }
    next();
  } catch (err) {
    next(err as Error);
  }
});

// Index for search
admissionSchema.index({
  studentName: "text",
  fatherName: "text",
  motherName: "text",
  studentId: "text",
});
admissionSchema.index({ class: 1, batchName: 1, status: 1 });
admissionSchema.index({ admissionDate: -1 });

const Admission = mongoose.model<IAdmission>("Admission", admissionSchema);

export default Admission;
