import cors from "cors";
import dotenv from "dotenv";
import express, { Application, Request, Response } from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import path from "path";
import connectDB from "./config/db";
import admissionRoutes from "./routes/admission";
import attendanceRoutes from "./routes/attendance";
import authRoutes from "./routes/auth";
import dashboardRoutes from "./routes/dashboard";
import examRoutes from "./routes/exam";
import feeRoutes from "./routes/fee";
import portfolioRoutes from "./routes/portfolio";
import qrcodeRoutes from "./routes/qrcode";
import smsRoutes from "./routes/sms";
import userRoutes from "./routes/users";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check route
app.get("", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Coaching Center API is running!",
    timestamp: new Date().toISOString(),
  });
});

// API welcome route
app.get("/api", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "App is running! Welcome to Coaching Center API",
    timestamp: new Date().toISOString(),
  });
});

// API routes (you can add more routes here)
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: "healthy",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Dashboard routes
app.use("/api/dashboard", dashboardRoutes);

// Admission routes
app.use("/api/admission", admissionRoutes);

// Attendance routes
app.use("/api/attendance", attendanceRoutes);

// Exam routes
app.use("/api/exam", examRoutes);

// Fee routes
app.use("/api/fee", feeRoutes);

// QR code routes
app.use("/api/qrcode", qrcodeRoutes);

// SMS routes
app.use("/api/sms", smsRoutes);

// Portfolio routes
app.use("/api/portfolio", portfolioRoutes);

// User management routes
app.use("/api/users", userRoutes);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database first
    await connectDB();

    // Start listening after database connection
    app.listen(PORT, () => {
      console.log("========================================");
      console.log("🚀 Server Started Successfully!");
      console.log("========================================");
      console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Server URL: http://localhost:${PORT}`);
      console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
      console.log(`⏰ Started At: ${new Date().toLocaleString()}`);
      console.log("========================================\n");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});

// Start the server
startServer();

export default app;
