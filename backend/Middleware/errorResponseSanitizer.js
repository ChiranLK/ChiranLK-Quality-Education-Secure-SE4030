const GENERIC_SERVER_ERROR = "Internal Server Error";

/**
 * Last-line protection for controllers that build their own 5xx responses.
 * Production clients receive no database messages, stack traces, or paths.
 */
export const sanitizeProductionErrorResponses = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (process.env.NODE_ENV === "production" && res.statusCode >= 500) {
      return originalJson({
        success: false,
        message: GENERIC_SERVER_ERROR,
        msg: GENERIC_SERVER_ERROR,
      });
    }

    return originalJson(body);
  };

  next();
};

export { GENERIC_SERVER_ERROR };
