import { Router } from "express";
import {
  createAdmission,
  deleteAdmission,
  getAdmissionById,
  getAdmissionStats,
  getAdmissions,
  updateAdmission,
} from "../controller/admissionController";
import { authenticate } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.post("/", createAdmission);
router.get("/", getAdmissions);
router.get("/stats", getAdmissionStats);
router.get("/:id", getAdmissionById);
router.put("/:id", updateAdmission);
router.patch("/:id", updateAdmission);
router.delete("/:id", deleteAdmission);

export default router;

