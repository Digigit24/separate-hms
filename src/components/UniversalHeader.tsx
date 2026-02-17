import { Settings, User, LogOut, ChevronDown, Sun, Moon, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { authService } from "@/services/authService";
import { useWebSocket } from "@/context/WebSocketProvider";
import { useIsMobile } from "@/hooks/use-is-mobile";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/inbox": "Inbox",
  "/opd": "OPD",
  "/patients": "Patient Master",
  "/opd/consultation": "OPD Consultations",
};

const getDynamicTitle = (pathname: string): string | null => {
  if (pathname.startsWith("/opd/consultation/")) return "OPD Consultations";
  if (pathname.startsWith("/patients/") && pathname !== "/patients") return "Patient Details Page";
  return null;
};

interface UniversalHeaderProps {
  onMenuClick: () => void;
}

export const UniversalHeader = ({ onMenuClick }: UniversalHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { newMessageCount, clearNewMessageCount, socketStatus } = useWebSocket();
  const isMobile = useIsMobile();

  const getPageTitle = (): string => {
    const exactMatch = routeTitles[location.pathname];
    if (exactMatch) return exactMatch;
    const dynamicMatch = getDynamicTitle(location.pathname);
    if (dynamicMatch) return dynamicMatch;
    return "HMS";
  };

  const pageTitle = getPageTitle();

  const handleThemeToggle = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    authService.updateUserPreferences({ theme: newTheme });
  };

  const handleNotificationClick = () => {
    navigate('/whatsapp/chats');
    clearNewMessageCount();
  };

  return (
    <header className="h-12 border-b border-border bg-background px-4 flex items-center justify-between shrink-0">
      {/* Left */}
      <div className="flex items-center gap-2.5">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="p-1.5 rounded-md hover:bg-accent transition-colors"
          >
            <Menu className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <h1 className="text-[14px] font-semibold text-foreground">{pageTitle}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* WebSocket Status */}
        <div className="flex items-center gap-1.5 px-2" title={`WebSocket: ${socketStatus}`}>
          <div className={`h-1.5 w-1.5 rounded-full ${
            socketStatus === 'open' ? 'bg-green-500' :
            socketStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
            socketStatus === 'error' ? 'bg-red-500' :
            'bg-neutral-400'
          }`} />
          <span className="text-[11px] text-muted-foreground hidden md:inline">
            {socketStatus === 'open' ? 'Connected' :
             socketStatus === 'connecting' ? 'Connecting...' :
             socketStatus === 'error' ? 'Error' :
             'Disconnected'}
          </span>
        </div>

        {/* Notifications */}
        <button
          onClick={handleNotificationClick}
          className="relative p-1.5 rounded-md hover:bg-accent transition-colors"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {newMessageCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-foreground text-background text-[9px] font-medium flex items-center justify-center">
              {newMessageCount}
            </span>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={handleThemeToggle}
          className="relative p-1.5 rounded-md hover:bg-accent transition-colors"
        >
          <Sun className="h-4 w-4 text-muted-foreground rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute top-1.5 left-1.5 h-4 w-4 text-muted-foreground rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent transition-colors ml-1">
              <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                <User className="w-3 h-3 text-neutral-600 dark:text-neutral-300" />
              </div>
              <span className="hidden md:inline text-[12px] text-foreground font-medium">
                {user?.first_name || user?.email?.split('@')[0] || 'User'}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="space-y-0.5">
                <p className="text-[12px] font-medium">{user?.email}</p>
                <p className="text-[11px] text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-[12px]">
              <User className="mr-2 h-3.5 w-3.5" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-[12px]">
              <Settings className="mr-2 h-3.5 w-3.5" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-[12px] text-red-600 focus:text-red-600"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
