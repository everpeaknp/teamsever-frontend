"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, 
  Users, 
  Building2, 
  CreditCard, 
  AlertTriangle, 
  ArrowUpRight, 
  Sparkles, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Layers,
  ArrowRight,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/currency/CurrencyDisplay";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamic imports for Recharts to ensure zero SSR hydration issues and optimal bundle loading
const ResponsiveContainer = dynamic(() => import("recharts").then(mod => mod.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(mod => mod.Tooltip), { ssr: false });

interface PlanDistributionItem {
  name: string;
  count: number;
  revenue: number;
}

interface RecentActivityItem {
  id: string;
  name: string;
  email: string;
  planName: string;
  isPaid: boolean;
  createdAt: string;
}

interface AnalyticsData {
  totalRevenue: number;
  mrr: number;
  arr: number;
  arpu: number;
  revenueBaseCurrency: 'USD' | 'NPR';
  conversionRate: number;
  signupData: Array<{ week: string; count: number; year: number }>;
  planDistribution: PlanDistributionItem[];
  recentActivity: RecentActivityItem[];
  metrics: {
    totalUsers: number;
    paidUsers: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    expiringSoon: number;
    totalWorkspaces: number;
    totalSeatsDeployed: number;
  };
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/super-admin/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
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
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 animate-pulse">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full" />
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-muted-foreground py-16 space-y-3">
        <p className="text-base font-semibold">Unable to load analytics metrics</p>
        <Button variant="outline" size="sm" onClick={fetchAnalytics}>
          Try Again
        </Button>
      </div>
    );
  }

  const { metrics, planDistribution, recentActivity, signupData } = analytics;
  const currency = analytics.revenueBaseCurrency || "NPR";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Executive Financial & Platform Intelligence
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time telemetry on revenue velocity, tenant workspace expansion, and subscriber lifecycle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAnalytics}
            className="text-xs h-9 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Row 1: Key Financial Revenue Velocity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Monthly Recurring (MRR)
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              <CurrencyDisplay amount={analytics.mrr} baseCurrency={currency} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400">
                ARR: <CurrencyDisplay amount={analytics.arr} baseCurrency={currency} className="ml-1" showCurrencyCode={false} />
              </Badge>
              <span className="text-[11px] text-muted-foreground">Annual run rate</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Contract Revenue */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contract Value Booked
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              <CurrencyDisplay amount={analytics.totalRevenue} baseCurrency={currency} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              From <span className="font-semibold text-foreground">{metrics.paidUsers}</span> paid accounts ({metrics.totalSeatsDeployed} seats)
            </p>
          </CardContent>
        </Card>

        {/* Free-to-Paid Conversion */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paid Conversion Rate
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {analytics.conversionRate}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{metrics.paidUsers}</span> of {metrics.totalUsers} total registered accounts
            </p>
          </CardContent>
        </Card>

        {/* ARPU (Average Revenue per User) */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg. Value (ARPU)
            </CardTitle>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              <CurrencyDisplay amount={analytics.arpu} baseCurrency={currency} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Monthly revenue per paying workspace
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Operational Tenant Scale Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Users
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.totalUsers}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.totalUsers - metrics.paidUsers} free tier accounts
            </p>
          </CardContent>
        </Card>

        {/* Total Workspaces */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tenant Workspaces
            </CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.totalWorkspaces}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active company organizations
            </p>
          </CardContent>
        </Card>

        {/* Member Seats Deployed */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Licensed Seats
            </CardTitle>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.totalSeatsDeployed}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Paid employee seats licensed
            </p>
          </CardContent>
        </Card>

        {/* Subscriptions At-Risk */}
        <Card className={`border shadow-sm ${metrics.expiringSoon > 0 ? "border-amber-300 bg-amber-50/20 dark:bg-amber-950/10" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Expiring in 7 Days
            </CardTitle>
            <AlertTriangle className={`w-4 h-4 ${metrics.expiringSoon > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className={`text-2xl font-bold ${metrics.expiringSoon > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {metrics.expiringSoon}
              </div>
              <Badge variant="outline" className={`text-[10px] ${metrics.expiringSoon > 0 ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300" : ""}`}>
                {metrics.expiredSubscriptions} Expired
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {metrics.activeSubscriptions} in good standing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Visual Analytics Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Growth & Signups Velocity Chart (2 Columns) */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Registration & Growth Velocity</CardTitle>
                <CardDescription className="text-xs">Weekly user onboarding trajectory over the past 12 weeks</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                Last 12 Weeks
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 w-full">
              {signupData && signupData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis 
                      dataKey="week" 
                      className="text-xs" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                    />
                    <YAxis 
                      className="text-xs" 
                      allowDecimals={false}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                      }}
                      formatter={(value: any) => [`${value} new users`, "Signups"]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#2563EB" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#signupGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No weekly signup history recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution Breakdown (1 Column) */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Plan Distribution</CardTitle>
            <CardDescription className="text-xs">User concentration by subscription tier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {planDistribution && planDistribution.length > 0 ? (
              planDistribution.map((tier) => {
                const percentage = metrics.totalUsers > 0 ? Math.round((tier.count / metrics.totalUsers) * 100) : 0;
                const isPaid = tier.name !== "Free Plan";

                return (
                  <div key={tier.name} className="space-y-1.5 p-2.5 rounded-lg border border-border/50 bg-muted/20">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <span className={`w-2 h-2 rounded-full ${isPaid ? "bg-emerald-500" : "bg-neutral-400"}`} />
                        <span>{tier.name}</span>
                      </div>
                      <span className="font-bold text-foreground">
                        {tier.count} <span className="text-muted-foreground font-normal">({percentage}%)</span>
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isPaid ? "bg-emerald-500" : "bg-neutral-400"}`}
                        style={{ width: `${Math.max(5, percentage)}%` }}
                      />
                    </div>

                    {isPaid && tier.revenue > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                        <span>Monthly yield</span>
                        <span className="font-semibold text-foreground">
                          <CurrencyDisplay amount={tier.revenue} baseCurrency={currency} />
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No plan data available</p>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push("/super-admin?tab=plans")}
              className="w-full text-xs h-8 gap-1.5 mt-2"
            >
              Configure Plans & Pricing
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Recent Account Activity Stream */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold">Recent System Activity</CardTitle>
              <CardDescription className="text-xs">Latest registered user accounts and workspace activations</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push("/super-admin?tab=users")}
              className="text-xs h-8 gap-1 text-primary"
            >
              View All Users
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivity && recentActivity.length > 0 ? (
            <div className="divide-y divide-border/60">
              {recentActivity.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={user.isPaid ? "default" : "secondary"} className="text-[10px] font-semibold">
                      {user.planName}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">No recent activity recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
