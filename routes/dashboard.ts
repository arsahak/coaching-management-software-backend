import express from "express";
import {
  getDashboardOverview,
  getQuickStats,
} from "../controller/dashboardController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// Protect all routes
router.use(authenticate);

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview with statistics
// @access  Private
router.get("/overview", getDashboardOverview);

// @route   GET /api/dashboard/quick-stats
// @desc    Get quick statistics for widgets
// @access  Private
router.get("/quick-stats", getQuickStats);

export default router;
