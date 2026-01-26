import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import onboardingRoutes from "./routes/onboarding.routes.js";
import claimCheckRoutes from "./routes/claimCheck.routes.js";
import claimRoutes from "./routes/claim.routes.js";
import insurerRoutes from "./routes/insurer.routes.js";

const app = express();

const allowedOrigins = [
  "http://192.168.128.13:5173",
  "http://192.168.26.13:5173",
  "http://192.168.72.12:5173",
  "http://192.168.128.13:5174",
  "https://insurance-saathi-front.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "token"],
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/upload", uploadRoutes);
app.use("/onboarding", onboardingRoutes);
app.use("/check", claimCheckRoutes);
app.use("/claim", claimRoutes);
app.use("/insurer", insurerRoutes);

app.get("/", (req, res) => {
  res.send("Welcome Aboard!");
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    error: `Cannot ${req.method} ${req.path}`,
  });
});

// Global error handler - must be last
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  console.error("Error stack:", err.stack);
  console.error("Request URL:", req.url);
  console.error("Request method:", req.method);

  // If response was already sent, don't try to send another
  if (res.headersSent) {
    return next(err);
  }

  // Always return JSON, never HTML
  res.status(err.status || err.statusCode || 500).json({
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
