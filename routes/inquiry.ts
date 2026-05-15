import { Router } from "express";
import {
  createPublicInquiry,
  deleteInquiry,
  getInquiries,
  getInquiryById,
  getInquiryStats,
  updateInquiry,
} from "../controller/inquiryController";
import { authenticate } from "../middleware/auth";
import { verifyInquirySecret } from "../middleware/inquiryPublic";

const router = Router();

router.post("/public", verifyInquirySecret, createPublicInquiry);

router.use(authenticate);

router.get("/stats", getInquiryStats);
router.get("/", getInquiries);
router.get("/:id", getInquiryById);
router.patch("/:id", updateInquiry);
router.delete("/:id", deleteInquiry);

export default router;
