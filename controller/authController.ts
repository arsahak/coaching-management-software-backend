import { Request, Response } from "express";
import { generateAccessToken, TokenPayload } from "../config/jwt";
import { AuthRequest } from "../middleware/auth";
import User from "../modal/user";

// Sign up with credentials
export const signUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

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
    const user = await User.create({
      name,
      email,
      password,
      role: role || "student",
      provider: "credentials",
    });

    // Generate access token with expiry info
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokenData = generateAccessToken(tokenPayload);

    // User response (without password)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userResponse,
      accessToken: tokenData.accessToken,
      tokenExpiresAt: tokenData.expiresAt,
      tokenExpiresIn: tokenData.expiresIn,
    });
  } catch (error) {
    console.error("Sign up error:", error);
    res.status(500).json({
      success: false,
      message: "Error during registration",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Sign in with credentials
export const signInWithCredentials = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
      return;
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Check if user has password (not social login only)
    if (!user.password) {
      res.status(401).json({
        success: false,
        message: "Please sign in with your social account",
      });
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Generate access token with expiry info
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokenData = generateAccessToken(tokenPayload);

    // User response (without password)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userResponse,
      accessToken: tokenData.accessToken,
      tokenExpiresAt: tokenData.expiresAt,
      tokenExpiresIn: tokenData.expiresIn,
    });
  } catch (error) {
    console.error("Sign in error:", error);
    res.status(500).json({
      success: false,
      message: "Error during login",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Sign in with social provider
export const signInWithSocial = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { provider, providerId, email, name, avatar } = req.body;

    // Validation
    if (!provider || !providerId || !email || !name) {
      res.status(400).json({
        success: false,
        message: "Please provide provider, providerId, email, and name",
      });
      return;
    }

    // Check if provider is valid
    const validProviders = ["google", "facebook", "github"];
    if (!validProviders.includes(provider)) {
      res.status(400).json({
        success: false,
        message: "Invalid provider. Supported: google, facebook, github",
      });
      return;
    }

    // Find or create user
    let user = await User.findOne({
      $or: [{ email }, { providerId, provider }],
    });

    if (user) {
      // Update provider info if needed
      if (!user.providerId) {
        user.providerId = providerId;
        user.provider = provider as "google" | "facebook" | "github";
        if (avatar) user.avatar = avatar;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        name,
        email,
        provider: provider as "google" | "facebook" | "github",
        providerId,
        avatar,
        isEmailVerified: true,
      });
    }

    // Generate access token with expiry info
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokenData = generateAccessToken(tokenPayload);

    // User response (without password)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      message: "Social login successful",
      user: userResponse,
      accessToken: tokenData.accessToken,
      tokenExpiresAt: tokenData.expiresAt,
      tokenExpiresIn: tokenData.expiresIn,
    });
  } catch (error) {
    console.error("Social sign in error:", error);
    res.status(500).json({
      success: false,
      message: "Error during social login",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get current user
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      provider: user.provider,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Sign out (simple - just returns success, client handles token removal)
export const signOut = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      message: "Signed out successfully",
    });
  } catch (error) {
    console.error("Sign out error:", error);
    res.status(500).json({
      success: false,
      message: "Error during sign out",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
