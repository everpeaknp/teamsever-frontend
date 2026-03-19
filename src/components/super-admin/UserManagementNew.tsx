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
          }),
        }
      );
      if (response.ok) {
        toast.success(currentStatus ? "User subscription removed" : "User subscription activated");
        fetchUsers();
        setSelectedUser(null);
        setSelectedPlan("");
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
                    Plan
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
                          />/mo
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
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Plan" />
                            </SelectTrigger>
                            <SelectContent>
                              {plans.map((plan) => {
                                const price = plan.basePrice || plan.price;
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
                    <span className="font-medium">
                      {user.subscription.planName} (<CurrencyDisplay 
                        amount={user.subscription.planPrice} 
                        baseCurrency={user.subscription.planBaseCurrency || 'NPR'} 
                        showCurrencyCode={false} 
                      />/mo)
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
                    <div className="space-y-2">
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => {
                            const price = plan.basePrice || plan.price;
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
