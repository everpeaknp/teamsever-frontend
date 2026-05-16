"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyDisplay } from "@/components/currency/CurrencyDisplay";
import { toast } from "sonner";
import { PlusIcon, Pencil1Icon, TrashIcon, ArchiveIcon, ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { Loader2 } from "lucide-react";
import { Plan } from "@/types";
import { getPlanFeatureLines } from "@/lib/planFeatures";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";


export default function PlanBuilderNew() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  const toggleExpand = (planId: string) => {
    setExpandedPlans(prev => ({ ...prev, [planId]: !prev[planId] }));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/plans?includeInactive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data.data);
      } else {
        toast.error("Failed to fetch plans");
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Error loading plans");
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (planId: string, planName: string) => {
    if (!confirm(`Are you sure you want to delete the "${planName}" plan?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/plans/${planId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Plan deleted successfully");
        fetchPlans();
      } else {
        toast.error(data.message || "Failed to delete plan");
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Error deleting plan");
    }
  };

  const getActivePrice = (plan: Plan) => {
    if (billingCycle === 'monthly') {
      return plan.pricePerMemberMonthly || plan.basePrice || plan.price || 0;
    } else {
      return plan.pricePerMemberAnnual || (plan.basePrice || plan.price || 0) * 10;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Plans Management</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage subscription plans
          </p>
        </div>
        <Button onClick={() => router.push('/super-admin/plans/create')} className="gap-2">
          <PlusIcon className="w-4 h-4" />
          Create Plan
        </Button>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'annual')} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const activePrice = getActivePrice(plan);
          
          return (
            <Card key={plan._id} className={`relative ${!plan.isActive ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      {!plan.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    
                    {/* Price Display - Single Line */}
                    <div className="flex items-baseline gap-1">
                      <CurrencyDisplay 
                        amount={activePrice} 
                        baseCurrency={plan.baseCurrency || 'NPR'}
                        className="text-2xl font-bold text-primary"
                      />
                      <span className="text-sm text-muted-foreground">
                        /member/{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/super-admin/plans/edit/${plan._id}`)}
                      title="Edit plan"
                      className="h-8 w-8"
                    >
                      <Pencil1Icon className="w-4 h-4" />
                    </Button>
                    {plan.name.toLowerCase() !== 'free' && plan.name.toLowerCase() !== 'free plan' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePlan(plan._id, plan.name)}
                        title="Delete plan"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {plan.description}
                </p>
                
                <Collapsible open={expandedPlans[plan._id]} onOpenChange={() => toggleExpand(plan._id)}>
                  <div className="space-y-1.5 text-xs">
                    {/* Key features always shown */}
                    {getPlanFeatureLines(plan).slice(0, 5).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                        <ArchiveIcon className="w-3 h-3 flex-shrink-0 text-primary/50" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    
                    <CollapsibleContent className="space-y-1.5 mt-1.5">
                      {getPlanFeatureLines(plan).slice(5).map((feature, idx) => (
                        <div key={idx + 5} className="flex items-center gap-2 text-muted-foreground">
                          <ArchiveIcon className="w-3 h-3 flex-shrink-0 text-primary/50" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-3 h-8 text-[10px] uppercase tracking-wider font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                      {expandedPlans[plan._id] ? (
                        <>Hide Details <ChevronUpIcon className="ml-1 w-3 h-3" /></>
                      ) : (
                        <>Show All Details <ChevronDownIcon className="ml-1 w-3 h-3" /></>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No plans found. Create your first plan to get started.</p>
        </div>
      )}
    </div>
  );
}
