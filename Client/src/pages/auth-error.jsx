import { AlertCircle, Home, ArrowLeft } from "lucide-react";

// Only show messages from this fixed list, never text taken from the URL
const ERROR_MESSAGES = {
  access_denied: "Google sign-in was cancelled.",
  invalid_request: "The sign-in request was invalid. Please try again.",
  session_expired: "Your sign-in session expired. Please try again.",
  server_error: "Authentication failed. Please try again.",
  account_conflict: "This email is already linked to a different Google account.",
  email_not_verified: "Your Google email address is not verified.",
};

export default function AuthErrorPage() {
  const params = new URLSearchParams(window.location.search);
  const errorMessage =
    ERROR_MESSAGES[params.get("error")] || ERROR_MESSAGES.server_error;

    return (
    <div className="auth-bg min-h-screen flex items-center justify-center relative transition-colors duration-500">
      <div className="glass-card w-full max-w-md px-8 py-12 dark:ring-2 dark:ring-red-600/50 animate-in fade-in zoom-in duration-600">
        <div className="flex justify-center mb-6 animate-in zoom-in duration-500 delay-300">
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
          Authentication Failed
        </h2>

        <p className="text-gray-600 dark:text-slate-400 mb-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
          {errorMessage}
        </p>

        <div className="space-y-3 animate-in fade-in duration-500 delay-600">
          <button
            onClick={() => window.location.href = "/login"}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>

          <button
            onClick={() => window.location.href = "/"}
            className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-3 rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Home
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-500 text-center mt-6">
          If the problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}