"use client";

import { Lock, Mail, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/AuthContext";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Please enter a valid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(100, { message: "Password must be less than 100 characters" }),
});

const Login = () => {
  const [loginData, setloginData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setloginData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async () => {
    try {
      loginSchema.parse(loginData);
      setIsLoading(true)

      await login(loginData.email, loginData.password);
      
      setloginData({
        email: "",
        password: "",
      });
      toast.success("Login successful!")
      router.push("/dashboard");

      // Handle successful login here
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const newErrors = {
          email: "",
          password: "",
        };
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof typeof newErrors] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        // Handle API errors (401, 500, etc.)
        const errorData = error?.response?.data;
        let errorMessage = "Login failed. Please check your credentials.";
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData?.error?.message) {
          // Backend sends: { success: false, error: { message, code, statusCode } }
          errorMessage = errorData.error.message;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        }
        
        toast.error(errorMessage);
      }
    }
    finally{
      setIsLoading(false)
    }
  };

  const handleKeyPressToLogin = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if(e.key === 'Enter' && !Object.values(loginData).some((value)=> value === "")){
      handleSubmit();
    }
  }

  return (
    <div className="flex items-center justify-center flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Arctic ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-accent-blue/8 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(2,132,199,0.06),transparent_60%)]" />
      </div>

      <div className="relative flex items-center flex-col justify-center mb-6">
        <Link href="/" className="flex items-center gap-3 mb-3 group">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shadow-glow-blue">
            <img src="/favicon.svg" alt="StreamHub" className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Stream<span className="text-primary">Hub</span>
          </h1>
        </Link>
        <span className="text-sm text-text-tertiary">
          Sign in to continue streaming
        </span>
      </div>

      <div className="relative rounded-2xl border border-border bg-surface/60 backdrop-blur-xl p-8 mx-4 w-full max-w-md shadow-card">
        <div className="mb-6">
          <p className="text-2xl font-bold tracking-tight text-text-primary">Welcome back</p>
          <span className="text-sm text-text-tertiary">
            Enter your credentials to access your account
          </span>
        </div>

        <div className="flex flex-col mb-5">
          <Label htmlFor="email" className="mb-1.5 text-xs font-medium text-text-secondary">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type="email"
              name="email"
              id="email"
              onKeyPress={handleKeyPressToLogin}
              placeholder="you@example.com"
              className="h-11 pl-10 bg-elevated/60 border-border focus:border-primary text-text-primary placeholder:text-text-muted"
              onChange={(e) => handleChange(e)}
              value={loginData.email}
            />
            {errors.email && (
              <p className="mt-1.5 text-accent-red text-xs">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col mb-5">
          <Label htmlFor="password" className="mb-1.5 text-xs font-medium text-text-secondary">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              className="h-11 pl-10 pr-10 bg-elevated/60 border-border focus:border-primary text-text-primary placeholder:text-text-muted"
              placeholder="••••••••"
              onChange={(e) => handleChange(e)}
              value={loginData.password}
              onKeyPress={handleKeyPressToLogin}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            {errors.password && (
              <p className="mt-1.5 text-accent-red text-xs">{errors.password}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={
            isLoading ||
            Object.values(errors).some((error) => error !== "") ||
            Object.values(loginData).some((value) => value === "")
          }
          className="w-full h-11 rounded-lg btn-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        <div className="text-center mt-4">
          <Link href="/forgot-password" className="text-xs text-text-tertiary hover:text-accent-blue transition-colors">
            Forgot password?
          </Link>
        </div>

        <div className="pt-4 border-t border-border text-center text-sm text-text-tertiary mt-4">
          Don't have an account?{" "}
          <Link
            className="text-accent-blue hover:text-accent-hover font-medium transition-colors"
            href="/register"
          >
            Create one now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
