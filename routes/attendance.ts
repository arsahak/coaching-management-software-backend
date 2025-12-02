import { Router } from "express";
import {
  deleteAttendance,
  getAttendanceStats,
  getAttendances,
  getStudentAttendanceReport,
  markAttendance,
  markBatchAttendance,
  sendAttendanceReportSMS,
} from "../controller/attendanceController";
import { authenticate } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.post("/", markAttendance);
router.post("/batch", markBatchAttendance);
router.get("/", getAttendances);
router.get("/stats", getAttendanceStats);
router.get("/report", getStudentAttendanceReport);
router.post("/report/sms", sendAttendanceReportSMS);
router.delete("/:id", deleteAttendance);

export default router;

