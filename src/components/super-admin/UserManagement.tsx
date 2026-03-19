"use client";

import { useEffect, useState } from "react";
import {
  User,
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
  Calendar,
  Briefcase,
} from "lucide-react";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  workspaceCount: number;
  subscription: {
    planId: string | null;
    planName: string;
    planPrice: number;
    isPaid: boolean;
    status: "trial" | "active" | "expired";
    trialStartedAt: string;
    trialDaysRemaining: number;
  };
  createdAt: string;
}

interface Plan {
  _id: string;
  name: string;
  price: number;
}

export default function UserManagement() {
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
      const response = await fetch("http://localhost:5000/api/super-admin/users", {
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
      const response = await fetch("http://localhost:5000/api/plans", {
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
      alert("Please select a plan first");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:5000/api/super-admin/users/${userId}/subscription`,
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
        fetchUsers();
        setSelectedUser(null);
        setSelectedPlan("");
      }
    } catch (error) {
      console.error("Error updating subscription:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <p className="text-gray-400 text-sm mt-1">
          Manage workspace owners and their subscriptions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Total Admins</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Paid Users</p>
          <p className="text-2xl font-bold text-green-500">
            {users.filter((u) => u.subscription.isPaid).length}
          </p>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Trial Users</p>
          <p className="text-2xl font-bold text-yellow-500">
            {users.filter((u) => u.subscription.status === "trial").length}
          </p>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-xs mb-1">Expired</p>
          <p className="text-2xl font-bold text-red-500">
            {users.filter((u) => u.subscription.status === "expired").length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#111111] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1a1a1a] border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Workspaces
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Trial Days
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-white">{user.workspaceCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {user.subscription.planName}
                      </p>
                      <p className="text-xs text-gray-400">
                        ${user.subscription.planPrice}/mo
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.subscription.status === "active"
                          ? "bg-green-500/10 text-green-500"
                          : user.subscription.status === "trial"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {user.subscription.status === "active" && (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      {user.subscription.status === "trial" && <Clock className="w-3 h-3" />}
                      {user.subscription.status === "expired" && (
                        <XCircle className="w-3 h-3" />
                      )}
                      {user.subscription.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.subscription.status === "trial" ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-white">
                          {user.subscription.trialDaysRemaining} days
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {selectedUser?._id === user._id && !user.subscription.isPaid ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedPlan}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            className="bg-[#1a1a1a] border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500"
                          >
                            <option value="">Select Plan</option>
                            {plans.map((plan) => (
                              <option key={plan._id} value={plan._id}>
                                {plan.name} - ${plan.price}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() =>
                              togglePaidStatus(user._id, user.subscription.isPaid)
                            }
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(null);
                              setSelectedPlan("");
                            }}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (user.subscription.isPaid) {
                              togglePaidStatus(user._id, user.subscription.isPaid);
                            } else {
                              setSelectedUser(user);
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
                            user.subscription.isPaid
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          {user.subscription.isPaid ? "Unpaid" : "Mark Paid"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
