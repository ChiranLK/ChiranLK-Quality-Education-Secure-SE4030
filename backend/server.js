import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import emailRoutes from "./Routes/emailRoutes.js";

import connectDB from "./Config/db.js";
import { errorHandler } from "./Middleware/errorHandler.js";
import { sanitizeProductionErrorResponses } from "./Middleware/errorResponseSanitizer.js";
import { logSafeError } from "./utils/safeLogger.js";

// Routes
import authRouter from "./Routes/authRouter.js";
import feedbackRouter from "./Routes/feedbackRouter.js";
import progressRouter from "./Routes/progressRouter.js";
import feedbackEmailRoutes from "./Routes/feedbackEmailRoutes.js";
import messageRouter from "./Routes/messageRouter.js";
import tutoringSessionRouter from "./Routes/tutoringSessionRouter.js";
import googleCalendarRouter from "./Routes/googleCalenderRouter.js";
import googleOAuthRouter from "./Routes/googleOAuthRouter.js";
import tutorRouter from "./Routes/tutorRouter.js";
import materialRouter from "./Routes/materialRouter.js";

// Google Calendar
import { initCalendar } from "./services/googleCalendarService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware — allow the deployed frontend URL and localhost in dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({
  origin: (origin, callback) => {
    // allow non-browser tools, FRONTEND_URL, and any local host/port origin
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeProductionErrorResponses);

// Serve uploaded files (profile pictures etc.) as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to AF Backend API" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ message: "Server is working" });
});

app.use("/api/auth", authRouter);
app.use("/api/feedbacks", feedbackRouter);
app.use("/api/progress", progressRouter);
app.use("/api/email", emailRoutes);
app.use("/api/email", feedbackEmailRoutes);
app.use("/api/messages", messageRouter);
app.use("/api/tutoring-sessions", tutoringSessionRouter);
app.use("/api/tutors", tutorRouter);
app.use("/api/materials", materialRouter);
app.use("/api/google-oauth", googleOAuthRouter);
app.use("/api/google-calendar", googleCalendarRouter);  // ← ADD THIS LINE

// Init Google Calendar
initCalendar();

// Error Handler Middleware - MUST be last
app.use(errorHandler);

// Validate critical environment configuration safely (without logging secrets)
if (!process.env.JWT_SECRET) {
  console.warn("⚠️ Warning: JWT_SECRET environment variable is not defined. Authentication will fail until set.");
}
console.log("Environment configuration status:", {
  jwtSecretConfigured: !!process.env.JWT_SECRET,
  googleClientIdConfigured: !!process.env.GOOGLE_CLIENT_ID,
  googleRefreshTokenConfigured: !!process.env.GOOGLE_REFRESH_TOKEN,
  cloudinaryConfigured: !!process.env.CLOUDINARY_CLOUD_NAME,
});

// Port
const PORT = process.env.PORT || 5000;

// Start server immediately
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB().catch(err => logSafeError("database_startup_failed", err, { statusCode: 500 }));
});
