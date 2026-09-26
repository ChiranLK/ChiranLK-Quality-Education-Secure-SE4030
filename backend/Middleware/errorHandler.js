/**
 * Centralized Error Handler Middleware
 * Must be defined LAST in middleware stack (after all routes)
 */
import { logSafeError } from "../utils/safeLogger.js";
import { GENERIC_SERVER_ERROR } from "./errorResponseSanitizer.js";

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = statusCode >= 500
    ? GENERIC_SERVER_ERROR
    : err.message || "Request failed";
  let errors;

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((error) => error.message);
  }

  // Mongoose cast error (invalid ID)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier format";
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    statusCode = 400;
    message = field ? `${field} already exists` : "Resource already exists";
  }

  const routePattern = req.route?.path
    ? `${req.baseUrl || ""}${req.route.path}`
    : "unmatched_route";

  logSafeError("request_failed", err, {
    method: req.method,
    route: routePattern,
    statusCode,
  });

  const errorResponse = {
    success: false,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  if (errors) errorResponse.errors = errors;

  res.status(statusCode).json(errorResponse);
};

export { errorHandler };
