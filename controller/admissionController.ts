import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Admission, { IAdmission } from "../modal/admission";

// Create new admission
export const createAdmission = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      studentName,
      fatherName,
      motherName,
      schoolName,
      fatherMobile,
      motherMobile,
      studentMobile,
      class: studentClass,
      subjects,
      batchName,
      batchTime,
      admissionDate,
      monthlyFee,
      studentSignature,
      directorSignature,
      notes,
      alarmMobile,
    } = req.body;

    // Validation
    if (
      !studentName ||
      !fatherName ||
      !motherName ||
      !schoolName ||
      !fatherMobile ||
      !studentClass ||
      !subjects ||
      !batchName ||
      !batchTime ||
      !admissionDate ||
      monthlyFee === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
      return;
    }

    // Normalize payload
    const normalizedSubjects = Array.isArray(subjects)
      ? subjects
      : subjects
      ? [subjects]
      : [];

    const normalizedAlarmMobile =
      alarmMobile == null
        ? []
        : Array.isArray(alarmMobile)
        ? alarmMobile
        : [alarmMobile];

    // Create admission
    const admission = await Admission.create({
      studentName,
      fatherName,
      motherName,
      schoolName,
      fatherMobile,
      motherMobile,
      studentMobile,
      class: studentClass,
      subjects: normalizedSubjects,
      batchName,
      batchTime,
      admissionDate: new Date(admissionDate),
      monthlyFee: Number(monthlyFee),
      studentSignature,
      directorSignature,
      notes,
      alarmMobile: normalizedAlarmMobile,
      createdBy: req.user?.userId,
      status: "active",
    });

    res.status(201).json({
      success: true,
      message: "Admission created successfully",
      data: admission,
    });
  } catch (error) {
    console.error("Create admission error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating admission",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get all admissions with search and pagination
export const getAdmissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) || "1", 10);
    const limit = parseInt((req.query.limit as string) || "10", 10);
    const search = (req.query.search as string) || "";
    const classFilter = req.query.class as string | undefined;
    const batchFilter = req.query.batch as string | undefined;
    const statusFilter = req.query.status as string | undefined;

    // Build query
    const query: any = {};

    // Search query
    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { studentName: regex },
        { fatherName: regex },
        { motherName: regex },
        { schoolName: regex },
        { studentId: regex },
        { fatherMobile: regex },
        { motherMobile: regex },
        { studentMobile: regex },
      ];
    }

    // Filters
    if (classFilter) {
      query.class = classFilter;
    }
    if (batchFilter) {
      query.batchName = batchFilter;
    }
    if (statusFilter) {
      query.status = statusFilter;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get admissions with pagination
    const [admissions, total] = await Promise.all([
      Admission.find(query)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Admission.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: admissions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get admissions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admissions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get single admission by ID
export const getAdmissionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const admission = await Admission.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!admission) {
      res.status(404).json({
        success: false,
        message: "Admission not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: admission,
    });
  } catch (error) {
    console.error("Get admission by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admission",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Update admission
export const updateAdmission = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: Partial<IAdmission> & Record<string, unknown> = {
      ...req.body,
    };

    // Add updatedBy (string will be cast to ObjectId by Mongoose)
    if (req.user?.userId) {
      updateData.updatedBy = req.user.userId;
    }

    // Convert date strings to Date objects if present
    if (typeof updateData.admissionDate === "string") {
      updateData.admissionDate = new Date(updateData.admissionDate);
    }

    // Normalize subjects to array
    if (updateData.subjects) {
      if (!Array.isArray(updateData.subjects)) {
        updateData.subjects = [updateData.subjects as string];
      }
    }

    // Normalize alarmMobile / smsHistory / emailHistory to arrays if provided
    if (updateData.alarmMobile && !Array.isArray(updateData.alarmMobile)) {
      updateData.alarmMobile = [updateData.alarmMobile as string];
    }
    if (updateData.smsHistory && !Array.isArray(updateData.smsHistory)) {
      updateData.smsHistory = [updateData.smsHistory as string];
    }
    if (updateData.emailHistory && !Array.isArray(updateData.emailHistory)) {
      updateData.emailHistory = [updateData.emailHistory as string];
    }

    // Strip out fields that must never be updated
    const {
      studentId: _ignoreStudentId,
      createdBy: _ignoreCreatedBy,
      createdAt: _ignoreCreatedAt,
      ...safeUpdateData
    } = updateData;

    const admission = await Admission.findByIdAndUpdate(id, safeUpdateData, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!admission) {
      res.status(404).json({
        success: false,
        message: "Admission not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Admission updated successfully",
      data: admission,
    });
  } catch (error) {
    console.error("Update admission error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating admission",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Delete admission
export const deleteAdmission = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const admission = await Admission.findByIdAndDelete(id);

    if (!admission) {
      res.status(404).json({
        success: false,
        message: "Admission not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Admission deleted successfully",
    });
  } catch (error) {
    console.error("Delete admission error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting admission",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get statistics
export const getAdmissionStats = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const [total, active, inactive, completed, byClass, byBatch] =
      await Promise.all([
        Admission.countDocuments(),
        Admission.countDocuments({ status: "active" }),
        Admission.countDocuments({ status: "inactive" }),
        Admission.countDocuments({ status: "completed" }),
        Admission.aggregate([
          {
            $group: {
              _id: "$class",
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Admission.aggregate([
          {
            $group: {
              _id: "$batchName",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),
      ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive,
        completed,
        byClass,
        byBatch,
      },
    });
  } catch (error) {
    console.error("Get admission stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admission statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
