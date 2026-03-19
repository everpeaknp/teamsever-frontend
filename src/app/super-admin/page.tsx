"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardIcon, CardStackIcon, PersonIcon, Cross2Icon, ArrowLeftIcon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import AnalyticsDashboard from "@/components/super-admin/AnalyticsDashboard";
import PlanBuilderNew from "@/components/super-admin/PlanBuilderNew";
import UserManagementNew from "@/components/super-admin/UserManagementNew";
import SystemSettings from "@/components/super-admin/SystemSettings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CurrencySwitcherDark } from "@/components/currency/CurrencySwitcherDark";
import { GearIcon } from "@radix-ui/react-icons";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<"dashboard" | "plans" | "users" | "settings">(
    (tabParam as "dashboard" | "plans" | "users" | "settings") || "dashboard"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // For desktop minimize

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const isSuperUser = localStorage.getItem("isSuperUser") === "true";
    
    if (!token || !isSuperUser) {
      router.push("/super-admin-login");
      return;
    }
  }, [router]);

  const { systemName } = useSystemSettings();

  // Update active tab when URL changes
  useEffect(() => {
    if (tabParam && ['dashboard', 'plans', 'users', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  const menuItems = [
    { id: "dashboard", label: "Analytics", icon: DashboardIcon },
    { id: "plans", label: "Plans", icon: CardStackIcon },
    { id: "users", label: "Users", icon: PersonIcon },
    { id: "settings", label: "Settings", icon: GearIcon },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-background">
      {/* Dark Sidebar */}
      <aside className={cn(
        "fixed lg:sticky inset-y-0 left-0 top-0 z-50 h-screen bg-[#0a0a0a] border-r border-gray-800 flex flex-col transition-all duration-300",
        // Mobile: show/hide with full width
        sidebarOpen ? "w-64" : "-translate-x-full lg:translate-x-0",
        // Desktop: expand/collapse
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
                  onClick={() => {
                    setActiveTab(item.id as any);
                    // Auto-close on mobile
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-colors",
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

      {/* Main Content - Properly expands when sidebar is collapsed */}
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-background min-h-screen">
        {/* Header with Hamburger */}
        <div className="sticky top-0 z-30 bg-white dark:bg-card border-b shadow-sm px-3 sm:px-4 py-3 sm:py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Mobile: toggle sidebar open/close
              if (window.innerWidth < 1024) {
                setSidebarOpen(!sidebarOpen);
              } else {
                // Desktop: toggle sidebar collapse/expand
                setSidebarCollapsed(!sidebarCollapsed);
              }
            }}
            className="hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
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

        <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {activeTab === "dashboard" && <AnalyticsDashboard />}
          {activeTab === "plans" && <PlanBuilderNew />}
          {activeTab === "users" && <UserManagementNew />}
          {activeTab === "settings" && <SystemSettings />}
        </div>
      </main>
    </div>
  );
}
