"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArchiveIcon, IdCardIcon, CubeIcon, ListBulletIcon, FileIcon, CheckboxIcon, BellIcon, ChatBubbleIcon, LockClosedIcon, PersonIcon, CounterClockwiseClockIcon, TableIcon, FileTextIcon, LockOpen1Icon } from "@radix-ui/react-icons";
import { Shield, ArrowLeft, Loader2 } from "lucide-react";
import { Plan } from "@/types";


export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    baseCurrency: 'NPR' as 'USD' | 'NPR',
    pricePerMemberMonthly: 0,
    pricePerMemberAnnual: 0,
    description: "",
    maxMembers: 5,
    maxWorkspaces: 1,
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
  });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const isSuperUser = localStorage.getItem("isSuperUser") === "true";
    
    if (!token || !isSuperUser) {
      router.push("/super-admin");
      return;
    }

    fetchPlan();
  }, [router, planId]);

  const fetchPlan = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const plan = data.data;
        
        setFormData({
          name: plan.name,
          baseCurrency: plan.baseCurrency || 'NPR',
          pricePerMemberMonthly: plan.pricePerMemberMonthly || plan.basePrice || plan.price || 0,
          pricePerMemberAnnual: plan.pricePerMemberAnnual || (plan.basePrice || plan.price || 0) * 10,
          description: plan.description,
          maxMembers: plan.features.maxMembers ?? 5,
          maxWorkspaces: plan.features.maxWorkspaces,
          maxAdmins: plan.features.maxAdmins,
          maxSpaces: plan.features.maxSpaces,
          maxLists: plan.features.maxLists,
          maxFolders: plan.features.maxFolders,
          maxTasks: plan.features.maxTasks,
          hasAccessControl: plan.features.hasAccessControl,
          hasGroupChat: plan.features.hasGroupChat,
          messageLimit: plan.features.messageLimit,
          announcementCooldown: plan.features.announcementCooldown,
          accessControlTier: plan.features.accessControlTier,
          canUseCustomRoles: plan.features.canUseCustomRoles || false,
          maxCustomRoles: plan.features.maxCustomRoles ?? -1,
          canCreateTables: plan.features.canCreateTables || false,
          maxTablesCount: plan.features.maxTablesCount ?? -1,
          maxRowsLimit: plan.features.maxRowsLimit ?? -1,
          maxColumnsLimit: plan.features.maxColumnsLimit ?? -1,
          maxFiles: plan.features.maxFiles ?? -1,
          maxDocuments: plan.features.maxDocuments ?? -1,
          maxDirectMessagesPerUser: plan.features.maxDirectMessagesPerUser ?? -1,
          canCreatePrivateChannels: plan.features.canCreatePrivateChannels || false,
          maxPrivateChannelsCount: plan.features.maxPrivateChannelsCount ?? -1,
          maxMembersPerPrivateChannel: plan.features.maxMembersPerPrivateChannel ?? -1,
        });
      } else {
        toast.error('Failed to load plan');
        router.push('/super-admin?tab=plans');
      }
    } catch (error) {
      console.error("Error fetching plan:", error);
      toast.error('Error loading plan');
      router.push('/super-admin?tab=plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
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
      },
    };

    console.log('[Edit Plan] Submitting payload:', payload);
    setSubmitting(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`http://localhost:5000/api/plans/${planId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log('[Edit Plan] Response:', { status: response.status, data });

      if (response.ok) {
        toast.success('Plan updated successfully!');
        router.push('/super-admin?tab=plans');
      } else {
        toast.error(data.message || 'Failed to update plan');
      }
    } catch (error: any) {
      console.error('[Edit Plan] Error:', error);
      toast.error(`Error: ${error.message || 'Network error occurred'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/super-admin?tab=plans')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Plan: {formData.name}</h1>
            <p className="text-muted-foreground">Update plan features and limits</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerMemberMonthly">Monthly Price (Per Member) *</Label>
                  <Input
                    id="pricePerMemberMonthly"
                    type="number"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ArchiveIcon className="w-4 h-4" />
                    Max Workspaces
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxWorkspaces}
                    onChange={(e) => setFormData({ ...formData, maxWorkspaces: parseInt(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, maxAdmins: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CubeIcon className="w-4 h-4" />
                    Max Spaces
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxSpaces}
                    onChange={(e) => setFormData({ ...formData, maxSpaces: parseInt(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, maxLists: parseInt(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, maxFolders: parseInt(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, maxTasks: parseInt(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, announcementCooldown: parseInt(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Communication Features */}
          <Card>
            <CardHeader>
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
                      onChange={(e) => setFormData({ ...formData, messageLimit: parseInt(e.target.value) || 0 })}
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
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs">
                          <LockClosedIcon className="w-3 h-3" />
                          Max Private Groups
                        </Label>
                        <Input
                          type="number"
                          value={formData.maxPrivateChannelsCount}
                          onChange={(e) => setFormData({ ...formData, maxPrivateChannelsCount: parseInt(e.target.value) || -1 })}
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
                          onChange={(e) => setFormData({ ...formData, maxMembersPerPrivateChannel: parseInt(e.target.value) || -1 })}
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
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LockClosedIcon className="w-4 h-4" />
                  Access Control Tier
                </Label>
                <Select 
                  value={formData.accessControlTier} 
                  onValueChange={(value: 'basic' | 'pro' | 'advanced') => setFormData({ ...formData, accessControlTier: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic - List members get "Full Access" only</SelectItem>
                    <SelectItem value="pro">Pro - List members can have "Full Access" or "Can Edit"</SelectItem>
                    <SelectItem value="advanced">Advanced - Full control: "Full Access", "Can Edit", or "View Only"</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Custom Roles */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Display Roles</CardTitle>
              <CardDescription>Pro feature for custom member role titles</CardDescription>
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
                    placeholder="-1 for unlimited"
                    value={formData.maxCustomRoles}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || val === '-' || val === '-1') {
                        setFormData({ ...formData, maxCustomRoles: val === '' ? -1 : parseInt(val) || -1 });
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num)) {
                          setFormData({ ...formData, maxCustomRoles: num });
                        }
                      }
                    }}
                    min="-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Set to -1 for unlimited, or specify a maximum number
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Tables */}
          <Card>
            <CardHeader>
              <CardTitle>Customizable Tables</CardTitle>
              <CardDescription>Pro feature for spreadsheet-like tables</CardDescription>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Max Tables per Space</Label>
                      <Input
                        type="number"
                        placeholder="-1 for unlimited"
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
                        placeholder="-1 for unlimited"
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
                        placeholder="-1 for unlimited"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4" />
                    Max Files
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
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
                    placeholder="-1 for unlimited"
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
                    placeholder="-1 for unlimited"
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

          {/* Action Buttons */}
          <div className="flex gap-3 sticky bottom-0 bg-gray-50 py-4 border-t">
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Plan'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/super-admin?tab=plans')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
