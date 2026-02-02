import { useState } from "react";
import { Search, Bell, User } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";
import { Input } from "./input";
import { CreateStreamDialog } from "../CreateStreamDialog";
import { useAuth } from "@/lib/AuthContext";
import { NotificationBell } from "../NotificationBell";

export const Navbar = () => {
  const [isCreateStreamOpen, setIsCreateStreamOpen] = useState(false);
  const { user } = useAuth();

  const getInitials = (username?: string) => {
    if (!username) return "U";
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="StreamHub" className="h-10 w-10" />
            <div className="text-2xl font-bold text-white">
              StreamHub
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center space-x-4">
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
  );
};