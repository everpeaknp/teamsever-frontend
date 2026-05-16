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
import { ArchiveIcon, ComponentInstanceIcon, ListBulletIcon, FileIcon, CheckboxIcon, BellIcon, ChatBubbleIcon, LockClosedIcon, PersonIcon, CounterClockwiseClockIcon, TableIcon, FileTextIcon, LockOpen1Icon } from "@radix-ui/react-icons";
import { Shield, ArrowLeft } from "lucide-react";

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
        maxCustomRoles: Number(formData.maxCustomRoles) || -1,
        canUsePredefinedRoles: Boolean(formData.canUsePredefinedRoles),
        maxPredefinedRoles: Number(formData.maxPredefinedRoles) || -1,
        canCreateTables: Boolean(formData.canCreateTables),
        maxTablesCount: Number(formData.maxTablesCount) || -1,
        maxRowsLimit: Number(formData.maxRowsLimit) || -1,
        maxColumnsLimit: Number(formData.maxColumnsLimit) || -1,
        maxFiles: Number(formData.maxFiles) || -1,
        maxDocuments: Number(formData.maxDocuments) || -1,
        maxDirectMessagesPerUser: Number(formData.maxDirectMessagesPerUser) || -1,
        canCreatePrivateChannels: Boolean(formData.canCreatePrivateChannels),
        maxPrivateChannelsCount: Number(formData.maxPrivateChannelsCount) || -1,
        maxMembersPerPrivateChannel: Number(formData.maxMembersPerPrivateChannel) || -1,
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ArchiveIcon className="w-4 h-4" />
                    Max Workspaces
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxWorkspaces}
                    min="-1"
                    onChange={(e) => setFormData({ ...formData, maxWorkspaces: parseIntInput(e.target.value, formData.maxWorkspaces) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <PersonIcon className="w-4 h-4" />
                    Max Members per Workspace
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxMembers}
                    min="-1"
                    onChange={(e) => setFormData({ ...formData, maxMembers: parseIntInput(e.target.value, formData.maxMembers) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Max Admins
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxAdmins}
                    min="-1"
                    onChange={(e) => setFormData({ ...formData, maxAdmins: parseIntInput(e.target.value, formData.maxAdmins) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ComponentInstanceIcon className="w-4 h-4" />
                    Max Spaces
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxSpaces}
                    min="-1"
                    onChange={(e) => setFormData({ ...formData, maxSpaces: parseIntInput(e.target.value, formData.maxSpaces) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ListBulletIcon className="w-4 h-4" />
                    Max Lists
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxLists}
                    min="-1"
                    onChange={(e) => setFormData({ ...formData, maxLists: parseIntInput(e.target.value, formData.maxLists) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4" />
                    Max Folders
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxFolders}
                    min="-1"
                    onChange={(e) => setFormData({ ...formData, maxFolders: parseIntInput(e.target.value, formData.maxFolders) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CheckboxIcon className="w-4 h-4" />
                    Max Tasks
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxTasks}
                    min="-1"
                    onChange={(e) => setFormData({ ...formData, maxTasks: parseIntInput(e.target.value, formData.maxTasks) })}
                    required
                  />
                </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs">
                          <LockClosedIcon className="w-3 h-3" />
                          Max Private Groups
                        </Label>
                        <Input
                          type="number"
                          value={formData.maxPrivateChannelsCount}
                          onChange={(e) => setFormData({ ...formData, maxPrivateChannelsCount: parseIntInput(e.target.value, formData.maxPrivateChannelsCount) })}
                          className="h-8 text-xs"
                          placeholder="-1 for unlimited"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs">
                          <PersonIcon className="w-3 h-3" />
                          Max Members Per Group
                        </Label>
                        <Input
                          type="number"
                          value={formData.maxMembersPerPrivateChannel}
                          onChange={(e) => setFormData({ ...formData, maxMembersPerPrivateChannel: parseIntInput(e.target.value, formData.maxMembersPerPrivateChannel) })}
                          className="h-8 text-xs"
                          placeholder="-1 for unlimited"
                        />
                      </div>
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
                  <Label className="flex items-center gap-2">
                    <CounterClockwiseClockIcon className="w-4 h-4" />
                    Max Custom Roles per Workspace
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxCustomRoles}
                    onChange={(e) => setFormData({ ...formData, maxCustomRoles: parseIntInput(e.target.value, formData.maxCustomRoles) })}
                    min="-1"
                    required
                  />
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
                  <Label className="flex items-center gap-2">
                    <CounterClockwiseClockIcon className="w-4 h-4" />
                    Max Predefined Roles per Workspace
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxPredefinedRoles}
                    onChange={(e) => setFormData({ ...formData, maxPredefinedRoles: parseIntInput(e.target.value, formData.maxPredefinedRoles) })}
                    min="-1"
                    required
                  />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Tables per Space</Label>
                      <Input
                        type="number"
                        value={formData.maxTablesCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || val === '-' || val === '-1') {
                            setFormData({ ...formData, maxTablesCount: val === '' ? -1 : parseInt(val) || -1 });
                          } else {
                            const num = parseInt(val);
                            if (!isNaN(num)) setFormData({ ...formData, maxTablesCount: num });
                          }
                        }}
                        min="-1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Rows per Table</Label>
                      <Input
                        type="number"
                        value={formData.maxRowsLimit}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || val === '-' || val === '-1') {
                            setFormData({ ...formData, maxRowsLimit: val === '' ? -1 : parseInt(val) || -1 });
                          } else {
                            const num = parseInt(val);
                            if (!isNaN(num)) setFormData({ ...formData, maxRowsLimit: num });
                          }
                        }}
                        min="-1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Columns per Table</Label>
                      <Input
                        type="number"
                        value={formData.maxColumnsLimit}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || val === '-' || val === '-1') {
                            setFormData({ ...formData, maxColumnsLimit: val === '' ? -1 : parseInt(val) || -1 });
                          } else {
                            const num = parseInt(val);
                            if (!isNaN(num)) setFormData({ ...formData, maxColumnsLimit: num });
                          }
                        }}
                        min="-1"
                      />
                    </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4" />
                    Max Files
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxFiles}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || val === '-' || val === '-1') {
                        setFormData({ ...formData, maxFiles: val === '' ? -1 : parseInt(val) || -1 });
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num)) setFormData({ ...formData, maxFiles: num });
                      }
                    }}
                    min="-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileTextIcon className="w-4 h-4" />
                    Max Documents
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxDocuments}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || val === '-' || val === '-1') {
                        setFormData({ ...formData, maxDocuments: val === '' ? -1 : parseInt(val) || -1 });
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num)) setFormData({ ...formData, maxDocuments: num });
                      }
                    }}
                    min="-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ChatBubbleIcon className="w-4 h-4" />
                    Max DMs Per User
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxDirectMessagesPerUser}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || val === '-' || val === '-1') {
                        setFormData({ ...formData, maxDirectMessagesPerUser: val === '' ? -1 : parseInt(val) || -1 });
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num)) setFormData({ ...formData, maxDirectMessagesPerUser: num });
                      }
                    }}
                    min="-1"
                  />
                </div>
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Summary</CardTitle>
                <CardDescription>Live preview while you configure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{formData.name || "Untitled"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span className="font-medium">{formData.baseCurrency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Monthly/member</span>
                  <span className="font-medium">
                    {formData.baseCurrency === "NPR" ? "NPR" : "$"} {formData.pricePerMemberMonthly || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Annual/member</span>
                  <span className="font-medium">
                    {formData.baseCurrency === "NPR" ? "NPR" : "$"} {formData.pricePerMemberAnnual || 0}
                  </span>
                </div>
                <Separator />
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>- Use `-1` for unlimited on limits.</p>
                  <p>- Keep only essential toggles enabled per plan tier.</p>
                  <p>- Recommend setting annual price lower than 12x monthly.</p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
