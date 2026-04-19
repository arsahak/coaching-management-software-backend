import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Admission, { IAdmission } from "../modal/admission";
import {
  validatePhoneNumber,
  sanitizeString,
  sanitizeStringArray,
  isPositiveNumber,
  isValidPastDate,
} from "../utils/validation";
import { logger } from "../utils/logger";

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

    // Validation - Required fields
    if (
      !studentName ||
      !fatherName ||
      !motherName ||
      !schoolName ||
      !fatherMobile ||
      !subjects ||
      !batchName ||
      !batchTime ||
      !admissionDate ||
      monthlyFee === undefined ||
      !studentClass
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
      return;
    }

    // Phone number validation
    if (!validatePhoneNumber(fatherMobile)) {
      res.status(400).json({
        success: false,
        message: "Invalid father's mobile number. Format: 01XXXXXXXXX",
      });
      return;
    }

    if (motherMobile && !validatePhoneNumber(motherMobile)) {
      res.status(400).json({
        success: false,
        message: "Invalid mother's mobile number. Format: 01XXXXXXXXX",
      });
      return;
    }

    if (studentMobile && !validatePhoneNumber(studentMobile)) {
      res.status(400).json({
        success: false,
        message: "Invalid student's mobile number. Format: 01XXXXXXXXX",
      });
      return;
    }

    // Monthly fee validation
    if (!isPositiveNumber(monthlyFee)) {
      res.status(400).json({
        success: false,
        message: "Monthly fee must be a positive number",
      });
      return;
    }

    // Date validation
    if (!isValidPastDate(admissionDate)) {
      res.status(400).json({
        success: false,
        message: "Admission date cannot be in the future",
      });
      return;
    }

    // Normalize and sanitize payload
    const normalizedSubjects = sanitizeStringArray(
      Array.isArray(subjects) ? subjects : subjects ? [subjects] : []
    );

    if (normalizedSubjects.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one subject is required",
      });
      return;
    }

    const normalizedAlarmMobile: string[] = [];
    if (alarmMobile) {
      const alarmArray = Array.isArray(alarmMobile)
        ? alarmMobile
        : [alarmMobile];
      for (const phone of alarmArray) {
        if (validatePhoneNumber(phone)) {
          normalizedAlarmMobile.push(phone.trim());
        }
      }
    }

    // Sanitize string inputs
    const sanitizedData = {
      studentName: sanitizeString(studentName),
      fatherName: sanitizeString(fatherName),
      motherName: sanitizeString(motherName),
      schoolName: sanitizeString(schoolName),
      fatherMobile: fatherMobile.trim(),
      motherMobile: motherMobile?.trim(),
      studentMobile: studentMobile?.trim(),
      class: sanitizeString(studentClass),
      subjects: normalizedSubjects,
      batchName: sanitizeString(batchName),
      batchTime: sanitizeString(batchTime),
      admissionDate: new Date(admissionDate),
      monthlyFee: Number(monthlyFee),
      studentSignature,
      directorSignature,
      notes: notes ? sanitizeString(notes) : undefined,
      alarmMobile: normalizedAlarmMobile,
      createdBy: req.user?.userId,
      status: "active" as const,
    };

    // Create admission
    const admission = await Admission.create(sanitizedData);

    logger.info(
      `Admission created: ${admission.studentId} by user ${req.user?.userId}`
    );

    res.status(201).json({
      success: true,
      message: "Admission created successfully",
      data: admission,
    });
  } catch (error) {
    logger.error("Create admission error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating admission",
      ...(process.env.NODE_ENV === "development" && {
        error: error instanceof Error ? error.message : "Unknown error",
      }),
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
    logger.error("Get admissions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admissions",
      ...(process.env.NODE_ENV === "development" && {
        error: error instanceof Error ? error.message : "Unknown error",
      }),
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
    logger.error("Get admission by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admission",
      ...(process.env.NODE_ENV === "development" && {
        error: error instanceof Error ? error.message : "Unknown error",
      }),
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

    // Validate phone numbers if provided
    if (updateData.fatherMobile && !validatePhoneNumber(updateData.fatherMobile as string)) {
      res.status(400).json({
        success: false,
        message: "Invalid father's mobile number. Format: 01XXXXXXXXX",
      });
      return;
    }

    if (updateData.motherMobile && !validatePhoneNumber(updateData.motherMobile as string)) {
      res.status(400).json({
        success: false,
        message: "Invalid mother's mobile number. Format: 01XXXXXXXXX",
      });
      return;
    }

    if (updateData.studentMobile && !validatePhoneNumber(updateData.studentMobile as string)) {
      res.status(400).json({
        success: false,
        message: "Invalid student's mobile number. Format: 01XXXXXXXXX",
      });
      return;
    }

    // Validate monthly fee if provided
    if (updateData.monthlyFee !== undefined && !isPositiveNumber(updateData.monthlyFee)) {
      res.status(400).json({
        success: false,
        message: "Monthly fee must be a positive number",
      });
      return;
    }

    // Add updatedBy (string will be cast to ObjectId by Mongoose)
    if (req.user?.userId) {
      updateData.updatedBy = req.user.userId;
    }

    // Convert date strings to Date objects if present
    if (typeof updateData.admissionDate === "string") {
      updateData.admissionDate = new Date(updateData.admissionDate);
    }

    // Sanitize and normalize subjects to array
    if (updateData.subjects) {
      const subjectsArray = Array.isArray(updateData.subjects)
        ? updateData.subjects
        : [updateData.subjects as string];
      updateData.subjects = sanitizeStringArray(subjectsArray);
    }

    // Normalize alarmMobile and validate phone numbers
    if (updateData.alarmMobile) {
      const alarmArray = Array.isArray(updateData.alarmMobile)
        ? updateData.alarmMobile
        : [updateData.alarmMobile as string];
      const validPhones: string[] = [];
      for (const phone of alarmArray) {
        if (validatePhoneNumber(phone as string)) {
          validPhones.push((phone as string).trim());
        }
      }
      updateData.alarmMobile = validPhones;
    }

    // Normalize smsHistory / emailHistory to arrays if provided
    if (updateData.smsHistory && !Array.isArray(updateData.smsHistory)) {
      updateData.smsHistory = [updateData.smsHistory as string];
    }
    if (updateData.emailHistory && !Array.isArray(updateData.emailHistory)) {
      updateData.emailHistory = [updateData.emailHistory as string];
    }

    // Sanitize string fields
    if (updateData.studentName) {
      updateData.studentName = sanitizeString(updateData.studentName as string);
    }
    if (updateData.fatherName) {
      updateData.fatherName = sanitizeString(updateData.fatherName as string);
    }
    if (updateData.motherName) {
      updateData.motherName = sanitizeString(updateData.motherName as string);
    }
    if (updateData.schoolName) {
      updateData.schoolName = sanitizeString(updateData.schoolName as string);
    }
    if (updateData.batchName) {
      updateData.batchName = sanitizeString(updateData.batchName as string);
    }
    if (updateData.batchTime) {
      updateData.batchTime = sanitizeString(updateData.batchTime as string);
    }
    if (updateData.notes) {
      updateData.notes = sanitizeString(updateData.notes as string);
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

    logger.info(
      `Admission updated: ${admission.studentId} by user ${req.user?.userId}`
    );

    res.status(200).json({
      success: true,
      message: "Admission updated successfully",
      data: admission,
    });
  } catch (error) {
    logger.error("Update admission error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating admission",
      ...(process.env.NODE_ENV === "development" && {
        error: error instanceof Error ? error.message : "Unknown error",
      }),
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
    logger.error("Delete admission error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting admission",
      ...(process.env.NODE_ENV === "development" && {
        error: error instanceof Error ? error.message : "Unknown error",
      }),
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
    logger.error("Get admission stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admission statistics",
      ...(process.env.NODE_ENV === "development" && {
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    });
  }
};

// Get unique class list
export const getClassList = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const classes = await Admission.distinct("class");
    
    // Sort classes in a logical order (numbers first, then alphabetically)
    const sortedClasses = classes.sort((a, b) => {
      // Extract numbers if present
      const numA = parseInt(a.match(/\d+/)?.[0] || "999");
      const numB = parseInt(b.match(/\d+/)?.[0] || "999");
      
      if (numA !== numB) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    res.status(200).json({
      success: true,
      data: sortedClasses,
    });
  } catch (error) {
    logger.error("Get class list error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching class list",
      ...(process.env.NODE_ENV === "development" && {
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    });
  }
};

// Get unique batch list
export const getBatchList = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const batches = await Admission.distinct("batchName");

    // Sort batches alphabetically
    const sortedBatches = batches.sort((a, b) => a.localeCompare(b));

    res.status(200).json({
      success: true,
      data: sortedBatches,
    });
  } catch (error) {
    logger.error("Get batch list error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching batch list",
      ...(process.env.NODE_ENV === "development" && {
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    });
  }
};
