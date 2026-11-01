"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  PersonIcon, 
  CheckCircledIcon, 
  CrossCircledIcon, 
  ArchiveIcon, 
  GearIcon 
} from "@radix-ui/react-icons";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Building2, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Sparkles,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { CurrencyDisplay } from "@/components/currency/CurrencyDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import { Plan } from "@/types";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface AdminWorkspaceInfo {
  _id: string;
  name: string;
  planId?: string | null;
  planName?: string;
  isPaid: boolean;
  status: "free" | "active" | "expired";
  billingCycle?: "monthly" | "annual";
  memberCount?: number;
  expiresAt?: string;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  workspaceCount: number;
  workspaces?: AdminWorkspaceInfo[];
  subscription: {
    planId: string | null;
    planName: string;
    planPrice: number;
    planBaseCurrency: 'USD' | 'NPR';
    isPaid: boolean;
    status: "free" | "active" | "expired";
    billingCycle: "monthly" | "annual";
    memberCount: number;
    paidAt?: string;
    expiresAt?: string;
    daysRemaining?: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export default function UserManagementNew() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [assignMemberCount, setAssignMemberCount] = useState<number>(1);
  const [assignBillingCycle, setAssignBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>("all");
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, any>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "registered" | "name" | "workspaces" | "expiry">("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    if (selectedPlan) {
      const plan = plans.find(p => p._id === selectedPlan);
      if (plan && plan.features) {
        const f = plan.features as any;
        setFeatureOverrides({
          attendanceMode: f.attendanceMode || "software",
          canUseAttendance: f.canUseAttendance !== false,
          canUsePhysicalTerminals: Boolean(f.canUsePhysicalTerminals),
          maxPhysicalTerminals: f.maxPhysicalTerminals ?? 0,
          canUseMultiOffice: Boolean(f.canUseMultiOffice),
          maxOfficeLocations: f.maxOfficeLocations ?? 1,
          canUseGeoFencing: Boolean(f.canUseGeoFencing),
          canUseFieldTracking: Boolean(f.canUseFieldTracking),
          canUseDesktopTracking: Boolean(f.canUseDesktopTracking),
          maxStorageBytes: f.maxStorageBytes ?? 1073741824,
          canUseHrCore: Boolean(f.canUseHrCore),
          canUseLeaveManagement: Boolean(f.canUseLeaveManagement),
          canUsePayroll: Boolean(f.canUsePayroll),
          canUseExpenseClaims: Boolean(f.canUseExpenseClaims),
          canUseRecruitment: Boolean(f.canUseRecruitment),
          canUseGanttChart: f.canUseGanttChart !== false,
          canCreateTables: Boolean(f.canCreateTables),
          canUseCustomRoles: Boolean(f.canUseCustomRoles),
          canUseWebhooks: Boolean(f.canUseWebhooks),
          canUseGithubIntegration: Boolean(f.canUseGithubIntegration),
          canUseQaModule: Boolean(f.canUseQaModule),
          canViewAuditLogs: Boolean(f.canViewAuditLogs),
        });
      }
    }
  }, [selectedPlan, plans]);

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/super-admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(data.data || []);
      }
    } catch (error) {
    }
  };

  const openManageModal = (user: AdminUser, targetWsId?: string) => {
    setSelectedUser(user);
    const workspaces = user.workspaces || [];
    const paidWorkspaces = workspaces.filter((ws: any) => ws.isPaid);

    let initialTarget = targetWsId;
    if (!initialTarget) {
      if (paidWorkspaces.length === 1) {
        initialTarget = paidWorkspaces[0]._id;
      } else if (paidWorkspaces.length > 0 && paidWorkspaces.length < workspaces.length) {
        initialTarget = paidWorkspaces[0]._id;
      } else if (workspaces.length === 1) {
        initialTarget = workspaces[0]._id;
      } else {
        initialTarget = "all";
      }
    }

    setTargetWorkspaceId(initialTarget || "all");

    if (initialTarget && initialTarget !== "all") {
      const targetWs = workspaces.find((ws: any) => ws._id === initialTarget);
      if (targetWs) {
        if (targetWs.planId) setSelectedPlan(typeof targetWs.planId === 'object' ? (targetWs.planId as any)._id : targetWs.planId);
        else setSelectedPlan(user.subscription.planId || "");
        setAssignMemberCount(targetWs.memberCount || user.subscription.memberCount || 1);
        setAssignBillingCycle(targetWs.billingCycle || user.subscription.billingCycle || "monthly");
        setIsModalOpen(true);
        return;
      }
    }

    setSelectedPlan(user.subscription.planId || "");
    setAssignMemberCount(user.subscription.memberCount || 1);
    setAssignBillingCycle(user.subscription.billingCycle || "monthly");
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (selectedUser) {
      const workspaces = selectedUser.workspaces || [];
      const paidWorkspaces = workspaces.filter((ws) => ws.isPaid);

      // Pre-select the paid workspace if only 1 is paid, instead of defaulting to global sync!
      let initialTarget = "all";
      if (paidWorkspaces.length === 1) {
        initialTarget = paidWorkspaces[0]._id;
      } else if (paidWorkspaces.length > 1 && paidWorkspaces.length < workspaces.length) {
        initialTarget = paidWorkspaces[0]._id;
      } else if (workspaces.length === 1) {
        initialTarget = workspaces[0]._id;
      }

      setTargetWorkspaceId(initialTarget);

      if (initialTarget !== "all") {
        const targetWs = workspaces.find((ws) => ws._id === initialTarget);
        if (targetWs && targetWs.isPaid) {
          if (targetWs.planId) setSelectedPlan(typeof targetWs.planId === 'object' ? (targetWs.planId as any)._id : targetWs.planId);
          setAssignMemberCount(targetWs.memberCount || 1);
          setAssignBillingCycle(targetWs.billingCycle || "monthly");
          return;
        }
      }

      setSelectedPlan(selectedUser.subscription.planId || "");
      setAssignMemberCount(selectedUser.subscription.memberCount || 1);
      setAssignBillingCycle(selectedUser.subscription.billingCycle || "monthly");
    }
  }, [selectedUser]);

  const handleTargetWorkspaceChange = (newTargetId: string) => {
    setTargetWorkspaceId(newTargetId);
    if (newTargetId !== "all" && selectedUser?.workspaces) {
      const targetWs = selectedUser.workspaces.find((ws) => ws._id === newTargetId);
      if (targetWs && targetWs.isPaid && targetWs.planId) {
        setSelectedPlan(targetWs.planId);
        if (targetWs.memberCount) setAssignMemberCount(targetWs.memberCount);
        if (targetWs.billingCycle) setAssignBillingCycle(targetWs.billingCycle);
      }
    } else if (selectedUser) {
      setSelectedPlan(selectedUser.subscription.planId || "");
      setAssignMemberCount(selectedUser.subscription.memberCount || 1);
      setAssignBillingCycle(selectedUser.subscription.billingCycle || "monthly");
    }
  };

  const togglePaidStatus = async (userId: string, currentStatus: boolean) => {
    if (!currentStatus && !selectedPlan) {
      toast.error("Please select a plan first");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(
        `${API_URL}/api/super-admin/users/${userId}/subscription`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isPaid: !currentStatus,
            planId: !currentStatus ? selectedPlan : undefined,
            memberCount: !currentStatus ? assignMemberCount : undefined,
            billingCycle: !currentStatus ? assignBillingCycle : undefined,
            featureOverrides: !currentStatus ? featureOverrides : undefined,
            targetWorkspaceId: targetWorkspaceId
          }),
        }
      );
      if (response.ok) {
        toast.success(currentStatus ? "User subscription removed" : "User subscription activated");
        fetchUsers();
        setSelectedUser(null);
        setSelectedPlan("");
        setAssignMemberCount(1);
        setAssignBillingCycle("monthly");
        setTargetWorkspaceId("all");
        setFeatureOverrides({});
        setIsModalOpen(false);
      } else {
        toast.error("Failed to update subscription");
      }
    } catch (error) {
      toast.error("Error updating subscription");
    }
  };

  const getInitials = (name: string) => {
    return (name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // High-Level Insights & Metrics Calculations
  const metrics = useMemo(() => {
    const total = users.length;
    const paid = users.filter(u => u.subscription?.isPaid).length;
    const active = users.filter(u => u.subscription?.status === "active").length;
    const expired = users.filter(u => u.subscription?.status === "expired").length;
    const totalWorkspaces = users.reduce((sum, u) => sum + (u.workspaceCount || 0), 0);
    const expiringSoon = users.filter(u => 
      u.subscription?.isPaid && 
      u.subscription?.daysRemaining !== undefined && 
      u.subscription.daysRemaining <= 7 && 
      u.subscription.daysRemaining >= 0
    ).length;

    const paidPercentage = total > 0 ? Math.round((paid / total) * 100) : 0;

    return {
      total,
      paid,
      active,
      expired,
      totalWorkspaces,
      expiringSoon,
      paidPercentage
    };
  }, [users]);

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = user.name?.toLowerCase().includes(query);
        const matchesEmail = user.email?.toLowerCase().includes(query);
        const matchesPlan = user.subscription?.planName?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesPlan) return false;
      }

      // 2. Status Filter
      if (statusFilter === "paid" && !user.subscription?.isPaid) return false;
      if (statusFilter === "free" && user.subscription?.isPaid) return false;
      if (statusFilter === "active" && user.subscription?.status !== "active") return false;
      if (statusFilter === "expired" && user.subscription?.status !== "expired") return false;
      if (statusFilter === "expiring_soon") {
        const days = user.subscription?.daysRemaining;
        if (!user.subscription?.isPaid || days === undefined || days > 7) return false;
      }

      // 3. Plan Filter
      if (planFilter !== "all") {
        if (user.subscription?.planId !== planFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "workspaces") {
        return (b.workspaceCount || 0) - (a.workspaceCount || 0);
      }
      if (sortBy === "expiry") {
        const daysA = a.subscription?.daysRemaining ?? 99999;
        const daysB = b.subscription?.daysRemaining ?? 99999;
        return daysA - daysB;
      }
      if (sortBy === "registered") {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      // Default: "newest" (Recent Signups & Subscriptions)
      // When paid, prioritizes the date they signed up/upgraded for their current plan (paidAt).
      // When free, prioritizes the date they signed up for the platform (createdAt).
      const getEffectiveTime = (u: AdminUser) => {
        if (u.subscription?.isPaid) {
          if (u.subscription.paidAt) {
            return new Date(u.subscription.paidAt).getTime();
          }
          if (u.subscription.expiresAt) {
            const isAnnual = u.subscription.billingCycle === "annual";
            return new Date(u.subscription.expiresAt).getTime() - (isAnnual ? 365 : 30) * 86400000;
          }
        }
        return new Date(u.createdAt || 0).getTime();
      };
      return getEffectiveTime(b) - getEffectiveTime(a);
    });
  }, [users, searchTerm, statusFilter, planFilter, sortBy]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, planFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || planFilter !== "all" || sortBy !== "newest";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPlanFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 py-4 border-b">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">User & Workspace Directory</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitor registered accounts, active tenant plans, seats, and custom overrides.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchUsers} 
            className="text-xs h-9 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Insightful KPI Cards with Quick-Filter Interaction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card 
          onClick={() => setStatusFilter("all")} 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Users
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-extrabold">{metrics.total}</div>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {metrics.paidPercentage}% Paid
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Platform user accounts</p>
          </CardContent>
        </Card>

        {/* Paid Subscriptions */}
        <Card 
          onClick={() => setStatusFilter("paid")} 
          className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === "paid" ? "ring-2 ring-emerald-500" : ""}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paid Subscriptions
            </CardTitle>
            <CreditCard className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {metrics.paid}
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400">
                {metrics.active} Active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Active revenue-generating users</p>
          </CardContent>
        </Card>

        {/* Active Workspaces */}
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Workspaces Managed
            </CardTitle>
            <Building2 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {metrics.totalWorkspaces}
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                ~{(metrics.totalWorkspaces / Math.max(1, metrics.total)).toFixed(1)} / user
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Total active tenant organizations</p>
          </CardContent>
        </Card>

        {/* Expiring Soon / At-Risk */}
        <Card 
          onClick={() => setStatusFilter("expiring_soon")} 
          className={`cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "expiring_soon" ? "ring-2 ring-amber-500" : ""
          } ${metrics.expiringSoon > 0 ? "border-amber-300/80 bg-amber-50/20 dark:bg-amber-950/10" : ""}`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Expiring Soon
            </CardTitle>
            <AlertTriangle className={`w-4 h-4 ${metrics.expiringSoon > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className={`text-2xl font-extrabold ${metrics.expiringSoon > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                {metrics.expiringSoon}
              </div>
              <Badge 
                variant="outline" 
                className={`text-[10px] ${
                  metrics.expiringSoon > 0 
                    ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300" 
                    : "text-muted-foreground"
                }`}
              >
                Within 7 Days
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Requires subscription renewal</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card with Search & Advanced Filters */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Accounts & Subscriptions</CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredUsers.length} of {users.length} total user accounts
              </CardDescription>
            </div>

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start md:self-auto"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Search & Filter Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
            {/* 1. Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid Only</SelectItem>
                <SelectItem value="free">Free Tier Only</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon (≤ 7 Days)</SelectItem>
                <SelectItem value="expired">Expired Only</SelectItem>
              </SelectContent>
            </Select>

            {/* 3. Plan Tier Filter */}
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {plans.map(p => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 4. Sort Filter */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest Signups</SelectItem>
                <SelectItem value="registered">Account Created (Newest)</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="workspaces">Most Workspaces</SelectItem>
                <SelectItem value="expiry">Expiring Soonest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Filter className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold">No matching users found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No user accounts match your current search and filter criteria.
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs mt-2">
                  Reset All Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/40">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        User / Contact
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Workspaces
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Plan & Seats
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Remaining
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {paginatedUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-muted/40 transition-colors">
                        {/* User Identity */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-foreground leading-tight">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                {user.subscription?.isPaid && user.subscription?.paidAt
                                  ? `Subscribed ${new Date(user.subscription.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                                  : `Joined ${new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Workspaces Breakdown Popover */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {user.workspaceCount === 0 ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground bg-muted/40 border border-border/40">
                              <Building2 className="w-3.5 h-3.5 opacity-50" />
                              <span>0 workspaces</span>
                            </div>
                          ) : (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors cursor-pointer group">
                                  <Building2 className={`w-3.5 h-3.5 ${(user.workspaces && user.workspaces.some(w => w.isPaid)) ? "text-emerald-500" : "text-blue-500"}`} />
                                  <span className="font-semibold">{user.workspaceCount} workspace{user.workspaceCount === 1 ? "" : "s"}</span>
                                  {user.workspaces && user.workspaces.some(w => w.isPaid) ? (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                                      {user.workspaces.filter(w => w.isPaid).length} Paid
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-normal">
                                      Free
                                    </span>
                                  )}
                                  <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-transform" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-3 space-y-2 shadow-xl border bg-card text-card-foreground">
                                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                  <span className="text-xs font-bold text-foreground">Owned Workspaces ({user.workspaceCount})</span>
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{user.email}</span>
                                </div>
                                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                  {user.workspaces && user.workspaces.length > 0 ? (
                                    user.workspaces.map((ws) => (
                                      <div 
                                        key={ws._id} 
                                        onClick={() => openManageModal(user, ws._id)}
                                        className="p-2 rounded-md bg-muted/40 hover:bg-muted/70 flex items-center justify-between gap-2 border border-border/40 transition-colors cursor-pointer group/ws"
                                      >
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                                            <Building2 className="w-3 h-3 text-primary shrink-0" />
                                            {ws.name}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {ws.memberCount || 1} seat{ws.memberCount === 1 ? "" : "s"} • {ws.billingCycle || "monthly"}
                                          </p>
                                        </div>
                                        <Badge 
                                          variant={ws.isPaid ? "default" : "secondary"}
                                          className={`text-[10px] shrink-0 font-semibold ${ws.isPaid ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                                        >
                                          {ws.isPaid ? (ws.planName || "Paid Plan") : "Free Plan"}
                                        </Badge>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-muted-foreground text-center py-2">No workspaces found</p>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </td>

                        {/* Plan & Seats */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">{user.subscription.planName}</span>
                              {user.subscription.isPaid && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
                                  {user.subscription.billingCycle}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>{user.subscription.memberCount} seat{user.subscription.memberCount === 1 ? "" : "s"}</span>
                              {user.subscription.isPaid && (
                                <>
                                  <span>•</span>
                                  <CurrencyDisplay 
                                    amount={user.subscription.planPrice} 
                                    baseCurrency={user.subscription.planBaseCurrency || 'NPR'} 
                                    showCurrencyCode={false} 
                                  />
                                  <span>/{user.subscription.billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Badge
                            variant={
                              user.subscription.status === "active"
                                ? "default"
                                : user.subscription.status === "expired"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[11px] capitalize font-semibold"
                          >
                            {user.subscription.status}
                          </Badge>
                        </td>

                        {/* Days Left */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {user.subscription.isPaid && user.subscription.status === 'active' && user.subscription.daysRemaining !== undefined ? (
                            <div className="space-y-1">
                              <span className={`text-xs font-bold ${
                                user.subscription.daysRemaining <= 3 ? 'text-red-500' :
                                user.subscription.daysRemaining <= 7 ? 'text-amber-500' :
                                'text-emerald-500'
                              }`}>
                                {user.subscription.daysRemaining} days left
                              </span>
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    user.subscription.daysRemaining <= 3 ? 'bg-red-500' :
                                    user.subscription.daysRemaining <= 7 ? 'bg-amber-500' :
                                    'bg-emerald-500'
                                  }`} 
                                  style={{ width: `${Math.min(100, Math.max(5, (user.subscription.daysRemaining / 30) * 100))}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant={user.subscription.isPaid ? "outline" : "default"}
                              onClick={() => openManageModal(user)}
                              className="text-xs h-8"
                            >
                              {user.subscription.isPaid ? "Manage Plan" : "Grant Plan"}
                            </Button>
                            {user.subscription.isPaid && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => togglePaidStatus(user._id, true)}
                                className="text-xs h-8 text-destructive hover:bg-destructive/10"
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="lg:hidden divide-y divide-border/60">
                {paginatedUsers.map((user) => (
                  <div key={user._id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {user.subscription?.isPaid && user.subscription?.paidAt
                              ? `Subscribed ${new Date(user.subscription.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                              : `Joined ${new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          user.subscription.status === "active"
                            ? "default"
                            : user.subscription.status === "expired"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px] capitalize"
                      >
                        {user.subscription.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2 rounded bg-muted/40">
                        <span className="text-muted-foreground block text-[10px] uppercase">Plan</span>
                        <span className="font-semibold text-foreground">{user.subscription.planName}</span>
                      </div>
                      <div className="p-2 rounded bg-muted/40">
                        <span className="text-muted-foreground block text-[10px] uppercase">Workspaces</span>
                        {user.workspaces && user.workspaces.length > 0 ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="font-semibold text-foreground flex items-center gap-1 hover:text-primary text-xs">
                                <span>{user.workspaceCount}</span>
                                {user.workspaces.some(w => w.isPaid) ? (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-600 font-bold">
                                    {user.workspaces.filter(w => w.isPaid).length} Paid
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground">
                                    Free
                                  </span>
                                )}
                                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3 space-y-2 shadow-xl border bg-card text-card-foreground">
                              <p className="text-xs font-bold border-b pb-1">Workspaces ({user.workspaceCount})</p>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {user.workspaces.map((ws) => (
                                  <div key={ws._id} className="p-1.5 rounded bg-muted/50 flex items-center justify-between text-xs">
                                    <span className="truncate max-w-[130px] font-medium">{ws.name}</span>
                                    <Badge variant={ws.isPaid ? "default" : "secondary"} className="text-[9px]">
                                      {ws.isPaid ? (ws.planName || "Paid") : "Free"}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="font-semibold text-foreground">{user.workspaceCount}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">
                        {user.subscription.memberCount} seats • {user.subscription.billingCycle}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={user.subscription.isPaid ? "outline" : "default"}
                          onClick={() => {
                            setSelectedUser(user);
                            setIsModalOpen(true);
                          }}
                          className="text-xs h-8"
                        >
                          {user.subscription.isPaid ? "Manage" : "Grant"}
                        </Button>
                        {user.subscription.isPaid && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePaidStatus(user._id, true)}
                            className="text-xs h-8 text-destructive"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="p-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-muted/20">
                <div className="text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{Math.min(filteredUsers.length, (currentPage - 1) * pageSize + 1)}</span> to{" "}
                  <span className="font-semibold text-foreground">{Math.min(filteredUsers.length, currentPage * pageSize)}</span> of{" "}
                  <span className="font-semibold text-foreground">{filteredUsers.length}</span> results
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-2">
                    <span className="text-muted-foreground">Rows per page:</span>
                    <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                      <SelectTrigger className="h-7 w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="h-7 w-7"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="px-2 font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="h-7 w-7"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Grant Access Modal (with Enterprise Hardware & Feature Overrides) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle>Grant Subscription Access</DialogTitle>
            <DialogDescription>
              Configure plan, seats, and enterprise feature overrides for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Target Workspace Selector */}
            {selectedUser && selectedUser.workspaces && selectedUser.workspaces.length > 0 && (
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Target Workspace Scope
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedUser.workspaces.length} workspace{selectedUser.workspaces.length === 1 ? "" : "s"} owned
                  </span>
                </div>
                <Select value={targetWorkspaceId} onValueChange={handleTargetWorkspaceChange}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select target workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">All Workspaces</span>
                        <span className="text-[11px] text-muted-foreground">(Global Sync across all {selectedUser.workspaces.length} workspaces)</span>
                      </div>
                    </SelectItem>
                    {selectedUser.workspaces.map((ws) => (
                      <SelectItem key={ws._id} value={ws._id}>
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span className="font-medium text-foreground">{ws.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            (Current: {ws.isPaid ? ws.planName : "Free Plan"})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Select a specific workspace to upgrade it independently, or select &quot;All Workspaces&quot; to apply across all tenant environments.
                </p>
              </div>
            )}

            {/* Plan Selection */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subscription Plan</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan._id} value={plan._id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select 
                  value={assignBillingCycle} 
                  onValueChange={(v: any) => setAssignBillingCycle(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Member Seats</Label>
              <Input
                type="number"
                min="1"
                value={assignMemberCount}
                onChange={(e) => setAssignMemberCount(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="border-t pt-4 space-y-6">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <GearIcon /> Custom Feature & Hardware Overrides
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customize storage quotas, enable biometric terminals, multi-office, or specialized modules for this user.
                </p>
              </div>

              {/* Storage Quota Override */}
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold">Unified Workspace Storage</Label>
                    <p className="text-[11px] text-muted-foreground">Override plan base storage limit</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-medium">Unlimited</span>
                    <Switch 
                      checked={featureOverrides.maxStorageBytes === -1}
                      onCheckedChange={(checked) => {
                        setFeatureOverrides(prev => ({
                          ...prev,
                          maxStorageBytes: checked ? -1 : 16106127360
                        }));
                      }}
                    />
                  </div>
                </div>
                {featureOverrides.maxStorageBytes !== -1 && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      className="h-8 text-xs max-w-[120px]"
                      value={Math.round((featureOverrides.maxStorageBytes || 1073741824) / (1024 * 1024 * 1024))}
                      onChange={(e) => {
                        const gb = Math.max(1, parseInt(e.target.value) || 1);
                        setFeatureOverrides(prev => ({
                          ...prev,
                          maxStorageBytes: gb * 1024 * 1024 * 1024
                        }));
                      }}
                    />
                    <span className="text-xs text-muted-foreground">GB unified storage pool</span>
                  </div>
                )}
              </div>

              {/* Attendance & Terminals Section */}
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Attendance & Biometric Hardware</Label>
                  <p className="text-[11px] text-muted-foreground">Terminal limits, GPS geofencing, and multi-office branches</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Attendance Mode</Label>
                  <Select 
                    value={featureOverrides.attendanceMode || "software"} 
                    onValueChange={(val) => {
                      setFeatureOverrides(prev => ({
                        ...prev,
                        attendanceMode: val,
                        canUseAttendance: val !== 'disabled',
                        canUsePhysicalTerminals: val === 'biometric' || val === 'both',
                        canUseGeoFencing: val === 'software_geofence' || val === 'both'
                      }));
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="software">Software Attendance (Web & Mobile)</SelectItem>
                      <SelectItem value="software_geofence">Software Punch + GPS Geofencing</SelectItem>
                      <SelectItem value="biometric">Biometric Hardware Terminals</SelectItem>
                      <SelectItem value="both">Hybrid (Software + Biometric Terminals)</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Physical Terminal Units */}
                {(featureOverrides.attendanceMode === 'biometric' || featureOverrides.attendanceMode === 'both') && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium">Physical Biometric Units</Label>
                        <p className="text-[10px] text-muted-foreground">Door hardware terminals (ZKTeco, Hikvision, etc.)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-medium">Unlimited</span>
                        <Switch 
                          checked={featureOverrides.maxPhysicalTerminals === -1}
                          onCheckedChange={(checked) => {
                            setFeatureOverrides(prev => ({
                              ...prev,
                              maxPhysicalTerminals: checked ? -1 : 5
                            }));
                          }}
                        />
                      </div>
                    </div>
                    {featureOverrides.maxPhysicalTerminals !== -1 && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          className="h-8 text-xs max-w-[120px]"
                          value={featureOverrides.maxPhysicalTerminals || 1}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setFeatureOverrides(prev => ({
                              ...prev,
                              maxPhysicalTerminals: val
                            }));
                          }}
                        />
                        <span className="text-xs text-muted-foreground">terminal units</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Multi-Office Branches */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <Label className="text-xs font-medium">Multi-Office Attendance</Label>
                    <p className="text-[10px] text-muted-foreground">Allow multiple branch office geofences</p>
                  </div>
                  <Switch 
                    checked={Boolean(featureOverrides.canUseMultiOffice)}
                    onCheckedChange={(checked) => {
                      setFeatureOverrides(prev => ({
                        ...prev,
                        canUseMultiOffice: checked,
                        maxOfficeLocations: checked ? -1 : 1
                      }));
                    }}
                  />
                </div>

                {/* Field & Desktop Tracking */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-normal">GPS Field Visits Tracking</Label>
                    <Switch 
                      checked={Boolean(featureOverrides.canUseFieldTracking)}
                      onCheckedChange={(checked) => {
                        setFeatureOverrides(prev => ({ ...prev, canUseFieldTracking: checked }));
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-normal">Desktop Presence & AFK Tracking</Label>
                    <Switch 
                      checked={Boolean(featureOverrides.canUseDesktopTracking)}
                      onCheckedChange={(checked) => {
                        setFeatureOverrides(prev => ({ ...prev, canUseDesktopTracking: checked }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Core HR & Finance Modules */}
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Core HR & Finance Modules</Label>
                  <p className="text-[11px] text-muted-foreground">Employee directory, time-off, payroll, and recruitment</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'canUseHrCore', label: 'Employee Directory & Org Chart' },
                    { key: 'canUseLeaveManagement', label: 'Leave Requests & Approvals' },
                    { key: 'canUsePayroll', label: 'Automated Payroll Engine' },
                    { key: 'canUseExpenseClaims', label: 'Expense Claims & Reimbursements' },
                    { key: 'canUseRecruitment', label: 'Recruitment & Job Pipeline' },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between">
                      <Label className="text-xs font-normal">{f.label}</Label>
                      <Switch 
                        checked={Boolean(featureOverrides[f.key])}
                        onCheckedChange={(checked) => {
                          setFeatureOverrides(prev => ({ ...prev, [f.key]: checked }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools, Roles & Developer Modules */}
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Tools, Roles & Integrations</Label>
                  <p className="text-[11px] text-muted-foreground">Interactive Gantt, spreadsheet tables, custom roles, and developer tools</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'canUseGanttChart', label: 'Interactive Gantt Timeline' },
                    { key: 'canCreateTables', label: 'Custom Spreadsheet Tables' },
                    { key: 'canUseCustomRoles', label: 'Custom Roles & Permissions' },
                    { key: 'canUseWebhooks', label: 'Webhooks API' },
                    { key: 'canUseGithubIntegration', label: 'GitHub Integrations' },
                    { key: 'canUseQaModule', label: 'QA Testing & Quality Suite' },
                    { key: 'canViewAuditLogs', label: 'Security Action Audit Logs' },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between">
                      <Label className="text-xs font-normal">{f.label}</Label>
                      <Switch 
                        checked={Boolean(featureOverrides[f.key])}
                        onCheckedChange={(checked) => {
                          setFeatureOverrides(prev => ({ ...prev, [f.key]: checked }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t bg-muted/30 shrink-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedUser && togglePaidStatus(selectedUser._id, false)}
              disabled={!selectedPlan}
            >
              Confirm & Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
