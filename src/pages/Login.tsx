import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import "@/styles/login-animations.css";
import logo from "@/assets/icons/1.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await login({ email, password });
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <div className="login-page-bg min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Brand Mark */}
        <div className="flex flex-col items-center mb-10 animate-fade-in-up">
          <div className="relative mb-6">
            <div className="icon-ring w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center">
              <img
                src={logo}
                alt="Celiyo HMS"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Celiyo HMS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Hospital Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card rounded-2xl p-8 animate-fade-in-up delay-200">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Sign in
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
                className="login-input h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-0 focus:border-violet-500 rounded-lg"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => {}}
                  className="text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
                  tabIndex={-1}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="login-input h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-0 focus:border-violet-500 rounded-lg pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <Alert
                variant="destructive"
                className="bg-red-50 border-red-200 text-red-900 rounded-lg animate-fade-in"
              >
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-sm text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="login-btn w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6 animate-fade-in delay-300">
          Need access?{" "}
          <button
            type="button"
            onClick={() => {}}
            className="text-slate-600 hover:text-slate-900 font-medium transition-colors underline-offset-2 hover:underline"
          >
            Contact Administrator
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
