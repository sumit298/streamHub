"use client";

import { Lock, Mail, User, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuth, api } from "@/lib/AuthContext";
import toast from "react-hot-toast";

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, { message: "Username must be at least 3 characters" })
      .max(20, { message: "Username must be less than 20 characters" })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Username can only contain letters, numbers, and underscores",
      }),
    email: z
      .string()
      .trim()
      .email({ message: "Please enter a valid email address" })
      .max(255, { message: "Email must be less than 255 characters" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(100, { message: "Password must be less than 100 characters" })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const Register = () => {
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const router = useRouter();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async () => {
    try {
      registerSchema.parse(registerData);
      setIsLoading(true);

      const apiData = {
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
      };

      const registerResult = await api.post("/api/auth/register", apiData);

      if (registerResult.data) {
        // Auto-login after registration
        await login(registerData.email, registerData.password);

        setRegisterData({
          email: "",
          username: "",
          password: "",
          confirmPassword: "",
        });

        toast.success("Account created successfully!");
        router.push("/dashboard");
      }

      // reset the state

      // Handle successful registration here
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const newErrors = {
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
        };
        error.issues.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof typeof newErrors] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        // Handle API errors (409 for duplicate user, 500, etc.)
        const errorData = error?.response?.data;
        let errorMessage = "Registration failed. Please try again.";

        if (typeof errorData === "string") {
          errorMessage = errorData;
        } else if (errorData?.error?.message) {
          // Backend sends: { success: false, error: { message, code, statusCode } }
          errorMessage = errorData.error.message;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error && typeof errorData.error === "string") {
          errorMessage = errorData.error;
        }

        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center flex-col min-h-screen bg-background relative overflow-hidden py-12">
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
          Create your account and Start Streaming
        </span>
      </div>

      <div className="relative rounded-2xl border border-border bg-surface/60 backdrop-blur-xl p-8 mx-4 w-full max-w-md shadow-card">
        <div className="mb-6">
          <p className="text-2xl font-bold tracking-tight text-text-primary">
            Get Started
          </p>
          <span className="text-sm text-text-tertiary">
            Create your account to join community
          </span>
        </div>

        <div className="flex flex-col mb-4">
          <Label
            htmlFor="username"
            className="mb-1.5 text-xs font-medium text-text-secondary"
          >
            Username
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type="text"
              placeholder="Choose a username"
              name="username"
              id="username"
              className="h-11 pl-10 bg-elevated/60 border-border focus:border-primary text-text-primary placeholder:text-text-muted"
              onChange={(e) => handleChange(e)}
              value={registerData.username}
            />
            {errors.username && (
              <p className="mt-1.5 text-accent-red text-xs">
                {errors.username}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col mb-4">
          <Label
            htmlFor="email"
            className="mb-1.5 text-xs font-medium text-text-secondary"
          >
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type="email"
              name="email"
              id="email"
              placeholder="you@example.com"
              className="h-11 pl-10 bg-elevated/60 border-border focus:border-primary text-text-primary placeholder:text-text-muted"
              onChange={(e) => handleChange(e)}
              value={registerData.email}
            />
            {errors.email && (
              <p className="mt-1.5 text-accent-red text-xs">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col mb-4">
          <Label
            htmlFor="password"
            className="mb-1.5 text-xs font-medium text-text-secondary"
          >
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              className="h-11 pl-10 pr-10 bg-elevated/60 border-border focus:border-primary text-text-primary placeholder:text-text-muted"
              placeholder="Create a strong password"
              onChange={(e) => handleChange(e)}
              value={registerData.password}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>

            {errors.password && (
              <p className="mt-1.5 text-accent-red text-xs">
                {errors.password}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col mb-6">
          <Label
            htmlFor="confirmPassword"
            className="mb-1.5 text-xs font-medium text-text-secondary"
          >
            Confirm Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              id="confirmPassword"
              placeholder="Confirm your password"
              className="h-11 pl-10 pr-10 bg-elevated/60 border-border focus:border-primary text-text-primary placeholder:text-text-muted"
              onChange={(e) => handleChange(e)}
              value={registerData.confirmPassword}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              type="button"
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              aria-pressed={showConfirmPassword}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-accent-red text-xs">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={
            isLoading ||
            Object.values(errors).some((error) => error !== "") ||
            Object.values(registerData).some((value) => value === "")
          }
          className="w-full h-11 rounded-lg btn-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>

        <div className="pt-4 border-t border-border text-center text-sm text-text-tertiary mt-4">
          Already have an account?{" "}
          <Link
            className="text-accent-blue hover:text-accent-hover font-medium transition-colors"
            href="/login"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
