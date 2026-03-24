"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { api } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center flex-col h-screen bg-linear-to-br from-accent-purple/10 via-background to-accent-pink/10">
      <div className="flex items-center flex-col justify-center mb-4">
        <div className="flex items-center gap-3 mb-2">
          <img src="/favicon.svg" alt="StreamHub" className="h-10 w-10" />
          <h1 className="text-4xl font-bold text-white">StreamHub</h1>
        </div>
        <span className="text-sm text-gray-600">Reset your password</span>
      </div>

      <div className="rounded-md border border-white/10 p-6 mx-4 mt-4 w-full sm:w-96 md:w-1/2 lg:w-1/3 shadow-lg max-w-md bg-white/5 backdrop-blur-xl">
        <div className="mb-7">
          <p className="text-2xl font-bold">Forgot password?</p>
          <span className="text-sm text-gray-600">
            Enter your email and we'll send you a reset link
          </span>
        </div>

        {sent ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-emerald-400 font-semibold">Check your email for a reset link.</p>
            <p className="text-sm text-gray-500">Didn't receive it? Check your spam folder.</p>
            <Link href="/login" className="text-sm text-emerald-500 font-semibold hover:underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col">
              <Label htmlFor="email" className="mb-2">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-emerald-600 hover:bg-emerald-700 font-semibold"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>

            <p className="text-center text-sm mt-3">
              Remember your password?{' '}
              <Link href="/login" className="text-emerald-500 font-semibold">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
