import { Router } from "express";
import {
  createFee,
  createBulkFees,
  deleteFee,
  getFeeById,
  getFeeStats,
  getFees,
  sendOverdueSMS,
  sendPaymentConfirmationSMS,
  sendPaymentReminderSMS,
  updateFee,
} from "../controller/feeController";
import { authenticate } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Fee routes
router.post("/", createFee);
router.post("/bulk", createBulkFees);
router.get("/", getFees);
router.get("/stats", getFeeStats);
router.get("/:id", getFeeById);
router.put("/:id", updateFee);
router.patch("/:id", updateFee);
router.delete("/:id", deleteFee);

// SMS routes
router.post("/reminder/sms", sendPaymentReminderSMS);
router.post("/overdue/sms", sendOverdueSMS);
router.post("/payment/sms", sendPaymentConfirmationSMS);

export default router;

