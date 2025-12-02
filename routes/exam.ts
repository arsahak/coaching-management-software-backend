import { Router } from "express";
import {
  createBatchExamResults,
  createExam,
  createExamResult,
  deleteExam,
  getExamById,
  getExamResults,
  getExamStats,
  getExams,
  sendExamResultSMS,
  sendExamScheduleSMS,
  updateExam,
} from "../controller/examController";
import { authenticate } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Exam routes
router.post("/", createExam);
router.get("/", getExams);
router.get("/stats", getExamStats);
router.get("/:id", getExamById);
router.put("/:id", updateExam);
router.patch("/:id", updateExam);
router.delete("/:id", deleteExam);

// Exam schedule SMS
router.post("/schedule/sms", sendExamScheduleSMS);

// Exam result routes
router.post("/results", createExamResult);
router.post("/results/batch", createBatchExamResults);
router.get("/results", getExamResults);
router.post("/results/sms", sendExamResultSMS);

export default router;
