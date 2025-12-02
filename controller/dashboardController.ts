import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Admission from "../modal/admission";
import User from "../modal/user";

// Get dashboard overview statistics
export const getDashboardOverview = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - User not authenticated",
      });
      return;
    }

    // Get date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total Students (Active Admissions)
    const totalStudents = await Admission.countDocuments({
      status: "active",
    });

    // Students this month
    const studentsThisMonth = await Admission.countDocuments({
      status: "active",
      admissionDate: { $gte: startOfMonth },
    });

    // Students last month
    const studentsLastMonth = await Admission.countDocuments({
      status: "active",
      admissionDate: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });

    // Calculate student growth percentage
    const studentGrowth =
      studentsLastMonth > 0
        ? ((studentsThisMonth - studentsLastMonth) / studentsLastMonth) * 100
        : studentsThisMonth > 0
        ? 100
        : 0;

    // Total Teachers/Staff
    const totalTeachers = await User.countDocuments({
      role: { $in: ["teacher", "admin"] },
      isActive: true,
    });

    // New Admissions this month
    const newAdmissionsThisMonth = await Admission.countDocuments({
      admissionDate: { $gte: startOfMonth },
    });

    // New Admissions last month
    const newAdmissionsLastMonth = await Admission.countDocuments({
      admissionDate: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    });

    // Admission growth
    const admissionGrowth =
      newAdmissionsLastMonth > 0
        ? ((newAdmissionsThisMonth - newAdmissionsLastMonth) /
            newAdmissionsLastMonth) *
          100
        : newAdmissionsThisMonth > 0
        ? 100
        : 0;

    // Pending Admissions
    const pendingAdmissions = await Admission.countDocuments({
      status: "pending",
    });

    // Inactive/Completed Admissions
    const inactiveStudents = await Admission.countDocuments({
      status: { $in: ["inactive", "completed"] },
    });

    // Calculate monthly revenue (sum of monthly fees from active students)
    const revenueData = await Admission.aggregate([
      {
        $match: {
          status: "active",
        },
      },
      {
        $group: {
          _id: null,
          totalMonthlyRevenue: { $sum: "$monthlyFee" },
          avgMonthlyFee: { $avg: "$monthlyFee" },
        },
      },
    ]);

    const monthlyRevenue =
      revenueData.length > 0 ? revenueData[0].totalMonthlyRevenue : 0;
    const avgMonthlyFee =
      revenueData.length > 0 ? revenueData[0].avgMonthlyFee : 0;

    // Get students by class distribution
    const studentsByClass = await Admission.aggregate([
      {
        $match: {
          status: "active",
        },
      },
      {
        $group: {
          _id: "$class",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get students by batch distribution
    const studentsByBatch = await Admission.aggregate([
      {
        $match: {
          status: "active",
        },
      },
      {
        $group: {
          _id: "$batch",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Recent admissions (last 5)
    const recentAdmissions = await Admission.find()
      .sort({ admissionDate: -1 })
      .limit(5)
      .select("name class batch admissionDate status");

    // Get monthly trends (last 6 months)
    const monthlyTrendsRaw = await Admission.aggregate([
      {
        $match: {
          admissionDate: {
            $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$admissionDate" },
            month: { $month: "$admissionDate" },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$monthlyFee" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Fill in missing months with zero values for better chart continuity
    const monthlyTrends: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      const existingData = monthlyTrendsRaw.find(
        (item: any) => item._id.year === year && item._id.month === month
      );

      monthlyTrends.push({
        _id: { year, month },
        count: existingData?.count || 0,
        revenue: existingData?.revenue || 0,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalTeachers,
          newAdmissionsThisMonth,
          pendingAdmissions,
          inactiveStudents,
          monthlyRevenue: Math.round(monthlyRevenue),
          avgMonthlyFee: Math.round(avgMonthlyFee),
        },
        growth: {
          studentGrowth: Math.round(studentGrowth * 10) / 10,
          admissionGrowth: Math.round(admissionGrowth * 10) / 10,
        },
        distribution: {
          byClass: studentsByClass,
          byBatch: studentsByBatch,
        },
        recentAdmissions,
        monthlyTrends,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get quick stats for widgets
export const getQuickStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const totalActive = await Admission.countDocuments({ status: "active" });
    const totalPending = await Admission.countDocuments({ status: "pending" });
    const totalTeachers = await User.countDocuments({
      role: { $in: ["teacher", "admin"] },
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: {
        totalActive,
        totalPending,
        totalTeachers,
      },
    });
  } catch (error) {
    console.error("Error fetching quick stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
    });
  }
};
