import { Router } from "express";
import {
  bulkGenerateQRCodes,
  createQRCode,
  deleteQRCode,
  getQRCodeById,
  getQRCodes,
  updateQRCode,
  verifyQRCode,
} from "../controller/qrcodeController";
import { authenticate } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// QR code routes
router.post("/", createQRCode);
router.get("/", getQRCodes);
router.get("/:id", getQRCodeById);
router.put("/:id", updateQRCode);
router.patch("/:id", updateQRCode);
router.delete("/:id", deleteQRCode);

// Bulk operations
router.post("/bulk", bulkGenerateQRCodes);

// Verify QR code (public endpoint for scanning)
router.post("/verify", verifyQRCode);

export default router;
