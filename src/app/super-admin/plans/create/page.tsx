"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArchiveIcon, IdCardIcon, CubeIcon, ListBulletIcon, FileIcon, CheckboxIcon, BellIcon, ChatBubbleIcon, LockClosedIcon, PersonIcon, CounterClockwiseClockIcon, TableIcon, FileTextIcon, LockOpen1Icon, ChevronDownIcon } from "@radix-ui/react-icons";
import { Shield, ArrowLeft } from "lucide-react";
import { CurrencyDisplay } from "@/components/currency/CurrencyDisplay";
import { getPlanFeatureLines } from "@/lib/planFeatures";
import { Plan } from "@/types";

export default function CreatePlanPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
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
    maxWorkspaces: 1,
    maxMembers: 5,
    maxAdmins: 1,
    maxSpaces: 10,
    maxLists: 50,
    maxFolders: 20,
    maxTasks: 100,
    hasAccessControl: false,
    hasGroupChat: false,
    messageLimit: 100,
    announcementCooldown: 24,
    accessControlTier: 'basic' as 'basic' | 'pro' | 'advanced',
    canUseCustomRoles: false,
    maxCustomRoles: -1,
    canUsePredefinedRoles: true,
    maxPredefinedRoles: -1,
    canCreateTables: false,
    maxTablesCount: -1,
    maxRowsLimit: -1,
    maxColumnsLimit: -1,
    maxFiles: -1,
    maxDocuments: -1,
    maxDirectMessagesPerUser: -1,
    canCreatePrivateChannels: false,
    maxPrivateChannelsCount: -1,
    maxMembersPerPrivateChannel: -1,
    canUseWebhooks: false,
    canUseAdvancedAnalytics: false,
    canUseAttendance: true,
    canUseFileSharing: true,
    canUseNotificationPreferences: true,
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const isSuperUser = localStorage.getItem("isSuperUser") === "true";
    
    if (!token || !isSuperUser) {
      router.push("/super-admin");
      return;
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

    const payload: any = {
      name: formData.name.trim(),
      baseCurrency: formData.baseCurrency,
      pricePerMemberMonthly: Number(formData.pricePerMemberMonthly),
      pricePerMemberAnnual: Number(formData.pricePerMemberAnnual),
      description: formData.description.trim(),
      features: {
        maxWorkspaces: Number(formData.maxWorkspaces),
        maxMembers: Number(formData.maxMembers),
        maxAdmins: Number(formData.maxAdmins),
        maxSpaces: Number(formData.maxSpaces),
        maxLists: Number(formData.maxLists),
        maxFolders: Number(formData.maxFolders),
        maxTasks: Number(formData.maxTasks),
        hasAccessControl: Boolean(formData.hasAccessControl),
        hasGroupChat: Boolean(formData.hasGroupChat),
        messageLimit: Number(formData.messageLimit),
        announcementCooldown: Number(formData.announcementCooldown),
        accessControlTier: formData.accessControlTier,
        canUseCustomRoles: Boolean(formData.canUseCustomRoles),
        maxCustomRoles: Number(formData.maxCustomRoles),
        canUsePredefinedRoles: Boolean(formData.canUsePredefinedRoles),
        maxPredefinedRoles: Number(formData.maxPredefinedRoles),
        canCreateTables: Boolean(formData.canCreateTables),
        maxTablesCount: Number(formData.maxTablesCount),
        maxRowsLimit: Number(formData.maxRowsLimit),
        maxColumnsLimit: Number(formData.maxColumnsLimit),
        maxFiles: Number(formData.maxFiles),
        maxDocuments: Number(formData.maxDocuments),
        maxDirectMessagesPerUser: Number(formData.maxDirectMessagesPerUser),
        canCreatePrivateChannels: Boolean(formData.canCreatePrivateChannels),
        maxPrivateChannelsCount: Number(formData.maxPrivateChannelsCount),
        maxMembersPerPrivateChannel: Number(formData.maxMembersPerPrivateChannel),
        canUseWebhooks: Boolean(formData.canUseWebhooks),
        canUseAdvancedAnalytics: Boolean(formData.canUseAdvancedAnalytics),
        canUseAttendance: Boolean(formData.canUseAttendance),
        canUseFileSharing: Boolean(formData.canUseFileSharing),
        canUseNotificationPreferences: Boolean(formData.canUseNotificationPreferences),
      },
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

  // Helper for the live preview
  const previewPlan: Plan = {
    _id: "preview",
    name: formData.name || "Plan Name",
    description: formData.description || "Plan description goes here...",
    price: formData.pricePerMemberMonthly,
    basePrice: formData.pricePerMemberMonthly,
    baseCurrency: formData.baseCurrency,
    pricePerMemberMonthly: formData.pricePerMemberMonthly,
    pricePerMemberAnnual: formData.pricePerMemberAnnual,
    isActive: true,
    features: {
      maxWorkspaces: formData.maxWorkspaces,
      maxMembers: formData.maxMembers,
      maxAdmins: formData.maxAdmins,
      maxSpaces: formData.maxSpaces,
      maxLists: formData.maxLists,
      maxFolders: formData.maxFolders,
      maxTasks: formData.maxTasks,
      hasAccessControl: formData.hasAccessControl,
      hasGroupChat: formData.hasGroupChat,
      messageLimit: formData.messageLimit,
      announcementCooldown: formData.announcementCooldown,
      accessControlTier: formData.accessControlTier,
      canUseCustomRoles: formData.canUseCustomRoles,
      maxCustomRoles: formData.maxCustomRoles,
      canUsePredefinedRoles: formData.canUsePredefinedRoles,
      maxPredefinedRoles: formData.maxPredefinedRoles,
      canCreateTables: formData.canCreateTables,
      maxTablesCount: formData.maxTablesCount,
      maxRowsLimit: formData.maxRowsLimit,
      maxColumnsLimit: formData.maxColumnsLimit,
      maxFiles: formData.maxFiles,
      maxDocuments: formData.maxDocuments,
      maxDirectMessagesPerUser: formData.maxDirectMessagesPerUser,
      canCreatePrivateChannels: formData.canCreatePrivateChannels,
      maxPrivateChannelsCount: formData.maxPrivateChannelsCount,
      maxMembersPerPrivateChannel: formData.maxMembersPerPrivateChannel,
      canUseWebhooks: formData.canUseWebhooks,
      canUseAdvancedAnalytics: formData.canUseAdvancedAnalytics,
      canUseAttendance: formData.canUseAttendance,
      canUseFileSharing: formData.canUseFileSharing,
      canUseNotificationPreferences: formData.canUseNotificationPreferences,
    }
  };

  const LimitInput = ({ label, icon, field, value }: { label: string, icon: any, field: string, value: number }) => {
    const isUnlimited = value === -1;
    const Icon = icon;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {label}
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Unlimited</span>
            <Switch 
              checked={isUnlimited}
              onCheckedChange={(checked) => {
                setFormData({ ...formData, [field]: checked ? -1 : 0 });
              }}
            />
          </div>
        </div>
        {!isUnlimited && (
          <Input
            type="number"
            value={value}
            min="0"
            onChange={(e) => setFormData({ ...formData, [field]: parseIntInput(e.target.value, value, 0) })}
            required
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/super-admin?tab=plans')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Create New Plan</h1>
            <p className="text-sm md:text-base text-muted-foreground">Minimal plan builder for admins</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Pro, Business, Enterprise"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseCurrency">Base Currency *</Label>
                <Select 
                  value={formData.baseCurrency} 
                  onValueChange={(value: 'USD' | 'NPR') => 
                    setFormData({ ...formData, baseCurrency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NPR">NPR (रू)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerMemberMonthly">Monthly Price (Per Member) *</Label>
                  <Input
                    id="pricePerMemberMonthly"
                    type="number"
                    placeholder="0"
                    value={formData.pricePerMemberMonthly}
                    onChange={(e) => setFormData({ ...formData, pricePerMemberMonthly: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Price per member per month
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerMemberAnnual">Annual Price (Per Member) *</Label>
                  <Input
                    id="pricePerMemberAnnual"
                    type="number"
                    placeholder="0"
                    value={formData.pricePerMemberAnnual}
                    onChange={(e) => setFormData({ ...formData, pricePerMemberAnnual: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Price per member per year (typically 10-11 months worth)
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this plan"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Resource Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Limits</CardTitle>
              <CardDescription>Set limits for workspaces, members, and content (-1 for unlimited)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <LimitInput label="Max Workspaces" icon={ArchiveIcon} field="maxWorkspaces" value={formData.maxWorkspaces} />
                <LimitInput label="Max Members" icon={PersonIcon} field="maxMembers" value={formData.maxMembers} />
                <LimitInput label="Max Admins" icon={Shield} field="maxAdmins" value={formData.maxAdmins} />
                <LimitInput label="Max Spaces" icon={CubeIcon} field="maxSpaces" value={formData.maxSpaces} />
                <LimitInput label="Max Lists" icon={ListBulletIcon} field="maxLists" value={formData.maxLists} />
                <LimitInput label="Max Folders" icon={FileIcon} field="maxFolders" value={formData.maxFolders} />
                <LimitInput label="Max Tasks" icon={CheckboxIcon} field="maxTasks" value={formData.maxTasks} />
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <BellIcon className="w-4 h-4" />
                    Announcement Cooldown (hours)
                  </Label>
                  <Input
                    type="number"
                    value={formData.announcementCooldown}
                    min="0"
                    onChange={(e) => setFormData({ ...formData, announcementCooldown: parseIntInput(e.target.value, formData.announcementCooldown, 0) })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communication Features */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Team Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <ChatBubbleIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="groupChat" className="cursor-pointer">Enable Group Chat</Label>
                    <p className="text-xs text-muted-foreground">Allow team-wide real-time messaging</p>
                  </div>
                </div>
                <Switch
                  checked={formData.hasGroupChat}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasGroupChat: checked })}
                />
              </div>
              
              {formData.hasGroupChat && (
                <div className="space-y-4 ml-4 pl-4 border-l-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ChatBubbleIcon className="w-4 h-4" />
                      Message Limit (monthly)
                    </Label>
                    <Input
                      type="number"
                      value={formData.messageLimit}
                      min="-1"
                      onChange={(e) => setFormData({ ...formData, messageLimit: parseIntInput(e.target.value, formData.messageLimit) })}
                      required
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Private Groups</Label>
                      <p className="text-xs text-muted-foreground">Allow creating restricted private channels</p>
                    </div>
                    <Switch
                      checked={formData.canCreatePrivateChannels}
                      onCheckedChange={(checked) => setFormData({ ...formData, canCreatePrivateChannels: checked })}
                    />
                  </div>

                  {formData.canCreatePrivateChannels && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
                      <LimitInput label="Max Private Groups" icon={LockClosedIcon} field="maxPrivateChannelsCount" value={formData.maxPrivateChannelsCount} />
                      <LimitInput label="Max Members Per Group" icon={PersonIcon} field="maxMembersPerPrivateChannel" value={formData.maxMembersPerPrivateChannel} />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Access Control */}
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>Enable first, then choose which permission tier applies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <LockOpen1Icon className="w-4 h-4" />
                    <Label className="cursor-pointer">Enable Access Control</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When disabled, pricing/plan pages will show Access Control as unavailable
                  </p>
                </div>
                <Switch
                  checked={formData.hasAccessControl}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      hasAccessControl: checked,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LockClosedIcon className="w-4 h-4" />
                  Access Control Tier
                </Label>
                <Select
                  value={formData.accessControlTier}
                  onValueChange={(value: 'basic' | 'pro' | 'advanced') => setFormData({ ...formData, accessControlTier: value, hasAccessControl: true })}
                  disabled={!formData.hasAccessControl}
                >
                  <SelectTrigger disabled={!formData.hasAccessControl}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic - List members get "Full Access" only</SelectItem>
                    <SelectItem value="pro">Pro - List members can have "Full Access" or "Can Edit"</SelectItem>
                    <SelectItem value="advanced">Advanced - Full control: "Full Access", "Can Edit", or "View Only"</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.hasAccessControl
                    ? 'Controls which permission levels can be assigned to list members'
                    : 'Turn on "Enable Access Control" to apply a tier.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Custom Roles */}
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Configure custom and predefined role limits (-1 for unlimited)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PersonIcon className="w-4 h-4" />
                    <Label htmlFor="customRoles" className="cursor-pointer">Enable Custom Display Roles</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allow workspace owners to assign custom role titles to members
                  </p>
                </div>
                <Switch
                  checked={formData.canUseCustomRoles}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseCustomRoles: checked })}
                />
              </div>
              
              {formData.canUseCustomRoles && (
                <div className="space-y-2 ml-4 pl-4 border-l-2">
                  <LimitInput label="Max Custom Roles" icon={CounterClockwiseClockIcon} field="maxCustomRoles" value={formData.maxCustomRoles} />
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PersonIcon className="w-4 h-4" />
                    <Label htmlFor="predefinedRoles" className="cursor-pointer">Enable Predefined Role Titles</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allow selecting from predefined role titles (PM, COO, DEV, etc.)
                  </p>
                </div>
                <Switch
                  checked={formData.canUsePredefinedRoles}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUsePredefinedRoles: checked })}
                />
              </div>

              {formData.canUsePredefinedRoles && (
                <div className="space-y-2 ml-4 pl-4 border-l-2">
                  <LimitInput label="Max Predefined Roles" icon={CounterClockwiseClockIcon} field="maxPredefinedRoles" value={formData.maxPredefinedRoles} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Tables */}
          <Card>
            <CardHeader>
              <CardTitle>Customizable Tables</CardTitle>
              <CardDescription>Pro feature for spreadsheet-like tables (-1 for unlimited)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4" />
                    <Label htmlFor="customTables" className="cursor-pointer">Enable Customizable Tables</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allow users to create spreadsheet-like tables with custom columns and colored cells
                  </p>
                </div>
                <Switch
                  checked={formData.canCreateTables}
                  onCheckedChange={(checked) => setFormData({ ...formData, canCreateTables: checked })}
                />
              </div>
              
              {formData.canCreateTables && (
                <div className="space-y-4 ml-4 pl-4 border-l-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <LimitInput label="Max Tables" icon={TableIcon} field="maxTablesCount" value={formData.maxTablesCount} />
                    <LimitInput label="Max Rows" icon={TableIcon} field="maxRowsLimit" value={formData.maxRowsLimit} />
                    <LimitInput label="Max Columns" icon={TableIcon} field="maxColumnsLimit" value={formData.maxColumnsLimit} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Content Limits</CardTitle>
              <CardDescription>Set limits for files, documents, and direct messages (-1 for unlimited)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <LimitInput label="Max Files" icon={FileIcon} field="maxFiles" value={formData.maxFiles} />
                <LimitInput label="Max Documents" icon={FileTextIcon} field="maxDocuments" value={formData.maxDocuments} />
                <LimitInput label="Max DMs" icon={ChatBubbleIcon} field="maxDirectMessagesPerUser" value={formData.maxDirectMessagesPerUser} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Feature Access</CardTitle>
              <CardDescription>Turn platform modules on/off for this plan</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label className="text-sm">Webhooks</Label>
                <Switch
                  checked={formData.canUseWebhooks}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseWebhooks: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label className="text-sm">Advanced Analytics</Label>
                <Switch
                  checked={formData.canUseAdvancedAnalytics}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseAdvancedAnalytics: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label className="text-sm">Attendance</Label>
                <Switch
                  checked={formData.canUseAttendance}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseAttendance: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label className="text-sm">File Sharing</Label>
                <Switch
                  checked={formData.canUseFileSharing}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseFileSharing: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg md:col-span-2">
                <Label className="text-sm">Notification Preferences</Label>
                <Switch
                  checked={formData.canUseNotificationPreferences}
                  onCheckedChange={(checked) => setFormData({ ...formData, canUseNotificationPreferences: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-gray-50/95 dark:bg-background/95 backdrop-blur py-3 border-t">
            <Button type="submit" className="sm:flex-1 h-11" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Plan'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="h-11"
              onClick={() => router.push('/super-admin?tab=plans')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
          </form>

          <aside className="xl:sticky xl:top-6 h-fit">
            <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Live Plan Preview
                </CardTitle>
                <CardDescription>How this will look to users</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {/* Simulated Plan Card */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{previewPlan.name}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <CurrencyDisplay 
                            amount={previewPlan.pricePerMemberMonthly || 0} 
                            baseCurrency={previewPlan.baseCurrency}
                            className="text-2xl font-bold text-primary"
                          />
                          <span className="text-xs text-muted-foreground">/member/mo</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <p className="text-xs text-muted-foreground line-clamp-3 italic">
                      "{previewPlan.description}"
                    </p>
                    <div className="space-y-1.5 text-[10px]">
                      {getPlanFeatureLines(previewPlan).slice(0, 8).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                          <ArchiveIcon className="w-2.5 h-2.5 flex-shrink-0 text-primary/50" />
                          <span>{feature}</span>
                        </div>
                      ))}
                      <div className="pt-1 flex items-center gap-1 text-primary font-medium text-[9px] uppercase">
                        <ChevronDownIcon className="w-3 h-3" /> 
                        Plus {Math.max(0, getPlanFeatureLines(previewPlan).length - 8)} more features
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="mt-6 space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Plan Highlights
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-muted/50 border text-[10px]">
                      <div className="text-muted-foreground mb-0.5">Annual Discount</div>
                      <div className="font-bold">
                        {formData.pricePerMemberAnnual < (formData.pricePerMemberMonthly * 12) ? (
                          <span className="text-green-600">
                            Save {Math.round((1 - formData.pricePerMemberAnnual / (formData.pricePerMemberMonthly * 12)) * 100)}%
                          </span>
                        ) : "None"}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-muted/50 border text-[10px]">
                      <div className="text-muted-foreground mb-0.5">Access Tier</div>
                      <div className="font-bold capitalize">{formData.hasAccessControl ? formData.accessControlTier : "Disabled"}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
