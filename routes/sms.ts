import { Router } from "express";
import {
  getSMSById,
  getSMSHistory,
  getSMSStats,
  sendBulkSMSDifferentMessages,
  sendBulkSMSSameMessage,
  sendSingleSMS,
  sendSMSToStudents,
} from "../controller/smsController";
import { authenticate } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// SMS routes
router.post("/send", sendSingleSMS);
router.post("/bulk", sendBulkSMSSameMessage);
router.post("/bulk/custom", sendBulkSMSDifferentMessages);
router.post("/send/students", sendSMSToStudents);

// SMS history and stats
router.get("/", getSMSHistory);
router.get("/stats", getSMSStats);
router.get("/:id", getSMSById);

export default router;
