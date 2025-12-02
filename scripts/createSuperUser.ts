import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db";
import User from "../modal/user";

// Load environment variables
dotenv.config();

interface SuperUserData {
  name: string;
  email: string;
  password: string;
}

const createSuperUser = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();
    console.log("✅ Connected to database");

    // Get super user data from environment or use defaults
    const superUserData: SuperUserData = {
      name: process.env.SUPER_USER_NAME || "Super Admin",
      email: process.env.SUPER_USER_EMAIL || "admin@coachingcenter.com",
      password: process.env.SUPER_USER_PASSWORD || "Admin@123",
    };

    // Check if super user already exists
    const existingUser = await User.findOne({ email: superUserData.email });
    if (existingUser) {
      // Update existing user to admin if not already
      if (existingUser.role !== "admin") {
        existingUser.role = "admin";
        existingUser.userType = "main-user";
        if (superUserData.password) {
          existingUser.password = superUserData.password;
        }
        await existingUser.save();
        console.log("✅ Existing user updated to super admin");
        console.log(`   Email: ${existingUser.email}`);
        console.log(`   Role: ${existingUser.role}`);
        console.log(`   User Type: ${existingUser.userType}`);
      } else {
        console.log("ℹ️  Super user already exists with admin role");
        console.log(`   Email: ${existingUser.email}`);
        console.log(`   Role: ${existingUser.role}`);
      }
    } else {
      // Create new super user
      const superUser = await User.create({
        name: superUserData.name,
        email: superUserData.email,
        password: superUserData.password,
        role: "admin",
        userType: "main-user",
        provider: "credentials",
        isEmailVerified: true,
        permissions: [], // Super user has all permissions by default (checked by role)
      });

      console.log("✅ Super user created successfully!");
      console.log("========================================");
      console.log("Super User Details:");
      console.log("========================================");
      console.log(`Name: ${superUser.name}`);
      console.log(`Email: ${superUser.email}`);
      console.log(`Password: ${superUserData.password}`);
      console.log(`Role: ${superUser.role}`);
      console.log(`User Type: ${superUser.userType}`);
      console.log("========================================");
      console.log(
        "\n⚠️  IMPORTANT: Please change the password after first login!"
      );
      console.log("========================================\n");
    }

    // Close database connection
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating super user:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
createSuperUser();
