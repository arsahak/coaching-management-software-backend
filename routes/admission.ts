import { Router } from "express";
import {
    createAdmission,
    deleteAdmission,
    getAdmissionById,
    getAdmissionStats,
    getAdmissions,
    getClassList,
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
router.get("/classes", getClassList);
router.get("/:id", getAdmissionById);
router.put("/:id", updateAdmission);
router.patch("/:id", updateAdmission);
router.delete("/:id", deleteAdmission);

export default router;

