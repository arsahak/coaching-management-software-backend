import { Router } from "express";
import {
  createPortfolio,
  getPortfolio,
  updatePortfolio,
} from "../controller/portfolioController";
import { authenticate } from "../middleware/auth";
import { uploadFields } from "../middleware/upload";

const router = Router();

// Get portfolio (public endpoint - can be accessed without auth for public display)
router.get("/", getPortfolio);

// Create and update portfolio (require authentication and handle file uploads)
router.use(authenticate);

const portfolioUploadFields = uploadFields([
  { name: "appLogo", maxCount: 1 },
  { name: "favicon", maxCount: 1 },
]);

router.post("/", portfolioUploadFields, createPortfolio);
router.put("/", portfolioUploadFields, updatePortfolio);
router.patch("/", portfolioUploadFields, updatePortfolio);

export default router;
