"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Clock, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  GitBranch, 
  MessageSquare, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal,
  HardDrive
} from "lucide-react";
import { CurrencyDisplay } from "@/components/currency/CurrencyDisplay";
import { getPlanFeatureLines } from "@/lib/planFeatures";
import { Plan } from "@/types";

export default function CreatePlanPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showAdvancedQuotas, setShowAdvancedQuotas] = useState(false);

  const parseIntInput = (raw: string, current: number, fallback = -1) => {
    const trimmed = raw.trim();
    if (trimmed === "") return fallback;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? current : parsed;
  };

  const [formData, setFormData] = useState({
    name: "",
    baseCurrency: 'NPR' as 'USD' | 'NPR',
    pricePerMemberMonthly: 0,
    pricePerMemberAnnual: 0,
    description: "",
    
    // Core Quotas
    maxMembers: 5,
    maxStorageGB: 1, // 1 GB default for starter
    maxPhysicalTerminals: 0, // -1 = Unlimited

    // 1. Attendance & Time (Decoupled from HR)
    attendanceMode: 'software' as 'disabled' | 'software' | 'software_geofence' | 'biometric' | 'both',
    canUseShiftsAndRostering: true,

    // 2. Field & Desktop Tracking
    canUseFieldTracking: false,
    canUseDesktopTracking: false,

    // 3. Core HR & People Operations (Decoupled from Attendance)
    canUseHrCore: false,
    canUseLeaveManagement: true,
    canUseOnboardingOffboarding: false,
    canUseCompanyDocuments: true,

    // 4. Payroll & Finance
    canUsePayroll: false,
    canUseExpenseClaims: false,

    // 5. Work Management & Projects (ClickUp/Jira Style)
    canUseGanttChart: true,
    canCreateTables: false,
    canUseCustomRoles: false,
    canUseAdvancedAnalytics: false,

    // 6. Team Chat & Messaging (Slack Style)
    hasGroupChat: true,
    canCreatePrivateChannels: false,
    chatHistoryDays: -1, // -1 = Unlimited, 90 for 90 days

    // 7. Developer & QA Tools
    canUseGithubIntegration: true,
    maxGithubRepositories: 2,
    canUseQaModule: false,
    maxQaSuites: 0,
    canUseWebhooks: false,

    // 8. Security & Reporting
    canExportReports: true,
    canViewAuditLogs: false,
    analyticsTier: 'basic' as 'basic' | 'full',

    // Template Setting
    isTemplate: false,
    templateCategory: 'starter' as 'starter' | 'business' | 'enterprise' | 'custom',

    // Optional Advanced Micro-Limits (Default to Unlimited: -1)
    maxWorkspaces: 1,
    maxAdmins: 1,
    maxSpaces: -1,
    maxLists: -1,
    maxFolders: -1,
    maxTasks: -1,
    messageLimit: -1,
    announcementCooldown: 24,
    accessControlTier: 'basic' as 'none' | 'basic' | 'pro' | 'advanced',
    maxCustomRoles: 0,
    canUsePredefinedRoles: false,
    maxPredefinedRoles: 0,
    maxTablesCount: -1,
    maxRowsLimit: -1,
    maxColumnsLimit: -1,
    maxFiles: -1,
    maxDocuments: -1,
    maxDirectMessagesPerUser: -1,
    maxPrivateChannelsCount: -1,
    maxMembersPerPrivateChannel: -1,
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const isSuperUser = localStorage.getItem("isSuperUser") === "true";
    
    if (!token || !isSuperUser) {
      router.push("/super-admin");
      return;
    }

    // Check if coming from starter or custom template
    const templateData = sessionStorage.getItem("selected_plan_template");
    if (templateData) {
      try {
        const parsed = JSON.parse(templateData);
        sessionStorage.removeItem("selected_plan_template");
        const f = parsed.features || {};
        const storageGB = f.maxStorageBytes !== undefined
          ? (f.maxStorageBytes === -1 ? -1 : Math.max(1, Math.round(f.maxStorageBytes / (1024 * 1024 * 1024))))
          : 1;

        setFormData(prev => ({
          ...prev,
          name: parsed.name ? `${parsed.name} (Custom)` : prev.name,
          description: parsed.description || prev.description,
          pricePerMemberMonthly: parsed.pricePerMemberMonthly ?? prev.pricePerMemberMonthly,
          pricePerMemberAnnual: parsed.pricePerMemberAnnual ?? prev.pricePerMemberAnnual,
          maxMembers: f.maxMembers ?? prev.maxMembers,
          maxStorageGB: storageGB,
          maxPhysicalTerminals: f.maxPhysicalTerminals ?? prev.maxPhysicalTerminals,
          attendanceMode: f.attendanceMode || (f.canUseAttendance === false ? 'disabled' : (f.canUsePhysicalTerminals ? 'both' : (f.canUseGeoFencing ? 'software_geofence' : 'software'))),
          canUseShiftsAndRostering: f.canUseShiftsAndRostering !== false,
          canUseFieldTracking: f.canUseFieldTracking ?? prev.canUseFieldTracking,
          canUseDesktopTracking: f.canUseDesktopTracking ?? prev.canUseDesktopTracking,
          canUseHrCore: f.canUseHrCore ?? prev.canUseHrCore,
          canUseLeaveManagement: f.canUseLeaveManagement !== false,
          canUseOnboardingOffboarding: f.canUseOnboardingOffboarding ?? prev.canUseOnboardingOffboarding,
          canUseCompanyDocuments: f.canUseCompanyDocuments !== false,
          canUsePayroll: f.canUsePayroll ?? prev.canUsePayroll,
          canUseExpenseClaims: f.canUseExpenseClaims ?? prev.canUseExpenseClaims,
          canUseGanttChart: f.canUseGanttChart !== false,
          canCreateTables: f.canCreateTables ?? prev.canCreateTables,
          canUseCustomRoles: Boolean(f.canUseCustomRoles),
          maxCustomRoles: f.canUseCustomRoles ? (f.maxCustomRoles ?? 5) : 0,
          canUsePredefinedRoles: Boolean(f.canUsePredefinedRoles),
          maxPredefinedRoles: f.canUsePredefinedRoles ? (f.maxPredefinedRoles ?? 5) : 0,
          canUseAdvancedAnalytics: f.canUseAdvancedAnalytics ?? prev.canUseAdvancedAnalytics,
          hasGroupChat: f.hasGroupChat !== false,
          canCreatePrivateChannels: f.canCreatePrivateChannels ?? prev.canCreatePrivateChannels,
          chatHistoryDays: f.chatHistoryDays ?? prev.chatHistoryDays,
          canUseGithubIntegration: f.canUseGithubIntegration !== false,
          maxGithubRepositories: f.maxGithubRepositories ?? prev.maxGithubRepositories,
          canUseQaModule: f.canUseQaModule ?? prev.canUseQaModule,
          maxQaSuites: f.maxQaSuites ?? prev.maxQaSuites,
          canUseWebhooks: f.canUseWebhooks ?? prev.canUseWebhooks,
          canExportReports: f.canExportReports !== false,
          canViewAuditLogs: f.canViewAuditLogs ?? prev.canViewAuditLogs,
          analyticsTier: f.analyticsTier || prev.analyticsTier,
          isTemplate: false,
          templateCategory: parsed.category || 'starter',
        }));
        toast.info(`Pre-loaded configuration from template "${parsed.name}"`);
      } catch (err) {}
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.name.trim().length < 3) {
      toast.error('Plan name must be at least 3 characters');
      return;
    }
    
    if (!formData.description || formData.description.trim().length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }
    
    if (formData.pricePerMemberMonthly < 0 || formData.pricePerMemberAnnual < 0) {
      toast.error('Prices must be 0 or greater');
      return;
    }

    // Auto-sync boolean flags based on attendanceMode
    const isAttDisabled = formData.attendanceMode === 'disabled';
    const canUseRemoteAttendance = !isAttDisabled && ['software', 'software_geofence', 'both'].includes(formData.attendanceMode);
    const canUseGeoFencing = !isAttDisabled && ['software_geofence', 'both'].includes(formData.attendanceMode);
    const canUsePhysicalTerminals = !isAttDisabled && ['biometric', 'both'].includes(formData.attendanceMode);

    const payload: any = {
      name: formData.name.trim(),
      baseCurrency: formData.baseCurrency,
      pricePerMemberMonthly: Number(formData.pricePerMemberMonthly),
      pricePerMemberAnnual: Number(formData.pricePerMemberAnnual),
      description: formData.description.trim(),
      features: {
        maxMembers: Number(formData.maxMembers),
        maxStorageBytes: formData.maxStorageGB === -1 ? -1 : (Number(formData.maxStorageGB) * 1024 * 1024 * 1024),
        
        // Attendance & Time
        attendanceMode: formData.attendanceMode,
        canUseAttendance: !isAttDisabled,
        canUseRemoteAttendance,
        canUseGeoFencing,
        canUsePhysicalTerminals,
        maxPhysicalTerminals: canUsePhysicalTerminals ? Number(formData.maxPhysicalTerminals) : 0,
        canUseShiftsAndRostering: Boolean(formData.canUseShiftsAndRostering),

        // Tracking
        canUseFieldTracking: Boolean(formData.canUseFieldTracking),
        canUseDesktopTracking: Boolean(formData.canUseDesktopTracking),

        // Core HR & Payroll
        canUseHrCore: Boolean(formData.canUseHrCore),
        canUseLeaveManagement: Boolean(formData.canUseLeaveManagement),
        canUseOnboardingOffboarding: Boolean(formData.canUseOnboardingOffboarding),
        canUseCompanyDocuments: Boolean(formData.canUseCompanyDocuments),
        canUsePayroll: Boolean(formData.canUsePayroll),
        canUseExpenseClaims: Boolean(formData.canUseExpenseClaims),

        // Work Management & Projects
        canUseGanttChart: Boolean(formData.canUseGanttChart),
        canCreateTables: Boolean(formData.canCreateTables),
        canUseCustomRoles: Boolean(formData.canUseCustomRoles),
        canUseAdvancedAnalytics: Boolean(formData.canUseAdvancedAnalytics),

        // Chat
        hasGroupChat: Boolean(formData.hasGroupChat),
        canCreatePrivateChannels: Boolean(formData.canCreatePrivateChannels),
        chatHistoryDays: Number(formData.chatHistoryDays),

        // Developer & QA
        canUseGithubIntegration: Boolean(formData.canUseGithubIntegration),
        maxGithubRepositories: Number(formData.maxGithubRepositories),
        canUseQaModule: Boolean(formData.canUseQaModule),
        maxQaSuites: Number(formData.maxQaSuites),
        canUseWebhooks: Boolean(formData.canUseWebhooks),

        // Compliance & Security
        canExportReports: Boolean(formData.canExportReports),
        canViewAuditLogs: Boolean(formData.canViewAuditLogs),
        analyticsTier: formData.analyticsTier,

        // Advanced Micro-limits
        maxWorkspaces: Number(formData.maxWorkspaces),
        maxAdmins: Number(formData.maxAdmins),
        maxSpaces: Number(formData.maxSpaces),
        maxLists: Number(formData.maxLists),
        maxFolders: Number(formData.maxFolders),
        maxTasks: Number(formData.maxTasks),
        messageLimit: Number(formData.messageLimit),
        announcementCooldown: Number(formData.announcementCooldown),
        hasAccessControl: formData.accessControlTier !== 'none',
        accessControlTier: formData.accessControlTier,
        maxCustomRoles: formData.canUseCustomRoles ? Number(formData.maxCustomRoles) : 0,
        canUsePredefinedRoles: Boolean(formData.canUsePredefinedRoles),
        maxPredefinedRoles: formData.canUsePredefinedRoles ? Number(formData.maxPredefinedRoles) : 0,
        maxTablesCount: Number(formData.maxTablesCount),
        maxRowsLimit: Number(formData.maxRowsLimit),
        maxColumnsLimit: Number(formData.maxColumnsLimit),
        maxFiles: Number(formData.maxFiles),
        maxDocuments: Number(formData.maxDocuments),
        maxDirectMessagesPerUser: Number(formData.maxDirectMessagesPerUser),
        maxPrivateChannelsCount: Number(formData.maxPrivateChannelsCount),
        maxMembersPerPrivateChannel: Number(formData.maxMembersPerPrivateChannel),
      },
      isTemplate: Boolean(formData.isTemplate),
      templateCategory: formData.templateCategory,
    };

    setSubmitting(true);
    try {
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Plan created successfully!');
        router.push('/super-admin?tab=plans');
      } else {
        toast.error(data.message || 'Failed to create plan');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Network error occurred'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Preview Plan representation
  const previewPlan: Plan = {
    _id: "preview",
    name: formData.name || "Untitled Plan",
    price: formData.pricePerMemberMonthly,
    basePrice: formData.pricePerMemberMonthly,
    baseCurrency: formData.baseCurrency,
    pricePerMemberMonthly: formData.pricePerMemberMonthly,
    pricePerMemberAnnual: formData.pricePerMemberAnnual,
    description: formData.description || "Plan description preview...",
    isActive: true,
    isTemplate: formData.isTemplate,
    features: {
      ...formData,
      maxStorageBytes: formData.maxStorageGB === -1 ? -1 : formData.maxStorageGB * 1024 * 1024 * 1024,
      canUseAttendance: formData.attendanceMode !== 'disabled',
      canUsePhysicalTerminals: ['biometric', 'both'].includes(formData.attendanceMode),
      canUseGeoFencing: ['software_geofence', 'both'].includes(formData.attendanceMode),
      canUseRemoteAttendance: ['software', 'software_geofence', 'both'].includes(formData.attendanceMode),
    } as any
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/super-admin?tab=plans')}
            className="h-9 w-9 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Create Subscription Plan</h1>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Modular Architecture
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure decoupled attendance, HR, payroll, Gantt, and unified workspace storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/super-admin?tab=plans')}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2 bg-primary shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Creating...' : 'Create Plan'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Configuration Columns (Span 2) */}
        <form onSubmit={handleSubmit} className="xl:col-span-2 space-y-6">

          {/* 1. Plan Basics & Pricing */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-lg">1. Plan Basics & Pricing</CardTitle>
              </div>
              <CardDescription>Name, description, and per-seat subscription rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Plan Name *</Label>
                <Input
                  id="plan-name"
                  placeholder="e.g. Professional Growth, Enterprise Scale, Starter Free"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan-desc">Description *</Label>
                <Textarea
                  id="plan-desc"
                  placeholder="Summarize the target audience and highlighted features..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="space-y-2">
                  <Label>Base Currency</Label>
                  <Select
                    value={formData.baseCurrency}
                    onValueChange={(val: any) => setFormData({ ...formData, baseCurrency: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NPR">NPR (रू)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Monthly / Member</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.pricePerMemberMonthly}
                    onChange={(e) => setFormData({ ...formData, pricePerMemberMonthly: parseIntInput(e.target.value, formData.pricePerMemberMonthly, 0) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Annual / Member</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.pricePerMemberAnnual}
                    onChange={(e) => setFormData({ ...formData, pricePerMemberAnnual: parseIntInput(e.target.value, formData.pricePerMemberAnnual, 0) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Core Capacity (The 3 Numbers) */}
          <Card className="shadow-sm border-blue-200/50 dark:border-blue-900/30">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">2. Core Capacity & Quotas</CardTitle>
              </div>
              <CardDescription>The fundamental operational limits for the workspace</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Team Seats (Members)</Label>
                  <Badge variant="outline" className="text-[10px]">{formData.maxMembers === -1 ? 'Unlimited' : `${formData.maxMembers} seats`}</Badge>
                </div>
                <Input
                  type="number"
                  value={formData.maxMembers}
                  onChange={(e) => setFormData({ ...formData, maxMembers: parseIntInput(e.target.value, formData.maxMembers, -1) })}
                  placeholder="-1 for Unlimited"
                />
                <p className="text-[11px] text-muted-foreground">-1 allows unlimited workspace members</p>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                    Unified Storage
                  </Label>
                  <Badge variant="outline" className="text-[10px]">{formData.maxStorageGB === -1 ? 'Unlimited' : `${formData.maxStorageGB} GB`}</Badge>
                </div>
                <Input
                  type="number"
                  value={formData.maxStorageGB}
                  onChange={(e) => setFormData({ ...formData, maxStorageGB: parseIntInput(e.target.value, formData.maxStorageGB, -1) })}
                  placeholder="-1 for Unlimited"
                />
                <p className="text-[11px] text-muted-foreground">Combined pool for files, attachments & docs</p>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Biometric Devices</Label>
                  <Badge variant="outline" className="text-[10px]">{formData.maxPhysicalTerminals === -1 ? 'Unlimited' : `${formData.maxPhysicalTerminals} units`}</Badge>
                </div>
                <Input
                  type="number"
                  disabled={formData.attendanceMode === 'disabled' || formData.attendanceMode === 'software'}
                  value={formData.maxPhysicalTerminals}
                  onChange={(e) => setFormData({ ...formData, maxPhysicalTerminals: parseIntInput(e.target.value, formData.maxPhysicalTerminals, -1) })}
                  placeholder="-1 for Unlimited"
                />
                <p className="text-[11px] text-muted-foreground">Max connected physical terminals</p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Attendance & Time (Decoupled from HR) */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <CardTitle className="text-lg">3. Attendance & Time Tracking</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">Independent from HR</Badge>
              </div>
              <CardDescription>Select the exact attendance mode for this plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Attendance Operating Mode</Label>
                <Select
                  value={formData.attendanceMode}
                  onValueChange={(val: any) => setFormData({ ...formData, attendanceMode: val })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select attendance mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">🚫 Attendance Disabled (No attendance features)</SelectItem>
                    <SelectItem value="software">📱 Software Attendance (Web & Mobile Self-Service Clock In/Out)</SelectItem>
                    <SelectItem value="software_geofence">📍 Software Attendance + GPS Geofencing (Radius Enforced)</SelectItem>
                    <SelectItem value="biometric">🏢 Biometric Hardware Terminals Only (ZKTeco / Hikvision ADMS)</SelectItem>
                    <SelectItem value="both">⚡ Hybrid Attendance (Both Software Punch & Biometric Hardware Terminals)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Shifts, Rostering & Overtime Rules</Label>
                  <p className="text-xs text-muted-foreground">Enable custom shifts, grace periods, and automatic overtime calculation</p>
                </div>
                <Switch
                  disabled={formData.attendanceMode === 'disabled'}
                  checked={formData.attendanceMode !== 'disabled' && formData.canUseShiftsAndRostering}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseShiftsAndRostering: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Field Operations & Desktop Tracking */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-lg">4. Field Operations & Desktop Tracking</CardTitle>
              </div>
              <CardDescription>GPS client site visits and desktop background time tracking</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Field GPS Site Visits</Label>
                  <p className="text-xs text-muted-foreground">Pinned destination client visits & travel verification</p>
                </div>
                <Switch
                  checked={formData.canUseFieldTracking}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseFieldTracking: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Desktop Activity Tracker</Label>
                  <p className="text-xs text-muted-foreground">Background desktop app & activity time tracking</p>
                </div>
                <Switch
                  checked={formData.canUseDesktopTracking}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseDesktopTracking: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 5. Core HR & People Operations (Decoupled from Attendance) */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  <CardTitle className="text-lg">5. Core HR & People Operations</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">Independent from Attendance</Badge>
              </div>
              <CardDescription>Employee lifecycle, directory, policies, and document records</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Core HR & Directory</Label>
                  <p className="text-xs text-muted-foreground">Employee records, designations & department org chart</p>
                </div>
                <Switch
                  checked={formData.canUseHrCore}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseHrCore: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Leave Management & PTO</Label>
                  <p className="text-xs text-muted-foreground">Paid time off policies, leave requests & approval flow</p>
                </div>
                <Switch
                  checked={formData.canUseLeaveManagement}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseLeaveManagement: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Onboarding & Offboarding</Label>
                  <p className="text-xs text-muted-foreground">Structured joining and exit task checklists</p>
                </div>
                <Switch
                  checked={formData.canUseOnboardingOffboarding}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseOnboardingOffboarding: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Company Documents & Policies</Label>
                  <p className="text-xs text-muted-foreground">Centralized company handbooks and NDAs</p>
                </div>
                <Switch
                  checked={formData.canUseCompanyDocuments}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseCompanyDocuments: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 6. Payroll & Finance */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-700" />
                <CardTitle className="text-lg">6. Payroll & Finance</CardTitle>
              </div>
              <CardDescription>Salary computation, tax/SSF deductions, and reimbursement claims</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Payroll Engine & Payslips</Label>
                  <p className="text-xs text-muted-foreground">Salary runs, deductions, allowances & PDF payslips</p>
                </div>
                <Switch
                  checked={formData.canUsePayroll}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUsePayroll: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Expense Claims & Reimbursements</Label>
                  <p className="text-xs text-muted-foreground">Receipt uploads, claim workflows & disbursement tracking</p>
                </div>
                <Switch
                  checked={formData.canUseExpenseClaims}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseExpenseClaims: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 7. Work Management & Projects (ClickUp/Jira Style) */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">7. Work Management & Projects</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs text-emerald-600 bg-emerald-50 border-emerald-200">
                  Tasks, Folders & Lists Unlimited
                </Badge>
              </div>
              <CardDescription>Tasks, spaces, and boards are unmetered. Gate capability tiers here.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Interactive Gantt Chart</Label>
                  <p className="text-xs text-muted-foreground">Dependencies & timelines</p>
                </div>
                <Switch
                  checked={formData.canUseGanttChart}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseGanttChart: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Custom Tables & Sheets</Label>
                  <p className="text-xs text-muted-foreground">Spreadsheet database grid</p>
                </div>
                <Switch
                  checked={formData.canCreateTables}
                  onCheckedChange={(checked) => setFormData({ ...formData, canCreateTables: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Custom Roles & Permissions</Label>
                  <p className="text-xs text-muted-foreground">Granular role builder</p>
                </div>
                <Switch
                  checked={formData.canUseCustomRoles}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseCustomRoles: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 8. Team Chat & Messaging (Slack Style) */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-500" />
                <CardTitle className="text-lg">8. Team Chat & Collaboration</CardTitle>
              </div>
              <CardDescription>Real-time messaging, channels, and message retention policy</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Private Restricted Channels</Label>
                  <p className="text-xs text-muted-foreground">Restricted to invited members only</p>
                </div>
                <Switch
                  checked={formData.canCreatePrivateChannels}
                  onCheckedChange={(checked) => setFormData({ ...formData, canCreatePrivateChannels: checked })}
                />
              </div>

              <div className="space-y-1.5 p-3 border rounded-xl">
                <Label className="text-sm font-medium">Message Retention History</Label>
                <Select
                  value={String(formData.chatHistoryDays)}
                  onValueChange={(val) => setFormData({ ...formData, chatHistoryDays: Number(val) })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select history retention" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">Unlimited History (Slack Pro style)</SelectItem>
                    <SelectItem value="90">90-Day History (Slack Free style)</SelectItem>
                    <SelectItem value="30">30-Day History</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 9. Developer & QA Tools */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-lg">9. Developer & QA Tools</CardTitle>
              </div>
              <CardDescription>GitHub synchronization, QA testing suites, and webhooks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <div>
                    <Label className="text-sm font-medium">GitHub Integration</Label>
                    <p className="text-xs text-muted-foreground">Sync PRs, branches and commits to tasks</p>
                  </div>
                  <Switch
                    checked={formData.canUseGithubIntegration}
                    onCheckedChange={(checked) => setFormData({ ...formData, canUseGithubIntegration: checked })}
                  />
                </div>

                <div className="space-y-1.5 p-3 border rounded-xl">
                  <Label className="text-sm font-medium">Max Synced Repositories</Label>
                  <Input
                    type="number"
                    disabled={!formData.canUseGithubIntegration}
                    value={formData.maxGithubRepositories}
                    onChange={(e) => setFormData({ ...formData, maxGithubRepositories: parseIntInput(e.target.value, formData.maxGithubRepositories, -1) })}
                    placeholder="-1 for Unlimited"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-xl">
                  <div>
                    <Label className="text-sm font-medium">QA Testing Module</Label>
                    <p className="text-xs text-muted-foreground">Test cases, runs, and defect management</p>
                  </div>
                  <Switch
                    checked={formData.canUseQaModule}
                    onCheckedChange={(checked) => setFormData({ ...formData, canUseQaModule: checked })}
                  />
                </div>

                <div className="space-y-1.5 p-3 border rounded-xl">
                  <Label className="text-sm font-medium">Max QA Test Suites</Label>
                  <Input
                    type="number"
                    disabled={!formData.canUseQaModule}
                    value={formData.maxQaSuites}
                    onChange={(e) => setFormData({ ...formData, maxQaSuites: parseIntInput(e.target.value, formData.maxQaSuites, -1) })}
                    placeholder="-1 for Unlimited"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Outgoing Webhooks</Label>
                  <p className="text-xs text-muted-foreground">Event notifications to external systems</p>
                </div>
                <Switch
                  checked={formData.canUseWebhooks}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseWebhooks: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 10. Security, Compliance & Reporting */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-lg">10. Security, Compliance & Analytics</CardTitle>
              </div>
              <CardDescription>Export permissions, security logs, and analytics depth</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Report Exports</Label>
                  <p className="text-xs text-muted-foreground">PDF / XLSX / CSV</p>
                </div>
                <Switch
                  checked={formData.canExportReports}
                  onCheckedChange={(checked) => setFormData({ ...formData, canExportReports: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Audit Logs</Label>
                  <p className="text-xs text-muted-foreground">Action change trails</p>
                </div>
                <Switch
                  checked={formData.canViewAuditLogs}
                  onCheckedChange={(checked) => setFormData({ ...formData, canViewAuditLogs: checked })}
                />
              </div>

              <div className="space-y-1.5 p-3 border rounded-xl">
                <Label className="text-sm font-medium">Analytics Tier</Label>
                <Select
                  value={formData.analyticsTier}
                  onValueChange={(val: any) => setFormData({ ...formData, analyticsTier: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic Analytics</SelectItem>
                    <SelectItem value="full">Full Analytics & Insights</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 11. Reusable Template Configuration */}
          <Card className="border-amber-200/80 bg-amber-50/10 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-lg">11. Reusable Template Shelf</CardTitle>
              </div>
              <CardDescription>Publish this plan to the 1-click starter template showcase</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-xl bg-card">
                <div>
                  <Label className="text-sm font-medium">Save as Reusable Template</Label>
                  <p className="text-xs text-muted-foreground">Shows up as a starter template card</p>
                </div>
                <Switch
                  checked={formData.isTemplate}
                  onCheckedChange={(checked) => setFormData({ ...formData, isTemplate: checked })}
                />
              </div>

              <div className="space-y-1.5 p-3 border rounded-xl bg-card">
                <Label className="text-sm font-medium">Template Category</Label>
                <Select
                  disabled={!formData.isTemplate}
                  value={formData.templateCategory}
                  onValueChange={(val: any) => setFormData({ ...formData, templateCategory: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter Program (Free)</SelectItem>
                    <SelectItem value="business">Business / Growth</SelectItem>
                    <SelectItem value="enterprise">Enterprise Scale</SelectItem>
                    <SelectItem value="custom">Custom Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Optional Collapsible: Advanced Micro-Quotas */}
          <Collapsible open={showAdvancedQuotas} onOpenChange={setShowAdvancedQuotas}>
            <div className="border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/20">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex items-center justify-between p-0 h-auto font-semibold text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Advanced Granular Quotas (Optional / Edge Cases)</span>
                  </div>
                  {showAdvancedQuotas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="pt-4 space-y-4">
                <p className="text-xs text-muted-foreground">
                  By default, Tasks, Spaces, Folders, and Lists are unlimited (-1). You can override them here if you need a specialized limited trial tier.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <Label className="text-xs">Max Workspaces</Label>
                    <Input
                      type="number"
                      value={formData.maxWorkspaces}
                      onChange={(e) => setFormData({ ...formData, maxWorkspaces: parseIntInput(e.target.value, formData.maxWorkspaces, -1) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Spaces</Label>
                    <Input
                      type="number"
                      value={formData.maxSpaces}
                      onChange={(e) => setFormData({ ...formData, maxSpaces: parseIntInput(e.target.value, formData.maxSpaces, -1) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Lists</Label>
                    <Input
                      type="number"
                      value={formData.maxLists}
                      onChange={(e) => setFormData({ ...formData, maxLists: parseIntInput(e.target.value, formData.maxLists, -1) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Folders</Label>
                    <Input
                      type="number"
                      value={formData.maxFolders}
                      onChange={(e) => setFormData({ ...formData, maxFolders: parseIntInput(e.target.value, formData.maxFolders, -1) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Tasks</Label>
                    <Input
                      type="number"
                      value={formData.maxTasks}
                      onChange={(e) => setFormData({ ...formData, maxTasks: parseIntInput(e.target.value, formData.maxTasks, -1) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Admins</Label>
                    <Input
                      type="number"
                      value={formData.maxAdmins}
                      onChange={(e) => setFormData({ ...formData, maxAdmins: parseIntInput(e.target.value, formData.maxAdmins, -1) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Message Limit</Label>
                    <Input
                      type="number"
                      value={formData.messageLimit}
                      onChange={(e) => setFormData({ ...formData, messageLimit: parseIntInput(e.target.value, formData.messageLimit, -1) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Announcement Cooldown (h)</Label>
                    <Input
                      type="number"
                      value={formData.announcementCooldown}
                      onChange={(e) => setFormData({ ...formData, announcementCooldown: parseIntInput(e.target.value, formData.announcementCooldown, 0) })}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/super-admin?tab=plans')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="gap-2 px-6"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Creating Plan...' : 'Save & Publish Plan'}
            </Button>
          </div>
        </form>

        {/* Live Plan Preview (Sticky Sidebar on Right) */}
        <div className="xl:col-span-1">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Live Plan Preview</h3>
            </div>

            <Card className="shadow-md border-primary/20 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500" />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-xl">{previewPlan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <CurrencyDisplay 
                        amount={previewPlan.pricePerMemberMonthly || 0} 
                        baseCurrency={previewPlan.baseCurrency}
                        className="text-2xl font-black text-primary"
                      />
                      <span className="text-xs text-muted-foreground">/member/mo</span>
                    </div>
                  </div>
                  {previewPlan.isTemplate && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px]">
                      TEMPLATE
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <p className="text-xs text-muted-foreground line-clamp-3 italic">
                  "{previewPlan.description}"
                </p>

                <div className="border-t pt-3 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Key Capabilities</div>
                  <div className="space-y-1.5 text-xs">
                    {getPlanFeatureLines(previewPlan).slice(0, 10).map((line, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="truncate">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
