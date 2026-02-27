import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  Users,
  Calendar,
  ClipboardList,
  Menu,
  X,
  Activity,
  FileText,
  UserCheck,
  Award,
  User,
  ClipboardPlus,
  Microscope,
  Package,
  Receipt,
  Briefcase,
  CheckSquare,
  Shield,
  Settings2,
  UserCog,
  ShieldCheck,
  Bug,
  IndianRupee,
  CreditCard,
  TrendingUp,
  Pill,
  ShoppingCart,
  BarChart3,
  Loader2,
  Bed,
  Building,
  UserRoundCheck,
  FlaskConical,
  Search,
  Home,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  badge?: number;
  children?: MenuItem[];
  module?: string;
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Home,
    path: "/",
  },
  {
    id: "hms",
    label: "HMS",
    icon: Stethoscope,
    module: "hms",
    children: [
      { id: "hms-doctors", label: "Doctors", icon: UserCheck, path: "/hms/doctors" },
      { id: "hms-specialties", label: "Specialties", icon: Award, path: "/hms/specialties" },
      { id: "hms-patients", label: "Patients", icon: User, path: "/patients" },
      { id: "hms-appointments", label: "Appointments", icon: Calendar, path: "/appointments" },
    ],
  },
  {
    id: "opd",
    label: "OPD",
    icon: ClipboardPlus,
    module: "opd",
    children: [
      { id: "opd-visits", label: "Visits", icon: ClipboardPlus, path: "/opd/visits" },
      { id: "opd-bills", label: "OPD Bills", icon: FileText, path: "/opd/bills" },
      { id: "clinical-notes", label: "Clinical Notes", icon: ClipboardList, path: "/opd/clinical-notes" },
      { id: "visit-findings", label: "Visit Findings", icon: Activity, path: "/opd/findings" },
      { id: "procedure-masters", label: "Procedures", icon: Microscope, path: "/opd/procedures" },
      { id: "procedure-packages", label: "Packages", icon: Package, path: "/opd/packages" },
      { id: "procedure-bills", label: "Procedure Bills", icon: Receipt, path: "/opd/procedure-bills" },
      { id: "opd-settings", label: "Settings", icon: Settings2, path: "/opd/settings" },
    ],
  },
  {
    id: "ipd",
    label: "IPD",
    icon: Bed,
    module: "ipd",
    children: [
      { id: "ipd-admissions", label: "Admissions", icon: UserRoundCheck, path: "/ipd/admissions" },
      { id: "ipd-wards", label: "Wards", icon: Building, path: "/ipd/wards" },
      { id: "ipd-beds", label: "Beds", icon: Bed, path: "/ipd/beds" },
      { id: "ipd-billing", label: "IPD Billing", icon: Receipt, path: "/ipd/billing" },
    ],
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    icon: FlaskConical,
    module: "diagnostics",
    children: [
      { id: "diagnostics-requisitions", label: "Requisitions", icon: ClipboardList, path: "/diagnostics/requisitions" },
      { id: "diagnostics-investigations", label: "Investigations", icon: Microscope, path: "/diagnostics/investigations" },
      { id: "diagnostics-lab-reports", label: "Lab Reports", icon: FileText, path: "/diagnostics/lab-reports" },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: IndianRupee,
    module: "payments",
    children: [
      { id: "payment-transactions", label: "Transactions", icon: CreditCard, path: "/payments/transactions" },
      { id: "payment-categories", label: "Categories", icon: Package, path: "/payments/categories" },
      { id: "accounting-periods", label: "Accounting Periods", icon: TrendingUp, path: "/payments/periods" },
    ],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    icon: Pill,
    module: "pharmacy",
    children: [
      { id: "pharmacy-products", label: "Products", icon: Package, path: "/pharmacy/products" },
      { id: "pharmacy-pos", label: "POS", icon: ShoppingCart, path: "/pharmacy/pos" },
      { id: "pharmacy-statistics", label: "Statistics", icon: BarChart3, path: "/pharmacy/statistics" },
      { id: "pharmacy-cart", label: "Cart", icon: Receipt, path: "/cart" },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    icon: Briefcase,
    module: "crm",
    children: [
      { id: "crm-tasks", label: "Tasks", icon: CheckSquare, path: "/crm/tasks" },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    icon: Shield,
    module: "admin",
    children: [
      { id: "admin-users", label: "Users", icon: UserCog, path: "/admin/users" },
      { id: "admin-roles", label: "Roles", icon: ShieldCheck, path: "/admin/roles" },
      { id: "admin-settings", label: "Settings", icon: Settings2, path: "/admin/settings" },
      { id: "admin-debug", label: "Debug", icon: Bug, path: "/admin/debug" },
    ],
  },
];

interface UniversalSidebarProps {
  collapsed?: boolean;
  onCollapse?: () => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export function UniversalSidebar({
  collapsed = false,
  onCollapse,
  mobileOpen = false,
  setMobileOpen,
}: UniversalSidebarProps) {
  const location = useLocation();
  const { user, hasModuleAccess, logout } = useAuth();
  const { useCurrentTenant } = useTenant();
  const { data: currentTenant, isLoading: isTenantLoading } = useCurrentTenant();
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const tenantData = currentTenant || user?.tenant;
  const tenantLogo = tenantData?.settings?.logo && tenantData?.settings?.logo.trim() !== ''
    ? tenantData.settings.logo
    : undefined;
  const tenantName = tenantData?.name || 'HMS';
  const [logoError, setLogoError] = useState(false);

  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.module) return true;
    return hasModuleAccess(item.module);
  });

  useEffect(() => {
    setLogoError(false);
  }, [tenantLogo]);

  // Auto-open section based on current path
  useEffect(() => {
    filteredMenuItems.forEach((item) => {
      if (item.children?.some((child) => child.path && location.pathname === child.path)) {
        setOpenSections((prev) => prev.includes(item.id) ? prev : [...prev, item.id]);
      }
    });
  }, [location.pathname]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const closeMobileSidebar = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  // Filter items by search
  const getFilteredItems = () => {
    if (!searchQuery.trim()) return filteredMenuItems;
    const q = searchQuery.toLowerCase();
    return filteredMenuItems
      .map((item) => {
        if (item.label.toLowerCase().includes(q)) return item;
        if (item.children) {
          const filtered = item.children.filter((c) => c.label.toLowerCase().includes(q));
          if (filtered.length > 0) return { ...item, children: filtered };
        }
        return null;
      })
      .filter(Boolean) as MenuItem[];
  };

  const displayItems = getFilteredItems();

  const rawUsername = user?.first_name || user?.email?.split('@')[0] || 'User';
  const username = rawUsername.charAt(0).toUpperCase() + rawUsername.slice(1).toLowerCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Workspace Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center justify-center min-w-0">
            {isTenantLoading ? (
              <div className={cn(
                "rounded-lg bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0",
                collapsed ? "w-10 h-10" : "w-14 h-14"
              )}>
                <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
              </div>
            ) : tenantLogo && !logoError ? (
              <img
                src={tenantLogo}
                alt={tenantName}
                className={cn(
                  "rounded-lg object-contain shrink-0",
                  collapsed ? "w-10 h-10" : "w-14 h-14"
                )}
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className={cn(
                "rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center shrink-0",
                collapsed ? "w-10 h-10" : "w-14 h-14"
              )}>
                <Stethoscope className={cn(
                  "text-white dark:text-neutral-900",
                  collapsed ? "w-5 h-5" : "w-7 h-7"
                )} />
              </div>
            )}
          </div>
          {mobileOpen && setMobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X className="h-4 w-4 text-neutral-500" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-[12px] rounded-md border border-sidebar-border bg-transparent text-sidebar-foreground placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-600"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-1">
        <nav className="space-y-0.5">
          {displayItems.map((item) => {
            if (item.children) {
              const isOpen = openSections.includes(item.id);
              const hasActiveChild = item.children.some((c) => c.path && location.pathname === c.path);

              return (
                <div key={item.id}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] font-medium transition-colors",
                      hasActiveChild
                        ? "text-sidebar-foreground"
                        : "text-neutral-500 dark:text-neutral-400 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className={cn(
                      "h-4 w-4 shrink-0",
                      hasActiveChild ? "text-sidebar-foreground" : "text-neutral-400 dark:text-neutral-500"
                    )} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        <ChevronRight className={cn(
                          "h-3 w-3 shrink-0 text-neutral-400 transition-transform duration-200",
                          isOpen && "rotate-90"
                        )} />
                      </>
                    )}
                  </button>

                  {/* Children */}
                  {!collapsed && isOpen && (
                    <div className="ml-3 pl-3 border-l border-sidebar-border mt-0.5 mb-1 space-y-0.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          to={child.path || "#"}
                          onClick={closeMobileSidebar}
                        >
                          <div
                            className={cn(
                              "flex items-center gap-2.5 px-2.5 h-7 rounded-md text-[12px] transition-colors",
                              isActive(child.path)
                                ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                                : "text-neutral-500 dark:text-neutral-400 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                            )}
                          >
                            <child.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{child.label}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Top-level item (Dashboard)
            return (
              <Link key={item.id} to={item.path || "#"} onClick={closeMobileSidebar}>
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] font-medium transition-colors",
                    isActive(item.path)
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn(
                    "h-4 w-4 shrink-0",
                    isActive(item.path) ? "text-sidebar-foreground" : "text-neutral-400 dark:text-neutral-500"
                  )} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Section - User & Collapse */}
      <div className="mt-auto border-t border-sidebar-border">
        {/* User Profile */}
        <div className={cn(
          "flex items-center gap-2.5 px-4 py-3",
          collapsed && "justify-center px-2"
        )}>
          <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-sidebar-foreground truncate">{username}</p>
              <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => logout()}
              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Collapse Toggle */}
        {!mobileOpen && onCollapse && (
          <div className="px-3 pb-3">
            <button
              onClick={onCollapse}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 h-7 rounded-md text-[12px] text-neutral-400 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
                collapsed && "justify-center"
              )}
            >
              {collapsed ? (
                <ChevronsRight className="h-3.5 w-3.5" />
              ) : (
                <>
                  <ChevronsLeft className="h-3.5 w-3.5" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && setMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      {setMobileOpen && (
        <aside
          className={cn(
            "fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-50 transition-transform duration-200 lg:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent />
        </aside>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 hidden lg:block shrink-0",
          collapsed ? "w-14" : "w-60"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
