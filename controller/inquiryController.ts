import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Inquiry, { InquiryStatus } from "../modal/inquiry";
import Notification from "../modal/notification";
import {
  sanitizeString,
  validateEmail,
  validatePhoneNumber,
} from "../utils/validation";
import { logger } from "../utils/logger";

const INQUIRY_STATUSES: InquiryStatus[] = [
  "pending",
  "contacted",
  "enrolled",
  "rejected",
];

async function notifyNewInquiry(inquiry: {
  _id: unknown;
  studentName: string;
  parentName: string;
  desiredClass: string;
  phone: string;
}) {
  try {
    await Notification.create({
      type: "inquiry",
      title: "New admission inquiry",
      message: `${inquiry.studentName} (${inquiry.desiredClass}) — guardian: ${inquiry.parentName}, phone: ${inquiry.phone}`,
      meta: {
        inquiryId: String(inquiry._id),
        studentName: inquiry.studentName,
        relatedId: String(inquiry._id),
      },
    });
  } catch (err) {
    logger.error("Failed to create inquiry notification:", err);
  }
}

/** POST /api/inquiry/public — website form (no auth) */
export const createPublicInquiry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      studentName,
      parentName,
      phone,
      email,
      desiredClass,
      message,
    } = req.body;

    if (!studentName || !parentName || !phone || !desiredClass) {
      res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
      return;
    }

    const cleanPhone = String(phone).replace(/\s+/g, "").trim();
    if (!validatePhoneNumber(cleanPhone)) {
      res.status(400).json({
        success: false,
        message: "Invalid phone number. Format: 01XXXXXXXXX",
      });
      return;
    }

    if (email && !validateEmail(String(email))) {
      res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
      return;
    }

    const inquiry = await Inquiry.create({
      studentName: sanitizeString(String(studentName)),
      parentName: sanitizeString(String(parentName)),
      phone: cleanPhone,
      email: email ? sanitizeString(String(email)) : undefined,
      desiredClass: sanitizeString(String(desiredClass)),
      message: message ? sanitizeString(String(message)) : undefined,
      status: "pending",
      source: "website",
    });

    notifyNewInquiry(inquiry).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: { id: inquiry._id },
    });
  } catch (error) {
    logger.error("Create public inquiry error:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting inquiry",
    });
  }
};

/** GET /api/inquiry */
export const getInquiries = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? 1), 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.limit ?? 10), 10))
    );
    const search = String(req.query.search ?? "").trim();
    const status = req.query.status as string | undefined;

    const query: Record<string, unknown> = {};
    if (status && INQUIRY_STATUSES.includes(status as InquiryStatus)) {
      query.status = status;
    }
    if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { studentName: regex },
        { parentName: regex },
        { phone: regex },
        { email: regex },
        { desiredClass: regex },
        { message: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const [inquiries, total] = await Promise.all([
      Inquiry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Inquiry.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: inquiries,
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
    logger.error("Get inquiries error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inquiries",
    });
  }
};

/** GET /api/inquiry/stats */
export const getInquiryStats = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const [pending, contacted, enrolled, rejected, total] = await Promise.all([
      Inquiry.countDocuments({ status: "pending" }),
      Inquiry.countDocuments({ status: "contacted" }),
      Inquiry.countDocuments({ status: "enrolled" }),
      Inquiry.countDocuments({ status: "rejected" }),
      Inquiry.countDocuments(),
    ]);

    res.json({
      success: true,
      data: { pending, contacted, enrolled, rejected, total },
    });
  } catch (error) {
    logger.error("Get inquiry stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inquiry stats",
    });
  }
};

/** GET /api/inquiry/:id */
export const getInquiryById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const inquiry = await Inquiry.findById(req.params.id).lean();
    if (!inquiry) {
      res.status(404).json({ success: false, message: "Inquiry not found" });
      return;
    }
    res.json({ success: true, data: inquiry });
  } catch (error) {
    logger.error("Get inquiry by id error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inquiry",
    });
  }
};

/** PATCH /api/inquiry/:id */
export const updateInquiry = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, adminNotes } = req.body;
    const updates: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!INQUIRY_STATUSES.includes(status)) {
        res.status(400).json({ success: false, message: "Invalid status" });
        return;
      }
      updates.status = status;
    }

    if (adminNotes !== undefined) {
      updates.adminNotes = adminNotes ? sanitizeString(String(adminNotes)) : "";
    }

    if (req.user?.userId) {
      updates.handledBy = req.user.userId;
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      res.status(404).json({ success: false, message: "Inquiry not found" });
      return;
    }

    res.json({
      success: true,
      message: "Inquiry updated successfully",
      data: inquiry,
    });
  } catch (error) {
    logger.error("Update inquiry error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating inquiry",
    });
  }
};

/** DELETE /api/inquiry/:id */
export const deleteInquiry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) {
      res.status(404).json({ success: false, message: "Inquiry not found" });
      return;
    }
    res.json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  } catch (error) {
    logger.error("Delete inquiry error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting inquiry",
    });
  }
};
