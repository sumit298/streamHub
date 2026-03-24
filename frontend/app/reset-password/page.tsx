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
      <p className="text-destructive">Invalid reset link.</p>
      <Link href="/forgot-password" className="text-emerald-500 font-semibold hover:underline">
        Request a new one
      </Link>
    </div>
  );

  if (done) return (
    <div className="text-center py-4 space-y-2">
      <p className="text-emerald-400 font-semibold">Password reset successfully!</p>
      <p className="text-sm text-gray-500">Redirecting to login...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col">
        <Label htmlFor="password" className="mb-2">New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="password"
            id="password"
            placeholder="Enter new password"
            className="pl-9"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col">
        <Label htmlFor="confirm" className="mb-2">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="password"
            id="confirm"
            placeholder="Confirm new password"
            className="pl-9"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
        </div>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button
        type="submit"
        disabled={loading || !password || !confirm}
        className="w-full bg-emerald-600 hover:bg-emerald-700 font-semibold"
      >
        {loading ? 'Resetting...' : 'Reset password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center flex-col h-screen bg-linear-to-br from-accent-purple/10 via-background to-accent-pink/10">
      <div className="flex items-center flex-col justify-center mb-4">
        <div className="flex items-center gap-3 mb-2">
          <img src="/favicon.svg" alt="StreamHub" className="h-10 w-10" />
          <h1 className="text-4xl font-bold text-white">StreamHub</h1>
        </div>
        <span className="text-sm text-gray-600">Set a new password</span>
      </div>

      <div className="rounded-md border border-white/10 p-6 mx-4 mt-4 w-full sm:w-96 md:w-1/2 lg:w-1/3 shadow-lg max-w-md bg-white/5 backdrop-blur-xl">
        <div className="mb-7">
          <p className="text-2xl font-bold">Reset password</p>
          <span className="text-sm text-gray-600">
            Enter your new password below
          </span>
        </div>
        <Suspense fallback={<div className="text-gray-500 text-sm">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
