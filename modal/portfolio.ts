import mongoose, { Document, Schema } from "mongoose";

export interface IPortfolio extends Document {
  // App Information
  appTitle: string;
  appLogo: string;
  appDescription?: string;
  appTagline?: string;
  favicon?: string;

  // Branding
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;

  // Contact Information
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };

  // Additional Settings
  metaKeywords?: string;
  metaDescription?: string;
  copyrightText?: string;

  // Relations
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy?: mongoose.Types.ObjectId | string;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const portfolioSchema = new Schema<IPortfolio>(
  {
    appTitle: {
      type: String,
      required: [true, "App title is required"],
      trim: true,
      default: "Coaching Center",
    },
    appLogo: {
      type: String,
      trim: true,
      default: "",
    },
    appDescription: {
      type: String,
      trim: true,
    },
    appTagline: {
      type: String,
      trim: true,
    },
    favicon: {
      type: String,
      trim: true,
    },
    primaryColor: {
      type: String,
      trim: true,
      default: "#3B82F6",
    },
    secondaryColor: {
      type: String,
      trim: true,
      default: "#8B5CF6",
    },
    accentColor: {
      type: String,
      trim: true,
      default: "#10B981",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    socialMedia: {
      facebook: { type: String, trim: true },
      twitter: { type: String, trim: true },
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      youtube: { type: String, trim: true },
    },
    metaKeywords: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },
    copyrightText: {
      type: String,
      trim: true,
      default: "© 2024 Coaching Center. All rights reserved.",
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

// Indexes
portfolioSchema.index({ createdAt: -1 });

// Ensure only one portfolio document exists
portfolioSchema.statics.getPortfolio = async function () {
  let portfolio = await this.findOne();
  if (!portfolio) {
    portfolio = await this.create({
      appTitle: "Coaching Center",
      createdBy: new mongoose.Types.ObjectId(),
    });
  }
  return portfolio;
};

const Portfolio = mongoose.model<IPortfolio>("Portfolio", portfolioSchema);

export default Portfolio;
