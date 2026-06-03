import dns from "dns";
import mongoose from "mongoose";

// Windows' built-in DNS resolver often refuses TCP-fallback SRV queries that
// MongoDB Atlas requires.  Force Google's public DNS (supports SRV over both
// UDP and TCP) before any connection is attempted.
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(mongoURI, {
      dbName: "somikoroncoaching_db",
      serverSelectionTimeoutMS: 10000, // fail fast — 10 s instead of default 30 s
      connectTimeoutMS: 10000,
    });

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
    const msg = error instanceof Error ? error.message : "Unknown error";

    console.error("========================================");
    console.error("❌ Database Connection Error:");
    console.error("========================================");
    console.error(msg);

    // Give actionable guidance for the most common Atlas failures
    if (msg.includes("querySrv") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      console.error("\n🔍 Likely causes:");
      console.error("  1. Atlas cluster is PAUSED — log in to cloud.mongodb.com and resume it.");
      console.error("  2. Your IP is not whitelisted — Atlas > Network Access > Add Current IP.");
      console.error("  3. DNS/firewall blocking SRV lookups — try a different network.");
    }

    if (msg.includes("Authentication failed") || msg.includes("bad auth")) {
      console.error("\n🔍 Likely cause: wrong DB username or password in MONGODB_URI.");
    }

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
