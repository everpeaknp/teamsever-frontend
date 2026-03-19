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
import { ArchiveIcon, ComponentInstanceIcon, ListBulletIcon, FileIcon, CheckboxIcon, BellIcon, ChatBubbleIcon, LockClosedIcon, PersonIcon, CounterClockwiseClockIcon, TableIcon, FileTextIcon } from "@radix-ui/react-icons";
import { Shield, ArrowLeft } from "lucide-react";

export default function CreatePlanPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    baseCurrency: 'NPR' as 'USD' | 'NPR',
    pricePerMemberMonthly: 0,
    pricePerMemberAnnual: 0,
    description: "",
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
    <div className="min-h-screen bg-gray-50">
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
            <h1 className="text-3xl font-bold">Create New Plan</h1>
            <p className="text-muted-foreground">Define features and limits for a new subscription plan</p>
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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ArchiveIcon className="w-4 h-4" />
                    Max Workspaces
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={formData.maxWorkspaces}
                    onChange={(e) => setFormData({ ...formData, maxWorkspaces: parseInt(e.target.value) })}
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
                    placeholder="-1 for unlimited"
                    value={formData.maxAdmins}
                    onChange={(e) => setFormData({ ...formData, maxAdmins: parseInt(e.target.value) })}
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
                    placeholder="-1 for unlimited"
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
                    placeholder="-1 for unlimited"
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
                    placeholder="-1 for unlimited"
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
                    placeholder="-1 for unlimited"
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
                    placeholder="24"
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
                <div className="space-y-2 ml-4 pl-4 border-l-2">
                  <Label className="flex items-center gap-2">
                    <ChatBubbleIcon className="w-4 h-4" />
                    Message Limit (monthly)
                  </Label>
                  <Input
                    type="number"
                    placeholder="-1 for unlimited"
                    value={formData.messageLimit}
                    onChange={(e) => setFormData({ ...formData, messageLimit: parseInt(e.target.value) })}
                    required
                  />
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
                <p className="text-xs text-muted-foreground">
                  Controls which permission levels can be assigned to list members
                </p>
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
                        value={formData.maxTablesCount === -1 ? '' : formData.maxTablesCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, maxTablesCount: val === '' ? -1 : parseInt(val) });
                        }}
                        min="-1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Rows per Table</Label>
                      <Input
                        type="number"
                        placeholder="-1 for unlimited"
                        value={formData.maxRowsLimit === -1 ? '' : formData.maxRowsLimit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, maxRowsLimit: val === '' ? -1 : parseInt(val) });
                        }}
                        min="-1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Columns per Table</Label>
                      <Input
                        type="number"
                        placeholder="-1 for unlimited"
                        value={formData.maxColumnsLimit === -1 ? '' : formData.maxColumnsLimit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({ ...formData, maxColumnsLimit: val === '' ? -1 : parseInt(val) });
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
                    value={formData.maxFiles === -1 ? '' : formData.maxFiles}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, maxFiles: val === '' ? -1 : parseInt(val) });
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
                    value={formData.maxDocuments === -1 ? '' : formData.maxDocuments}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, maxDocuments: val === '' ? -1 : parseInt(val) });
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
                    value={formData.maxDirectMessagesPerUser === -1 ? '' : formData.maxDirectMessagesPerUser}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, maxDirectMessagesPerUser: val === '' ? -1 : parseInt(val) });
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
              {submitting ? 'Creating...' : 'Create Plan'}
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
