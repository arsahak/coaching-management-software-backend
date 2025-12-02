import { Router } from "express";
import {
  createSubUser,
  deleteSubUser,
  getSubUsers,
  updateSubUser,
  updateUserPermissions,
} from "../controller/userController";
import { authenticate } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all sub-users
router.get("/sub-users", getSubUsers);

// Create sub-user
router.post("/sub-users", createSubUser);

// Update sub-user
router.put("/sub-users/:id", updateSubUser);

// Delete sub-user
router.delete("/sub-users/:id", deleteSubUser);

// Update user permissions
router.put("/sub-users/:id/permissions", updateUserPermissions);

export default router;
