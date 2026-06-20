import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Play,
  Zap,
  Users,
  Video,
  TrendingUp,
  Shield,
  MessageCircle,
  Star,
  Check,
  ArrowRight,
  BarChart3,
  Sparkles,
  Tv,
  Radio,
} from "lucide-react";

export const metadata = {
  title: "StreamHub — Go Live. Build Your Empire.",
  description:
    "The premium platform for creators to stream, grow, and monetize in stunning HD.",
};

const Home = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Nav */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent-blue grid place-items-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight">StreamHub</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
            <a href="#features" className="hover:text-foreground transition">
              Features
            </a>
            <a href="#how" className="hover:text-foreground transition">
              How it works
            </a>
            <a
              href="#testimonials"
              className="hover:text-foreground transition"
            >
              Creators
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-text-secondary hover:text-foreground transition"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        {/* Aurora background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-150 h-150 rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute top-40 -right-40 w-125 h-125 rounded-full bg-accent-blue/15 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(2,132,199,0.15),transparent_60%)]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-32">
          {/* Badge */}
          <div className="flex justify-center fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border-hover bg-surface/60 backdrop-blur text-xs text-text-secondary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-red" />
              </span>
              Join creators streaming live
            </div>
          </div>

          {/* Heading */}
          <h1 className="mt-8 text-center text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05]">
            <span className="block text-foreground">Go Live.</span>
            <span className="block gradient-text">Build Your Empire.</span>
          </h1>

          <p className="mt-8 max-w-2xl mx-auto text-center text-lg text-text-secondary leading-relaxed">
            The ultimate platform for creators who want to build, grow, and
            monetize their audience through stunning HD live streams.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="btn-primary px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2"
            >
              Start Streaming Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl font-medium border border-border-hover bg-surface/40 backdrop-blur hover:bg-elevated transition inline-flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Watch Live Streams
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { v: "99.9%", l: "Uptime Guaranteed" },
              { v: "<1s", l: "Ultra-Low Latency" },
              { v: "4K", l: "Quality Streaming" },
            ].map((s) => (
              <div
                key={s.l}
                className="text-center p-6 rounded-2xl border border-border bg-surface/40 backdrop-blur"
              >
                <div className="text-4xl font-bold gradient-text">{s.v}</div>
                <div className="mt-1 text-sm text-text-tertiary">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Feature cards */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                i: Video,
                t: "Professional Streaming",
                d: "Broadcast in stunning 4K with enterprise-grade infrastructure and zero buffering.",
              },
              {
                i: Users,
                t: "Engaged Community",
                d: "Build meaningful relationships with real-time chat, reactions, and interactive features.",
              },
              {
                i: Zap,
                t: "Instant Go-Live",
                d: "One click to start streaming. No complex setup, no technical headaches. Just create.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="card-hover p-6 rounded-2xl border border-border bg-surface/60 backdrop-blur"
              >
                <div className="w-11 h-11 rounded-xl bg-linear-to-br from-primary to-accent-blue grid place-items-center mb-4">
                  <c.i className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold">{c.t}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                  {c.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              How It Works
            </h2>
            <p className="mt-4 text-text-secondary">
              Get started with streaming in three simple steps
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />
            {[
              {
                n: "1",
                t: "Create Account",
                d: "Sign up for free and set up your streaming profile in minutes",
              },
              {
                n: "2",
                t: "Configure Stream",
                d: "Set up your stream settings and customize your channel",
              },
              {
                n: "3",
                t: "Go Live",
                d: "Start streaming and connect with your audience worldwide",
              },
            ].map((s) => (
              <div key={s.n} className="text-center relative">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-accent-blue grid place-items-center text-2xl font-bold shadow-[0_0_32px_rgba(2,132,199,0.4)]">
                  {s.n}
                </div>
                <h3 className="mt-5 text-xl font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-text-secondary max-w-xs mx-auto">
                  {s.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced features */}
      <section id="features" className="relative py-28 border-t border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(2,132,199,0.08),transparent_50%)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-hover bg-surface/60 text-xs text-text-secondary">
              <Sparkles className="w-3 h-3 text-primary" />
              Advanced Tools
            </div>
            <h2 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
              Everything You Need{" "}
              <span className="gradient-text">to Succeed</span>
            </h2>
            <p className="mt-4 text-text-secondary">
              Professional streaming tools designed to help you grow and engage
              your community
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                i: MessageCircle,
                t: "Live Chat",
                d: "Engage your audience with moderation tools and custom emotes",
              },
              {
                i: BarChart3,
                t: "Analytics",
                d: "Track growth with detailed insights and engagement metrics",
              },
              {
                i: Tv,
                t: "Multi-Stream",
                d: "Broadcast to multiple platforms simultaneously",
              },
              {
                i: Sparkles,
                t: "Custom Overlays",
                d: "Personalize streams with graphics, alerts, and branding",
              },
              {
                i: Video,
                t: "HD Quality",
                d: "1080p or 4K with ultra-low latency",
              },
              {
                i: Shield,
                t: "Security",
                d: "Enterprise-grade encryption and privacy controls",
              },
              {
                i: TrendingUp,
                t: "Growth Tools",
                d: "Discover new audiences with recommendations",
              },
              {
                i: Users,
                t: "Community",
                d: "Manage followers, subscribers, and fans",
              },
            ].map((f) => (
              <div
                key={f.t}
                className="card-hover p-5 rounded-xl border border-border bg-surface/60 backdrop-blur"
              >
                <div className="w-10 h-10 rounded-lg bg-elevated grid place-items-center mb-3 border border-border-hover">
                  <f.i className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">{f.t}</h3>
                <p className="mt-1.5 text-xs text-text-tertiary leading-relaxed">
                  {f.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Loved by Streamers
            </h2>
            <p className="mt-4 text-text-secondary">
              Join thousands of creators who trust StreamHub
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                q: "StreamHub has completely transformed how I connect with my audience. The platform is intuitive and reliable.",
                n: "Alex Chen",
                r: "Gaming Streamer",
              },
              {
                q: "The best streaming platform I've used. Great features, amazing community, and excellent support.",
                n: "Sarah Johnson",
                r: "Music Artist",
              },
              {
                q: "StreamHub makes it so easy to go live. I've grown my audience by 300% in just 3 months!",
                n: "Mike Rodriguez",
                r: "Tech Educator",
              },
            ].map((t) => (
              <div
                key={t.n}
                className="card-hover p-6 rounded-2xl border border-border bg-surface/60 backdrop-blur"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-text-secondary leading-relaxed">"{t.q}"</p>
                <div className="mt-5 flex items-center gap-3 pt-5 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-accent-blue grid place-items-center text-sm font-semibold">
                    {t.n[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.n}</div>
                    <div className="text-xs text-text-tertiary">{t.r}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border-hover bg-linear-to-br from-surface to-elevated p-12 md:p-16 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(2,132,199,0.18),transparent_60%)] pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-hover bg-background/40 text-xs text-text-secondary">
                <Sparkles className="w-3 h-3 text-primary" />
                No Credit Card Required
              </div>
              <h2 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                <span className="gradient-text">Your Streaming Journey</span>
                <br />
                Starts Here
              </h2>
              <p className="mt-6 max-w-xl mx-auto text-text-secondary">
                Join 50,000+ creators who are building their brands and
                connecting with millions of viewers worldwide
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/register"
                  className="btn-primary px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2"
                >
                  Start For Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-xl font-medium border border-border-hover bg-background/40 hover:bg-elevated transition"
                >
                  Sign In
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-text-tertiary">
                {["Free Forever", "No Setup Fees", "Cancel Anytime"].map(
                  (x) => (
                    <div key={x} className="inline-flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      {x}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent-blue grid place-items-center">
                  <Radio className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold">StreamHub</span>
              </div>
              <p className="mt-3 text-sm text-text-tertiary max-w-xs">
                Your platform for live streaming and building communities.
              </p>
            </div>
            {[
              {
                h: "Product",
                l: ["Browse Streams", "Dashboard", "Features", "Pricing"],
              },
              { h: "Company", l: ["About", "Blog", "Contact"] },
              { h: "Legal", l: ["Privacy", "Terms", "Guidelines", "Cookies"] },
            ].map((c) => (
              <div key={c.h}>
                <h4 className="text-sm font-semibold">{c.h}</h4>
                <ul className="mt-3 space-y-2 text-sm text-text-tertiary">
                  {c.l.map((i) => (
                    <li key={i}>
                      <a href="#" className="hover:text-foreground transition">
                        {i}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-6 border-t border-border text-center text-xs text-text-muted">
            © {new Date().getFullYear()} StreamHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
