import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(mongoURI);

    console.log("========================================");
    console.log("✅ Database Connected Successfully!");
    console.log("========================================");
    console.log(`📊 Database Name: ${conn.connection.name}`);
    console.log(`🔗 Host: ${conn.connection.host}`);
    console.log(`🔌 Port: ${conn.connection.port || "N/A (Atlas)"}`);
    console.log(
      `🌐 Connection State: ${
        conn.connection.readyState === 1 ? "Connected" : "Disconnected"
      }`
    );
    console.log(`⏰ Connected At: ${new Date().toLocaleString()}`);
    console.log("========================================\n");
  } catch (error) {
    console.error("========================================");
    console.error("❌ Database Connection Error:");
    console.error("========================================");
    console.error(error instanceof Error ? error.message : "Unknown error");
    console.error("========================================\n");
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

mongoose.connection.on("reconnected", () => {
  console.log("🔄 MongoDB reconnected");
});

export default connectDB;
