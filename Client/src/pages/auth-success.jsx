import { useEffect, useRef } from "react";
import { CheckCircle, Loader } from "lucide-react";
import customFetch from "../utils/customfetch";

export default function AuthSuccessPage() {
  const started = useRef(false);

  useEffect(() => {
    // React StrictMode runs effects twice in development.
    // The code only works once, so only send it once.
    if (started.current) return;
    started.current = true;

    const code = new URLSearchParams(window.location.search).get("code");

    // Remove the code from the address bar and browser history straight away
    window.history.replaceState({}, document.title, "/auth-success");

    if (!code) {
      window.location.replace("/auth-error?error=invalid_request");
      return;
    }

    customFetch
      .post("/google-oauth/exchange", { code })
      .then(({ data }) => {
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        window.location.replace("/");
      })
      .catch(() => {
        window.location.replace("/auth-error?error=session_expired");
      });
  }, []);

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center relative transition-colors duration-500">
      <div className="glass-card w-full max-w-md px-8 py-12 dark:ring-2 dark:ring-indigo-600/50 text-center animate-in fade-in zoom-in duration-600">
        <div className="flex justify-center mb-6 animate-in zoom-in duration-500 delay-300">
          <CheckCircle className="w-16 h-16 text-emerald-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
          Authentication Successful!
        </h2>

        <p className="text-gray-600 dark:text-slate-400 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-600">
          Redirecting you to your dashboard...
        </p>

        <div className="flex justify-center animate-spin">
          <Loader className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
      </div>
    </div>
  );
}