import { Request, Response } from "express";
import path from "path";
import { AuthRequest } from "../middleware/auth";
import Portfolio from "../modal/portfolio";
import { convertToWebP, deleteImage } from "../utils/imageProcessor";

// Helper function to process uploaded image
async function processUploadedImage(
  file: any,
  folder: string = "portfolio"
): Promise<string> {
  try {
    const uploadsDir = path.join(__dirname, "../../uploads", folder);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    // Convert to WebP
    const webpPath = await convertToWebP(file.path, uploadsDir, filename, {
      width: 800,
      height: 800,
      quality: 85,
    });

    // Return relative URL path
    const relativePath = path.relative(
      path.join(__dirname, "../../uploads"),
      webpPath
    );
    return `/uploads/${relativePath.replace(/\\/g, "/")}`;
  } catch (error) {
    console.error("Error processing uploaded image:", error);
    throw error;
  }
}

// Get portfolio settings
export const getPortfolio = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    let portfolio = await Portfolio.findOne();

    // If no portfolio exists, create a default one
    if (!portfolio) {
      portfolio = await Portfolio.create({
        appTitle: "Coaching Center",
        appLogo: "",
        createdBy: new (require("mongoose").Types.ObjectId)(),
      });
    }

    res.status(200).json({
      success: true,
      data: portfolio,
    });
  } catch (error) {
    console.error("Get portfolio error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching portfolio settings",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Update portfolio settings
export const updatePortfolio = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const updateData: any = { ...req.body };

    // Process uploaded images if present
    const files = (req as any).files as { [fieldname: string]: any[] };

    if (files) {
      if (files.appLogo && files.appLogo[0]) {
        updateData.appLogo = await processUploadedImage(
          files.appLogo[0],
          "portfolio/logos"
        );
      }

      if (files.favicon && files.favicon[0]) {
        updateData.favicon = await processUploadedImage(
          files.favicon[0],
          "portfolio/favicons"
        );
      }
    }

    // Find existing portfolio or create new one
    let portfolio = await Portfolio.findOne();

    if (!portfolio) {
      portfolio = await Portfolio.create({
        ...updateData,
        createdBy: req.user?.userId,
      });
    } else {
      // Delete old images if new ones are uploaded
      if (updateData.appLogo && portfolio.appLogo) {
        const oldLogoPath = path.join(
          __dirname,
          "../../uploads",
          portfolio.appLogo.replace("/uploads/", "")
        );
        try {
          await deleteImage(oldLogoPath);
        } catch (error) {
          console.error("Error deleting old logo:", error);
        }
      }

      if (updateData.favicon && portfolio.favicon) {
        const oldFaviconPath = path.join(
          __dirname,
          "../../uploads",
          portfolio.favicon.replace("/uploads/", "")
        );
        try {
          await deleteImage(oldFaviconPath);
        } catch (error) {
          console.error("Error deleting old favicon:", error);
        }
      }

      // Update existing portfolio
      Object.assign(portfolio, {
        ...updateData,
        updatedBy: req.user?.userId,
      });
      await portfolio.save();
    }

    res.status(200).json({
      success: true,
      message: "Portfolio settings updated successfully",
      data: portfolio,
    });
  } catch (error) {
    console.error("Update portfolio error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating portfolio settings",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Create portfolio settings (if needed)
export const createPortfolio = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if portfolio already exists
    const existingPortfolio = await Portfolio.findOne();
    if (existingPortfolio) {
      res.status(400).json({
        success: false,
        message:
          "Portfolio settings already exist. Use update endpoint instead.",
      });
      return;
    }

    const portfolioData: any = { ...req.body };

    // Process uploaded images if present
    const files = (req as any).files as { [fieldname: string]: any[] };

    if (files) {
      if (files.appLogo && files.appLogo[0]) {
        portfolioData.appLogo = await processUploadedImage(
          files.appLogo[0],
          "portfolio/logos"
        );
      }

      if (files.favicon && files.favicon[0]) {
        portfolioData.favicon = await processUploadedImage(
          files.favicon[0],
          "portfolio/favicons"
        );
      }
    }

    // Set defaults
    const portfolio = await Portfolio.create({
      appTitle: portfolioData.appTitle || "Coaching Center",
      appLogo: portfolioData.appLogo || "",
      appDescription: portfolioData.appDescription,
      appTagline: portfolioData.appTagline,
      favicon: portfolioData.favicon,
      primaryColor: portfolioData.primaryColor || "#3B82F6",
      secondaryColor: portfolioData.secondaryColor || "#8B5CF6",
      accentColor: portfolioData.accentColor || "#10B981",
      email: portfolioData.email,
      phone: portfolioData.phone,
      address: portfolioData.address,
      website: portfolioData.website,
      socialMedia: portfolioData.socialMedia || {},
      metaKeywords: portfolioData.metaKeywords,
      metaDescription: portfolioData.metaDescription,
      copyrightText:
        portfolioData.copyrightText ||
        "© 2024 Coaching Center. All rights reserved.",
      createdBy: req.user?.userId,
    });

    res.status(201).json({
      success: true,
      message: "Portfolio settings created successfully",
      data: portfolio,
    });
  } catch (error) {
    console.error("Create portfolio error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating portfolio settings",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
