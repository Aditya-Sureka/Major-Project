import app from "./app.js";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;

/**
 * To establish connection with mongoDB database
 * @returns {Promise<Void>}
 * @throws {Error}
 */

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.log(error);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  // Don't exit the process, just log it
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1); // Exit on uncaught exceptions
});

connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`app is listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
