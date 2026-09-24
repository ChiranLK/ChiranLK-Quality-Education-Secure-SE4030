import express from "express";
import { protect, authorizePermissions } from "../Middleware/authMiddleware.js";
import {
  submitFeedback,
  getMyFeedbacks,
  getTutorFeedbacks,
  getTutorRatingStats,
  deleteFeedback,
  getAllFeedbacks,
  updateFeedbackAdmin,
  createFeedbackAdmin,
} from "../Controllers/feedbackController.js";

const router = express.Router();

router.post("/", protect, submitFeedback);
router.post("/admin/create", protect, authorizePermissions("admin"), createFeedbackAdmin);
router.get("/", protect, authorizePermissions("admin"), getAllFeedbacks);
router.get("/me", protect, getMyFeedbacks);

// rating stats can be used by students to view tutor ratings
router.get("/tutor/:tutorId/ratings", protect, getTutorRatingStats);

// full feedback list (restricted to tutor self/admin)
router.get("/tutor/:tutorId", protect, getTutorFeedbacks);

router.put("/admin/:id", protect, authorizePermissions("admin"), updateFeedbackAdmin);
router.delete("/:id", protect, deleteFeedback);

export default router;
