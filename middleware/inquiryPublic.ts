import { NextFunction, Request, Response } from "express";

/** Protects public website inquiry POST with a shared secret header */
export const verifyInquirySecret = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const secret = process.env.INQUIRY_API_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      next();
      return;
    }
    res.status(503).json({
      success: false,
      message: "Inquiry API is not configured",
    });
    return;
  }

  const header = req.headers["x-inquiry-secret"];
  if (header === secret) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: "Forbidden",
  });
};
