"use client";
import { useState, Suspense } from "react";
import { Lock } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || 'Invalid or expired link');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="text-center py-4 space-y-2">
      <p className="text-accent-red">Invalid reset link.</p>
      <Link href="/forgot-password" className="text-primary hover:text-accent-hover font-semibold transition-colors inline-block">
        Request a new one
      </Link>
    </div>
  );

  if (done) return (
    <div className="text-center py-4 space-y-2">
      <p className="text-accent-green font-semibold">Password reset successfully!</p>
      <p className="text-sm text-text-muted">Redirecting to login...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col">
        <Label htmlFor="password" className="mb-1.5 text-xs font-medium text-text-secondary">New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            type="password"
            id="password"
            placeholder="Enter new password"
            className="h-11 pl-10 bg-elevated/60 border-border focus:border-primary text-text-primary placeholder:text-text-muted"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col">
        <Label htmlFor="confirm" className="mb-1.5 text-xs font-medium text-text-secondary">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            type="password"
            id="confirm"
            placeholder="Confirm new password"
            className="h-11 pl-10 bg-elevated/60 border-border focus:border-primary text-text-primary placeholder:text-text-muted"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>

      {error && <p className="text-accent-red text-xs">{error}</p>}

      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className="w-full h-11 rounded-lg btn-primary text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {loading ? 'Resetting...' : 'Reset password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
        <span className="text-sm text-text-tertiary">Set a new password</span>
      </div>

      <div className="relative rounded-2xl border border-border bg-surface/60 backdrop-blur-xl p-8 mx-4 w-full max-w-md shadow-card">
        <div className="mb-6">
          <p className="text-2xl font-bold tracking-tight text-text-primary">Reset password</p>
          <span className="text-sm text-text-tertiary">
            Enter your new password below
          </span>
        </div>
        <Suspense fallback={<div className="text-text-muted text-sm">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
