import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Play, Zap, Users, Video, TrendingUp, Shield, MessageCircle, Star, Check, ArrowRight, BarChart3, Sparkles, Tv, Radio } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0  overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-accent-purple/30 via-accent-pink/20 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-accent-blue/20 via-accent-purple/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-accent-pink/10 to-accent-orange/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-40">
          <div className="text-center">
            {/* Badge */}
            <div className="mb-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-purple/20 to-accent-pink/20 border border-accent-purple/30 rounded-full backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-purple opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-purple"></span>
                </span>
                <span className="bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent font-semibold text-sm">
                  Join 50,000+ creators streaming live
                </span>
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="text-6xl md:text-8xl font-bold mb-6 animate-fade-in leading-tight">
              <span className="bg-gradient-to-r from-accent-purple via-accent-pink to-accent-orange bg-clip-text text-transparent">
                Go Live.
              </span>
              <br />
              <span className="text-text-primary">Build Your Empire.</span>
            </h1>

            <p className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto mb-10 animate-fade-in leading-relaxed">
              The ultimate platform for creators who want to build, grow, and monetize their audience through stunning HD live streams.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in">
              <Button
                size="lg"
                className="inline-flex items-center justify-center text-lg px-10 py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl shadow-accent-purple/50 hover:shadow-accent-purple/70 hover:scale-105 transition-all rounded-lg text-white font-semibold"
                asChild
              >
                <Link href="/register">
                  Start Streaming Free
                  <Play className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-10 py-6 border-2 hover:bg-surface hover:border-accent-purple/50" 
                asChild
              >
                <Link href="/browse">Watch Live Streams</Link>
              </Button>
            </div>

            {/* Feature Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-32">
              <div className="group">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent mb-2">
                  99.9%
                </div>
                <p className="text-text-secondary">Uptime Guaranteed</p>
              </div>
              <div className="group">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent mb-2">
                  &lt;1s
                </div>
                <p className="text-text-secondary">Ultra-Low Latency</p>
              </div>
              <div className="group">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent-pink to-accent-orange bg-clip-text text-transparent mb-2">
                  4K
                </div>
                <p className="text-text-secondary">Quality Streaming</p>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              <div className="group relative bg-gradient-to-br from-card to-surface border border-border/50 rounded-3xl p-8 hover:shadow-2xl hover:shadow-accent-purple/20 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-accent-purple to-accent-pink rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-lg shadow-accent-purple/30">
                    <Video className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary mb-3">
                    Professional Streaming
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    Broadcast in stunning 4K quality with enterprise-grade infrastructure and zero buffering.
                  </p>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-card to-surface border border-border/50 rounded-3xl p-8 hover:shadow-2xl hover:shadow-accent-blue/20 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-accent-blue to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-lg shadow-accent-blue/30">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary mb-3">
                    Engaged Community
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    Build meaningful relationships with real-time chat, reactions, and interactive features.
                  </p>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-card to-surface border border-border/50 rounded-3xl p-8 hover:shadow-2xl hover:shadow-accent-pink/20 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-pink/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-accent-pink to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-lg shadow-accent-pink/30">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-text-primary mb-3">
                    Instant Go-Live
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    One click to start streaming. No complex setup, no technical headaches. Just create.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 md:py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-4">
              How It Works
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Get started with streaming in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-purple to-accent-pink rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">Create Account</h3>
              <p className="text-text-secondary">
                Sign up for free and set up your streaming profile in minutes
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-blue to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">Configure Stream</h3>
              <p className="text-text-secondary">
                Set up your stream settings and customize your channel
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-pink to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">Go Live</h3>
              <p className="text-text-secondary">
                Start streaming and connect with your audience worldwide
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Features Grid */}
      <div className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-purple/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-4 py-2 bg-accent-purple/10 border border-accent-purple/20 rounded-full">
              <span className="text-accent-purple font-semibold text-sm">✨ Advanced Tools</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Professional streaming tools designed to help you grow and engage your community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:border-accent-purple/30 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-purple to-accent-pink rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Live Chat</h3>
              <p className="text-text-secondary text-sm">
                Engage with your audience in real-time with moderation tools and custom emotes
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:border-accent-blue/30 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-blue to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Analytics</h3>
              <p className="text-text-secondary text-sm">
                Track your growth with detailed insights and viewer engagement metrics
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:border-accent-green/30 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-green to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Tv className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Multi-Stream</h3>
              <p className="text-text-secondary text-sm">
                Broadcast to multiple platforms simultaneously and reach more viewers
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:border-accent-pink/30 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-pink to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Custom Overlays</h3>
              <p className="text-text-secondary text-sm">
                Personalize your stream with custom graphics, alerts, and branding
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:border-accent-orange/30 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-orange to-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Radio className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">HD Quality</h3>
              <p className="text-text-secondary text-sm">
                Stream in 1080p or 4K with ultra-low latency for the best quality
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:border-accent-purple/30 transition-all duration-300 group">
              <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Security</h3>
              <p className="text-text-secondary text-sm">
                Enterprise-grade security with encryption and privacy controls
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:border-accent-blue/30 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Growth Tools</h3>
              <p className="text-text-secondary text-sm">
                Discover new audiences with recommendations and cross-promotion
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:border-accent-pink/30 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Community</h3>
              <p className="text-text-secondary text-sm">
                Build and manage your community with followers, subscribers, and fans
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-20 md:py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-text-primary mb-4">
              Loved by Streamers
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Join thousands of content creators who trust StreamApp
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-accent-orange fill-accent-orange" />
                ))}
              </div>
              <p className="text-text-secondary mb-4">
                "StreamApp has completely transformed how I connect with my audience. The platform is intuitive and reliable."
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-pink rounded-full"></div>
                <div>
                  <div className="font-semibold text-text-primary">Alex Chen</div>
                  <div className="text-sm text-text-secondary">Gaming Streamer</div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-accent-orange fill-accent-orange" />
                ))}
              </div>
              <p className="text-text-secondary mb-4">
                "The best streaming platform I've used. Great features, amazing community, and excellent support."
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent-blue to-blue-600 rounded-full"></div>
                <div>
                  <div className="font-semibold text-text-primary">Sarah Johnson</div>
                  <div className="text-sm text-text-secondary">Music Artist</div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-accent-orange fill-accent-orange" />
                ))}
              </div>
              <p className="text-text-secondary mb-4">
                "StreamApp makes it so easy to go live. I've grown my audience by 300% in just 3 months!"
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent-pink to-pink-600 rounded-full"></div>
                <div>
                  <div className="font-semibold text-text-primary">Mike Rodriguez</div>
                  <div className="text-sm text-text-secondary">Tech Educator</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 md:py-32 relative overflow-hidden">
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative border-3 border-accent-purple/30 rounded-[2.5rem] shadow-2xl  overflow-hidden ">
            <div className="bg-background p-12 md:p-20 text-center">
              <div className="inline-block mb-6 px-4 py-2 bg-gradient-to-r from-accent-purple/20 to-accent-pink/20 border border-accent-purple/30 rounded-full">
                <span className="bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent font-semibold text-sm">
                  ✨ No Credit Card Required
                </span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-accent-purple via-accent-pink to-accent-orange bg-clip-text text-transparent">
                  Your Streaming Journey
                </span>
                <br />
                <span className="text-text-primary">Starts Here</span>
              </h2>
              
              <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
                Join 50,000+ creators who are building their brands and connecting with millions of viewers worldwide
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  variant="default"
                  size="lg"
                  className="text-lg px-12 py-7 shadow-2xl shadow-accent-purple/50 hover:scale-105"
                  asChild
                >
                  <Link href="/register">
                    Start For Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-12 py-7 border-2 hover:bg-surface hover:border-accent-purple/50"
                  asChild
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>

              <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-accent-green" />
                  <span>Free Forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-accent-green" />
                  <span>No Setup Fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-accent-green" />
                  <span>Cancel Anytime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent mb-4">
                StreamApp
              </h3>
              <p className="text-text-secondary text-sm">
                Your platform for live streaming and building communities.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><Link href="/browse" className="hover:text-accent-purple transition-colors">Browse Streams</Link></li>
                <li><Link href="/dashboard" className="hover:text-accent-purple transition-colors">Dashboard</Link></li>
                <li><a href="#" className="hover:text-accent-purple transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-accent-purple transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-accent-purple transition-colors">About</a></li>
                <li><a href="#" className="hover:text-accent-purple transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-accent-purple transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-accent-purple transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-text-primary mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li><a href="#" className="hover:text-accent-purple transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-accent-purple transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-accent-purple transition-colors">Guidelines</a></li>
                <li><a href="#" className="hover:text-accent-purple transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-text-secondary">
            <p>&copy; 2024 StreamApp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;