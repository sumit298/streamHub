import { useState } from "react";
import { Search, Bell, User, Menu, X } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";
import { Input } from "./input";
import { CreateStreamDialog } from "../CreateStreamDialog";
import { useAuth } from "@/lib/AuthContext";
import { NotificationBell } from "../NotificationBell";
import { Sidebar } from "../Sidebar";

export const Navbar = () => {
  const [isCreateStreamOpen, setIsCreateStreamOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const getInitials = (username?: string) => {
    if (!username) return "U";
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <nav className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-white hover:text-gray-300 transition"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <img src="/favicon.svg" alt="StreamHub" className="h-10 w-10" />
              <div className="text-2xl font-bold text-white">
                StreamHub
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="default" 
                className="font-semibold cursor-pointer"
                onClick={() => setIsCreateStreamOpen(true)}
              >
                Go Live
              </Button>
              <NotificationBell />
              <Link
                href="/profile"
                title={user?.username || "Profile"}
                className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center text-white font-semibold text-sm hover:bg-gray-600 transition"
              >
                {getInitials(user?.username)}
              </Link>
            </div>
          </div>
        </div>
        <CreateStreamDialog open={isCreateStreamOpen} onOpenChange={setIsCreateStreamOpen} />
      </nav>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-16 bottom-0 w-64 bg-gray-850 border-r border-gray-700 p-4 overflow-y-auto">
            <Sidebar onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};