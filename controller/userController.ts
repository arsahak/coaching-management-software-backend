import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import User from "../modal/user";

// Get all sub-users (only admin can access)
export const getSubUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if user is admin (super user)
    if (req.user?.role !== "admin") {
      res.status(403).json({
        success: false,
        message:
          "You don't have permission to access this resource. Admin access required.",
      });
      return;
    }

    // Get all users except the current user
    const currentUserId = req.user?.userId
      ? new mongoose.Types.ObjectId(req.user.userId)
      : null;
    const users = await User.find(
      currentUserId ? { _id: { $ne: currentUserId } } : {}
    )
      .select("-password -refreshToken")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Sub-users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("Get sub-users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching sub-users",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Create sub-user (only admin can create)
export const createSubUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if user is admin (super user)
    if (req.user?.role !== "admin") {
      res.status(403).json({
        success: false,
        message:
          "You don't have permission to create users. Admin access required.",
      });
      return;
    }

    const { name, email, password, role, userType, avatar, permissions } =
      req.body;

    // Validation
    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
      return;
    }

    // Create new user
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || "teacher",
      userType: userType || "sub-user",
      avatar: avatar || "",
      permissions: permissions || [],
      provider: "credentials",
    });

    // Remove password from response
    const userResponse = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      userType: newUser.userType,
      avatar: newUser.avatar,
      permissions: newUser.permissions,
      isEmailVerified: newUser.isEmailVerified,
      createdAt: newUser.createdAt,
    };

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: userResponse,
    });
  } catch (error) {
    console.error("Create sub-user error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating sub-user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Update sub-user (only admin can update)
export const updateSubUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if user is admin (super user)
    if (req.user?.role !== "admin") {
      res.status(403).json({
        success: false,
        message:
          "You don't have permission to update users. Admin access required.",
      });
      return;
    }

    const { id } = req.params;
    const { name, email, password, role, userType, avatar } = req.body;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: "Email already in use",
        });
        return;
      }
    }

    // Update user
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (role) updateData.role = role;
    if (userType) updateData.userType = userType;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -refreshToken");

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update sub-user error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating sub-user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Delete sub-user (only admin can delete)
export const deleteSubUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if user is admin (super user)
    if (req.user?.role !== "admin") {
      res.status(403).json({
        success: false,
        message:
          "You don't have permission to delete users. Admin access required.",
      });
      return;
    }

    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user?.userId || id === req.user?.userId?.toString()) {
      res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
      return;
    }

    // Find and delete user
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete sub-user error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting sub-user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Update user permissions (only admin can update)
export const updateUserPermissions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check if user is admin (super user)
    if (req.user?.role !== "admin") {
      res.status(403).json({
        success: false,
        message:
          "You don't have permission to update user permissions. Admin access required.",
      });
      return;
    }

    const { id } = req.params;
    const { permissions } = req.body;

    // Validate permissions is an array
    if (!Array.isArray(permissions)) {
      res.status(400).json({
        success: false,
        message: "Permissions must be an array",
      });
      return;
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Update permissions
    user.permissions = permissions;
    await user.save();

    const updatedUser = await User.findById(id).select(
      "-password -refreshToken"
    );

    res.status(200).json({
      success: true,
      message: "Permissions updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating permissions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
