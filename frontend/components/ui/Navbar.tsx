import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";
import { Input } from "./input";
import { CreateStreamDialog } from "../CreateStreamDialog";
import { useAuth } from "@/lib/AuthContext";
import { NotificationBell } from "../NotificationBell";
import { Sidebar } from "../Sidebar";
import { getAvatarUrl } from "@/lib/avatar";

export const Navbar = () => {
  const [isCreateStreamOpen, setIsCreateStreamOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <nav className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-white hover:text-gray-300 transition p-1"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-1 sm:gap-2">
              <img src="/favicon.svg" alt="StreamHub" className="h-7 w-7 sm:h-10 sm:w-10" />
              <div className="text-lg sm:text-2xl font-bold text-white">
                StreamHub
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
              <Button 
                variant="default" 
                className="font-semibold cursor-pointer text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 h-8 sm:h-10"
                onClick={() => setIsCreateStreamOpen(true)}
              >
                <span className="hidden sm:inline">Go Live</span>
                <span className="sm:hidden">Live</span>
              </Button>
              <NotificationBell />
              <Link
                href="/profile"
                title={user?.username || "Profile"}
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full overflow-hidden hover:ring-2 hover:ring-gray-500 transition"
              >
                <img
                  src={getAvatarUrl(user?.avatar, user?.username)}
                  alt={user?.username || "Profile"}
                  className="w-full h-full object-cover"
                />
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