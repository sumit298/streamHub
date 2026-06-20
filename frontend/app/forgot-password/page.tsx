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
        <span className="text-sm text-text-tertiary">Reset your password</span>
      </div>

      <div className="relative rounded-2xl border border-border bg-surface/60 backdrop-blur-xl p-8 mx-4 w-full max-w-md shadow-card">
        <div className="mb-6">
          <p className="text-2xl font-bold tracking-tight text-text-primary">Forgot password?</p>
          <span className="text-sm text-text-tertiary">
            Enter your email and we'll send you a reset link
          </span>
        </div>

        {sent ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-accent-green font-semibold">Check your email for a reset link.</p>
            <p className="text-sm text-text-muted">Didn't receive it? Check your spam folder.</p>
            <Link href="/login" className="text-sm text-primary hover:text-accent-blue font-semibold transition-colors inline-block">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col">
              <Label htmlFor="email" className="mb-1.5 text-xs font-medium text-text-secondary">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <Input
                  type="email"
                  id="email"
                  placeholder="you@example.com"
                  className="h-11 pl-10 bg-elevated/60 border-border focus:border-primary text-text-primary placeholder:text-text-muted"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="text-accent-red text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full h-11 rounded-lg btn-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>

            <p className="text-center text-sm text-text-tertiary pt-4 border-t border-border">
              Remember your password?{' '}
              <Link href="/login" className="text-primary hover:text-accent-hover font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
