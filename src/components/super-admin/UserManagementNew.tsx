"use client";

import { useEffect, useState } from "react";
import { PersonIcon, CheckCircledIcon, CrossCircledIcon, ArchiveIcon } from "@radix-ui/react-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { CurrencyDisplay } from "@/components/currency/CurrencyDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import { Plan } from "@/types";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  workspaceCount: number;
  subscription: {
    planId: string | null;
    planName: string;
    planPrice: number;
    planBaseCurrency: 'USD' | 'NPR';
    isPaid: boolean;
    status: "free" | "active" | "expired";
    billingCycle: "monthly" | "annual";
    memberCount: number;
    expiresAt?: string;
    daysRemaining?: number;
  };
  createdAt: string;
}


export default function UserManagementNew() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [assignMemberCount, setAssignMemberCount] = useState<number>(1);
  const [assignBillingCycle, setAssignBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    if (selectedPlan) {
      const plan = plans.find(p => p._id === selectedPlan);
      if (plan && plan.features) {
        setFeatureOverrides({
          maxWorkspaces: plan.features.maxWorkspaces ?? 0,
          maxMembers: plan.features.maxMembers ?? 0,
          maxAdmins: plan.features.maxAdmins ?? 0,
          maxSpaces: plan.features.maxSpaces ?? 0,
          maxLists: plan.features.maxLists ?? 0,
          maxFolders: plan.features.maxFolders ?? 0,
          maxTasks: plan.features.maxTasks ?? 0,
          maxTablesCount: plan.features.maxTablesCount ?? 0,
          maxRowsLimit: plan.features.maxRowsLimit ?? 0,
          maxColumnsLimit: plan.features.maxColumnsLimit ?? 0,
          maxFiles: plan.features.maxFiles ?? 0,
          maxDocuments: plan.features.maxDocuments ?? 0,
          maxDirectMessagesPerUser: plan.features.maxDirectMessagesPerUser ?? 0,
          canCreatePrivateChannels: plan.features.canCreatePrivateChannels ? 1 : 0,
          maxPrivateChannelsCount: plan.features.maxPrivateChannelsCount ?? 0,
          maxMembersPerPrivateChannel: plan.features.maxMembersPerPrivateChannel ?? 0,
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
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/super-admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
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
        setPlans(data.data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      setSelectedPlan(selectedUser.subscription.planId || "");
      setAssignMemberCount(selectedUser.subscription.memberCount || 1);
      setAssignBillingCycle(selectedUser.subscription.billingCycle || "monthly");
    }
  }, [selectedUser]);

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
        setFeatureOverrides({});
      } else {
        toast.error("Failed to update subscription");
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast.error("Error updating subscription");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Stats Cards Skeleton */}
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

        {/* Users Table Skeleton */}
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            {/* Desktop Table Skeleton */}
            <div className="hidden lg:block space-y-4">
              {/* Table Header */}
              <div className="flex gap-4 pb-3 border-b">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              {/* Table Rows */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-32" />
                </div>
              ))}
            </div>

            {/* Mobile Cards Skeleton */}
            <div className="lg:hidden space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage workspace owners and their subscriptions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <PersonIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
            <CheckCircledIcon className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {users.filter((u) => u.subscription.isPaid).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircledIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.subscription.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <CrossCircledIcon className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {users.filter((u) => u.subscription.status === "expired").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table/Cards */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user subscriptions and plans</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Workspaces
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Plan / Seats
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Days Left
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ArchiveIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user.workspaceCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium">{user.subscription.planName}</p>
                        <p className="text-xs text-muted-foreground">
                          <CurrencyDisplay 
                            amount={user.subscription.planPrice} 
                            baseCurrency={user.subscription.planBaseCurrency || 'NPR'} 
                            showCurrencyCode={false} 
                          /> / {user.subscription.billingCycle === 'annual' ? 'yr' : 'mo'}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {user.subscription.memberCount} seats • {user.subscription.billingCycle}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          user.subscription.status === "active"
                            ? "default"
                            : user.subscription.status === "expired"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {user.subscription.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {user.subscription.isPaid && user.subscription.status === 'active' && user.subscription.daysRemaining !== undefined ? (
                        <span className={`text-sm font-medium ${
                          user.subscription.daysRemaining <= 3 ? 'text-red-500' :
                          user.subscription.daysRemaining <= 7 ? 'text-orange-500' :
                          user.subscription.daysRemaining <= 14 ? 'text-yellow-500' :
                          'text-green-500'
                        }`}>
                          {user.subscription.daysRemaining} days
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {selectedUser?._id === user._id && !user.subscription.isPaid ? (
                        <div className="flex items-center gap-2">
                           <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                              <SelectValue placeholder="Select Plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((plan) => {
                                const price = plan.pricePerMemberMonthly || plan.basePrice || plan.price;
                                const baseCurrency = plan.baseCurrency || 'NPR';
                                return (
                                  <SelectItem key={plan._id} value={plan._id}>
                                    {plan.name} - <CurrencyDisplay 
                                      amount={price} 
                                      baseCurrency={baseCurrency} 
                                      showCurrencyCode={false} 
                                    />
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>

                          {/* New: Member Count & Billing Cycle */}
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              value={assignMemberCount}
                              onChange={(e) => setAssignMemberCount(parseInt(e.target.value) || 1)}
                              className="w-16 h-9 px-2 text-sm border font-medium rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-center"
                              placeholder="Seats"
                            />
                            <Select 
                              value={assignBillingCycle} 
                              onValueChange={(v: any) => setAssignBillingCycle(v)}
                            >
                              <SelectTrigger className="w-[100px] h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="annual">Annual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-sm font-semibold">Custom Limits (-1 for unlimited)</h4>
                            <div className="grid grid-cols-2 gap-4">
                              {[
                                { key: 'maxWorkspaces', label: 'Max Workspaces' },
                                { key: 'maxMembers', label: 'Max Members' },
                                { key: 'maxAdmins', label: 'Max Admins' },
                                { key: 'maxSpaces', label: 'Max Spaces' },
                                { key: 'maxLists', label: 'Max Lists' },
                                { key: 'maxFolders', label: 'Max Folders' },
                                { key: 'maxTasks', label: 'Max Tasks' },
                                { key: 'maxTablesCount', label: 'Max Tables' },
                                { key: 'maxRowsLimit', label: 'Max Rows' },
                                { key: 'maxColumnsLimit', label: 'Max Columns' },
                                { key: 'maxFiles', label: 'Max Files' },
                                { key: 'maxDocuments', label: 'Max Docs' },
                                { key: 'maxDirectMessagesPerUser', label: 'Max DMs' },
                                { key: 'canCreatePrivateChannels', label: 'Private Groups (0/1)' },
                                { key: 'maxPrivateChannelsCount', label: 'Max Private Groups' },
                                { key: 'maxMembersPerPrivateChannel', label: 'Max Members/Group' },
                              ].map((f) => (
                                <div key={f.key} className="space-y-1.5">
                                  <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                                  <input
                                    type="number"
                                    className="w-full px-2 py-1 text-xs border rounded bg-background"
                                    value={featureOverrides[f.key] ?? 0}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      setFeatureOverrides(prev => ({
                                        ...prev,
                                        [f.key]: isNaN(val) ? 0 : val
                                      }));
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => togglePaidStatus(user._id, user.subscription.isPaid)}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(null);
                              setSelectedPlan("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant={user.subscription.isPaid ? "destructive" : "default"}
                          onClick={() => {
                            if (user.subscription.isPaid) {
                              togglePaidStatus(user._id, user.subscription.isPaid);
                            } else {
                              setSelectedUser(user);
                            }
                          }}
                        >
                          {user.subscription.isPaid ? "Remove" : "Grant Access"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {users.map((user) => (
              <Card key={user._id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-base">{user.name}</CardTitle>
                      <CardDescription className="text-xs">{user.email}</CardDescription>
                    </div>
                    <Badge
                      variant={
                        user.subscription.status === "active"
                          ? "default"
                          : user.subscription.status === "expired"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {user.subscription.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Workspaces:</span>
                    <span className="font-medium">{user.workspaceCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="font-medium flex flex-col items-end text-right">
                      <span>{user.subscription.planName} ({user.subscription.memberCount} seats)</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        <CurrencyDisplay 
                          amount={user.subscription.planPrice} 
                          baseCurrency={user.subscription.planBaseCurrency || 'NPR'} 
                          showCurrencyCode={false} 
                        /> / {user.subscription.billingCycle === 'annual' ? 'yr' : 'mo'} • {user.subscription.billingCycle || 'monthly'}
                      </span>
                    </span>
                  </div>
                  {user.subscription.isPaid && user.subscription.status === 'active' && user.subscription.daysRemaining !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Days Left:</span>
                      <span className={`font-medium ${
                        user.subscription.daysRemaining <= 3 ? 'text-red-500' :
                        user.subscription.daysRemaining <= 7 ? 'text-orange-500' :
                        user.subscription.daysRemaining <= 14 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {user.subscription.daysRemaining} days
                      </span>
                    </div>
                  )}
                  {selectedUser?._id === user._id && !user.subscription.isPaid ? (
                    <div className="space-y-4">
                      {/* Plan Selection */}
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Plan" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          {plans.map((plan) => {
                            const price = plan.pricePerMemberMonthly || plan.basePrice || plan.price;
                            const baseCurrency = plan.baseCurrency || 'NPR';
                            return (
                              <SelectItem key={plan._id} value={plan._id}>
                                {plan.name} - <CurrencyDisplay 
                                  amount={price} 
                                  baseCurrency={baseCurrency} 
                                  showCurrencyCode={false} 
                                />
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      
                      {/* Subscription Details: Seats & Cycle */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Seats</label>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={assignMemberCount}
                            onChange={(e) => setAssignMemberCount(parseInt(e.target.value) || 1)}
                            className="w-full h-10 px-3 text-sm border font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                            placeholder="Seats"
                          />
                        </div>
                        <div className="flex-[1.5]">
                          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Billing Cycle</label>
                          <Select 
                            value={assignBillingCycle} 
                            onValueChange={(v: any) => setAssignBillingCycle(v)}
                          >
                            <SelectTrigger className="w-full h-10 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          onClick={() => togglePaidStatus(user._id, user.subscription.isPaid)}
                        >
                          Confirm
                        </Button>
                        <Button
                          className="flex-1"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(null);
                            setSelectedPlan("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      variant={user.subscription.isPaid ? "destructive" : "default"}
                      onClick={() => {
                        if (user.subscription.isPaid) {
                          togglePaidStatus(user._id, user.subscription.isPaid);
                        } else {
                          setSelectedUser(user);
                        }
                      }}
                    >
                      {user.subscription.isPaid ? "Remove Subscription" : "Grant Access"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
