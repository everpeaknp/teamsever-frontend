"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardIcon, CardStackIcon, PersonIcon, Cross2Icon, ArrowLeftIcon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import AnalyticsDashboard from "@/components/super-admin/AnalyticsDashboard";
import PlanBuilderNew from "@/components/super-admin/PlanBuilderNew";
import UserManagementNew from "@/components/super-admin/UserManagementNew";
import SystemSettings from "@/components/super-admin/SystemSettings";
import ProductUpdates from "@/components/super-admin/ProductUpdates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CurrencySwitcherDark } from "@/components/currency/CurrencySwitcherDark";
import { GearIcon } from "@radix-ui/react-icons";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const VALID_TABS = ["dashboard", "plans", "users", "settings", "updates"] as const;
type SuperAdminTab = typeof VALID_TABS[number];

const STORAGE_KEY = "superadmin_active_tab";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as SuperAdminTab | null;

  // Determine initial tab with URL precedence > localStorage > default
  const [activeTab, setActiveTab] = useState<SuperAdminTab>("dashboard");
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({});
  const [isReady, setIsReady] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { systemName } = useSystemSettings();

  // Auth Guard & Initial Tab Hydration
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const isSuperUser = localStorage.getItem("isSuperUser") === "true";
    
    if (!token || !isSuperUser) {
      router.push("/super-admin-login");
      return;
    }

    // Determine initial tab
    let initialTab: SuperAdminTab = "dashboard";
    if (tabParam && VALID_TABS.includes(tabParam)) {
      initialTab = tabParam;
    } else {
      const savedTab = localStorage.getItem(STORAGE_KEY) as SuperAdminTab | null;
      if (savedTab && VALID_TABS.includes(savedTab)) {
        initialTab = savedTab;
      }
    }

    setActiveTab(initialTab);
    setVisitedTabs({ [initialTab]: true });
    setIsReady(true);

    // Sync URL if missing
    if (tabParam !== initialTab) {
      router.replace(`/super-admin?tab=${initialTab}`, { scroll: false });
    }
  }, [router, tabParam]);

  // Handle Tab Switch with URL & LocalStorage Persistence
  const handleTabChange = useCallback((tab: SuperAdminTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => ({ ...prev, [tab]: true }));
    try {
      localStorage.setItem(STORAGE_KEY, tab);
    } catch {}
    router.replace(`/super-admin?tab=${tab}`, { scroll: false });

    // Auto-close on mobile
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [router]);

  const menuItems = [
    { id: "dashboard", label: "Analytics", icon: DashboardIcon },
    { id: "plans", label: "Plans", icon: CardStackIcon },
    { id: "users", label: "Users", icon: PersonIcon },
    { id: "settings", label: "Settings", icon: GearIcon },
    { id: "updates", label: "What’s New", icon: CardStackIcon },
  ] as const;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-background">
      {/* Dark Sidebar */}
      <aside className={cn(
        "fixed lg:sticky inset-y-0 left-0 top-0 z-50 h-screen bg-[#0a0a0a] border-r border-gray-800 flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "-translate-x-full lg:translate-x-0",
        "lg:w-64",
        sidebarCollapsed && "lg:w-16"
      )}>
        {/* Logo/Header */}
        <div className={cn(
          "p-4 sm:p-6 border-b border-gray-800 flex items-center justify-between transition-all duration-300",
          sidebarCollapsed && "lg:p-3 lg:justify-center"
        )}>
          {!sidebarCollapsed ? (
            <>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">Super Admin</h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">{systemName}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-gray-800 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <Cross2Icon className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <div className="hidden lg:block">
              <DashboardIcon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 sm:p-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as SuperAdminTab)}
                  className={cn(
                    "min-h-11 w-full flex items-center gap-3 px-3 sm:px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800",
                    sidebarCollapsed && "lg:justify-center lg:px-2"
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Back to App */}
        <div className="p-3 sm:p-4 border-t border-gray-800 space-y-3">
          {/* Currency Switcher */}
          {!sidebarCollapsed && (
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">Currency</label>
              <CurrencySwitcherDark />
            </div>
          )}
          
          <button
            onClick={() => router.push("/dashboard")}
            className={cn(
              "w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors",
              sidebarCollapsed && "lg:justify-center lg:px-2"
            )}
            title={sidebarCollapsed ? "Back to App" : undefined}
          >
            <ArrowLeftIcon className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Back to App</span>}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content - Lazy Loaded & Kept-Alive for Instant Switching and 0 Refetch Lag */}
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-background min-h-screen">
        {/* Header with Hamburger */}
        <div className="sticky top-0 z-30 bg-white dark:bg-card border-b shadow-sm px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 1024) {
                setSidebarOpen(!sidebarOpen);
              } else {
                setSidebarCollapsed(!sidebarCollapsed);
              }
            }}
            className="min-h-11 min-w-11 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
          >
            <HamburgerMenuIcon className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            {menuItems.find(item => item.id === activeTab)?.icon && (
              <div className="text-purple-600 flex-shrink-0">
                {(() => {
                  const Icon = menuItems.find(item => item.id === activeTab)?.icon;
                  return Icon ? <Icon className="w-5 h-5" /> : null;
                })()}
              </div>
            )}
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
              {menuItems.find(item => item.id === activeTab)?.label}
            </h2>
          </div>
        </div>

        {/* Tab Panels: Only mount when visited, keep alive in DOM */}
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {isReady && (
            <>
              {visitedTabs.dashboard && (
                <div className={activeTab === "dashboard" ? "block" : "hidden"}>
                  <AnalyticsDashboard />
                </div>
              )}
              {visitedTabs.plans && (
                <div className={activeTab === "plans" ? "block" : "hidden"}>
                  <PlanBuilderNew />
                </div>
              )}
              {visitedTabs.users && (
                <div className={activeTab === "users" ? "block" : "hidden"}>
                  <UserManagementNew />
                </div>
              )}
              {visitedTabs.settings && (
                <div className={activeTab === "settings" ? "block" : "hidden"}>
                  <SystemSettings />
                </div>
              )}
              {visitedTabs.updates && (
                <div className={activeTab === "updates" ? "block" : "hidden"}>
                  <ProductUpdates />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
