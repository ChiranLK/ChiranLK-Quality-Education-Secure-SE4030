import { sendMail } from "../services/mailService.js";
import { logSafeError } from "../utils/safeLogger.js";

export const sendTestEmail = async (req, res) => {
  try {
    await sendMail({
      to: "test@example.com",
      subject: "Test Email",
      text: "This is a test email from MERN app (Mailtrap sandbox)."
    });

    res.json({ message: "Email sent (check Mailtrap inbox)" });
  } catch (err) {
    logSafeError("test_email_failed", err, { statusCode: 500 });
    res.status(500).json({
      message: "Failed to send email"
    });
  }
};
