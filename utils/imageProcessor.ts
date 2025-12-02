import fs from "fs";
import path from "path";
import sharp from "sharp";
import { promisify } from "util";

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

export interface ImageProcessOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: keyof sharp.FitEnum;
}

/**
 * Convert image to WebP format using Sharp
 * @param inputPath - Path to the original image file
 * @param outputDir - Directory where the WebP image will be saved
 * @param filename - Name for the output file (without extension)
 * @param options - Image processing options
 * @returns Path to the converted WebP image
 */
export async function convertToWebP(
  inputPath: string,
  outputDir: string,
  filename: string,
  options: ImageProcessOptions = {}
): Promise<string> {
  try {
    // Ensure output directory exists
    await mkdirAsync(outputDir, { recursive: true });

    // Generate output filename with .webp extension
    const outputFilename = `${filename}.webp`;
    const outputPath = path.join(outputDir, outputFilename);

    // Default options
    const { width, height, quality = 80, fit = "cover" } = options;

    // Process image with Sharp
    let sharpInstance = sharp(inputPath);

    // Resize if dimensions are provided
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit,
        withoutEnlargement: true,
      });
    }

    // Convert to WebP
    await sharpInstance.webp({ quality }).toFile(outputPath);

    // Delete original file after successful conversion
    try {
      await unlinkAsync(inputPath);
    } catch (error) {
      console.error("Error deleting original file:", error);
    }

    return outputPath;
  } catch (error) {
    console.error("Error converting image to WebP:", error);
    // Delete the original file even if conversion fails
    try {
      await unlinkAsync(inputPath);
    } catch (unlinkError) {
      console.error(
        "Error deleting original file after failed conversion:",
        unlinkError
      );
    }
    throw new Error(
      `Failed to convert image to WebP: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Process multiple image sizes (thumbnail, medium, large)
 * @param inputPath - Path to the original image file
 * @param outputDir - Directory where the WebP images will be saved
 * @param baseFilename - Base name for the output files
 * @returns Object with paths to all generated sizes
 */
export async function processMultipleSizes(
  inputPath: string,
  outputDir: string,
  baseFilename: string
): Promise<{
  thumbnail: string;
  medium: string;
  large: string;
  original: string;
}> {
  try {
    await mkdirAsync(outputDir, { recursive: true });

    const sizes: Array<{
      name: string;
      width?: number;
      height?: number;
      quality: number;
    }> = [
      { name: "thumbnail", width: 150, height: 150, quality: 80 },
      { name: "medium", width: 500, height: 500, quality: 85 },
      { name: "large", width: 1200, height: 1200, quality: 90 },
      { name: "original", quality: 90 },
    ];

    const results: any = {};

    for (const sizeConfig of sizes) {
      const filename =
        sizeConfig.name === "original"
          ? baseFilename
          : `${baseFilename}-${sizeConfig.name}`;

      const outputFilename = `${filename}.webp`;
      const outputPath = path.join(outputDir, outputFilename);

      let sharpInstance = sharp(inputPath);

      if (sizeConfig.width && sizeConfig.height) {
        sharpInstance = sharpInstance.resize(
          sizeConfig.width,
          sizeConfig.height,
          {
            fit: "cover",
            withoutEnlargement: true,
          }
        );
      }

      await sharpInstance
        .webp({ quality: sizeConfig.quality })
        .toFile(outputPath);

      results[sizeConfig.name] = outputPath;
    }

    // Delete original file after all conversions
    try {
      await unlinkAsync(inputPath);
    } catch (error) {
      console.error("Error deleting original file:", error);
    }

    return results;
  } catch (error) {
    console.error("Error processing multiple sizes:", error);
    // Clean up original file
    try {
      await unlinkAsync(inputPath);
    } catch (unlinkError) {
      console.error(
        "Error deleting original file after failed processing:",
        unlinkError
      );
    }
    throw new Error(
      `Failed to process multiple sizes: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Delete image file(s)
 * @param filePath - Path to the file or array of paths
 */
export async function deleteImage(filePath: string | string[]): Promise<void> {
  try {
    const paths = Array.isArray(filePath) ? filePath : [filePath];

    for (const path of paths) {
      if (fs.existsSync(path)) {
        await unlinkAsync(path);
      }
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
}

/**
 * Get image metadata
 * @param imagePath - Path to the image file
 */
export async function getImageMetadata(imagePath: string) {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
    };
  } catch (error) {
    console.error("Error getting image metadata:", error);
    throw error;
  }
}
