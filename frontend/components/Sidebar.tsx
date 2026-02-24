import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, User, TrendingUp, Video } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Browse", href: "/browse", icon: Compass },
  { name: "VODs", href: "/vods", icon: Video },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Following", href: "/following", icon: TrendingUp }
];

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar = ({ onNavigate }: SidebarProps = {}) => {
  const location = usePathname();

  return (
    <aside className="w-full lg:w-64 bg-gray-850 lg:border-r border-gray-700 p-4 min-h-screen">
      <nav className="space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-gray-700 text-white font-medium"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
