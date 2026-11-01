"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CurrencyDisplay } from "@/components/currency/CurrencyDisplay";
import { toast } from "sonner";
import { PlusIcon, Pencil1Icon, TrashIcon, ArchiveIcon, ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { Loader2, Copy, Sparkles, Layers, ShieldCheck, ArrowRight, Bookmark } from "lucide-react";
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
  const [starterTemplates, setStarterTemplates] = useState<any[]>([]);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [activeView, setActiveView] = useState<'all' | 'templates'>('all');

  // Duplication Modal State
  const [duplicateTarget, setDuplicateTarget] = useState<any | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicating, setDuplicating] = useState(false);

  const toggleExpand = (planId: string) => {
    setExpandedPlans(prev => ({ ...prev, [planId]: !prev[planId] }));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const [plansRes, templatesRes] = await Promise.all([
        fetch(`${API_URL}/api/plans?includeInactive=true`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/plans/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.data || []);
      } else {
        toast.error("Failed to fetch active plans");
      }

      if (templatesRes.ok) {
        const tData = await templatesRes.json();
        setStarterTemplates(tData.data?.starterTemplates || []);
        setCustomTemplates(tData.data?.customTemplates || []);
      }
    } catch (error) {
      toast.error("Error loading plans and templates");
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
        fetchAll();
      } else {
        toast.error(data.message || "Failed to delete plan");
      }
    } catch (error) {
      toast.error("Error deleting plan");
    }
  };

  const openDuplicateDialog = (planOrTemplate: any) => {
    setDuplicateTarget(planOrTemplate);
    setDuplicateName(`${planOrTemplate.name} (Copy)`);
  };

  const handleDuplicateSubmit = async () => {
    if (!duplicateTarget || !duplicateName.trim()) {
      toast.error("Please enter a valid plan name");
      return;
    }

    try {
      setDuplicating(true);
      const token = localStorage.getItem("authToken");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      // If it's an existing MongoDB plan (has _id)
      if (duplicateTarget._id) {
        const res = await fetch(`${API_URL}/api/plans/${duplicateTarget._id}/duplicate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: duplicateName.trim(),
          }),
        });

        const data = await res.json();
        if (res.ok) {
          toast.success(`Plan duplicated as "${duplicateName.trim()}"!`);
          setDuplicateTarget(null);
          fetchAll();
        } else {
          toast.error(data.message || "Failed to duplicate plan");
        }
      } else {
        // It is a built-in starter template without a DB _id
        const res = await fetch(`${API_URL}/api/plans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: duplicateName.trim(),
            description: duplicateTarget.description,
            baseCurrency: duplicateTarget.baseCurrency || 'NPR',
            pricePerMemberMonthly: duplicateTarget.pricePerMemberMonthly ?? 0,
            pricePerMemberAnnual: duplicateTarget.pricePerMemberAnnual ?? 0,
            features: {
              ...(duplicateTarget.features || {}),
              maxWorkspaces: 1,
              accessControlTier: duplicateTarget.features?.accessControlTier || (duplicateTarget.features?.hasAccessControl ? 'basic' : 'none'),
            },
            isTemplate: false,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          toast.success(`Plan created from template as "${duplicateName.trim()}"!`);
          setDuplicateTarget(null);
          fetchAll();
        } else {
          toast.error(data.message || "Failed to create plan from template");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error duplicating plan");
    } finally {
      setDuplicating(false);
    }
  };

  const handleCustomizeInEditor = (template: any) => {
    sessionStorage.setItem("selected_plan_template", JSON.stringify(template));
    router.push("/super-admin/plans/create");
  };

  const getActivePrice = (plan: Plan | any) => {
    if (billingCycle === 'monthly') {
      return plan.pricePerMemberMonthly || plan.basePrice || plan.price || 0;
    } else {
      return plan.pricePerMemberAnnual || (plan.basePrice || plan.price || 0) * 10;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading plans & templates catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Plans & Dynamic Pricing</h2>
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Super Admin Control
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Build, duplicate, and configure subscription plans, feature quotas, storage, biometric terminals, and HR modules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push('/super-admin/plans/create')} className="gap-2 shadow-sm">
            <PlusIcon className="w-4 h-4" />
            Create Custom Plan
          </Button>
        </div>
      </div>

      {/* View Switcher & Billing Cycle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-3 rounded-xl border">
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('all')}
            className="gap-2 rounded-lg"
          >
            <Layers className="w-4 h-4" />
            Active Plans ({plans.length})
          </Button>
          <Button
            variant={activeView === 'templates' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('templates')}
            className="gap-2 rounded-lg"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Starter & Reusable Templates ({starterTemplates.length + customTemplates.length})
          </Button>
        </div>

        {/* Billing Cycle Toggle */}
        <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'annual')} className="w-full sm:w-auto">
          <TabsList className="grid w-full sm:w-48 grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Starter Templates Shelf (Shown prominently when in templates tab or when active) */}
      {(activeView === 'templates' || starterTemplates.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold">Pre-Configured Starter Templates</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Clone any template into a fully customized plan with 1-click
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {starterTemplates.map((template) => {
              const activePrice = billingCycle === 'monthly' ? template.pricePerMemberMonthly : template.pricePerMemberAnnual;

              return (
                <Card key={template.id} className="relative border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-b from-amber-50/20 to-transparent dark:from-amber-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">{template.name}</h4>
                          <Badge variant="outline" className="bg-amber-100/60 text-amber-800 border-amber-300 text-[10px] uppercase font-semibold">
                            {template.category || 'STARTER'}
                          </Badge>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-1">
                          <CurrencyDisplay
                            amount={activePrice}
                            baseCurrency="NPR"
                            className="text-2xl font-extrabold text-amber-600 dark:text-amber-400"
                          />
                          <span className="text-xs text-muted-foreground">
                            /member/{billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 bg-amber-100/40 dark:bg-amber-900/20 rounded-lg">
                        <Bookmark className="w-4 h-4 text-amber-600" />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>

                    {/* Features list */}
                    <div className="space-y-1.5 text-xs bg-card/60 p-2.5 rounded-lg border">
                      {getPlanFeatureLines(template as any).slice(0, 6).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openDuplicateDialog(template)}
                        className="w-full gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Clone & Use
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCustomizeInEditor(template)}
                        className="w-full gap-1 text-xs"
                      >
                        Customize
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Custom Saved Templates */}
            {customTemplates.map((template) => {
              const activePrice = billingCycle === 'monthly' ? template.pricePerMemberMonthly : template.pricePerMemberAnnual;

              return (
                <Card key={template._id} className="relative border-purple-200/60 dark:border-purple-900/40 bg-gradient-to-b from-purple-50/20 to-transparent dark:from-purple-950/10 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">{template.name}</h4>
                          <Badge variant="outline" className="bg-purple-100/60 text-purple-800 border-purple-300 text-[10px] uppercase font-semibold">
                            CUSTOM TEMPLATE
                          </Badge>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-1">
                          <CurrencyDisplay
                            amount={activePrice}
                            baseCurrency={template.baseCurrency || "NPR"}
                            className="text-2xl font-extrabold text-purple-600 dark:text-purple-400"
                          />
                          <span className="text-xs text-muted-foreground">
                            /member/{billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>

                    {/* Features list */}
                    <div className="space-y-1.5 text-xs bg-card/60 p-2.5 rounded-lg border">
                      {getPlanFeatureLines(template as any).slice(0, 6).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openDuplicateDialog(template)}
                        className="w-full gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Clone & Use
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCustomizeInEditor(template)}
                        className="w-full gap-1 text-xs"
                      >
                        Customize
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Plans Grid */}
      {activeView === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Active Plans in System</h3>
            <span className="text-xs text-muted-foreground">
              {plans.length} plan{plans.length === 1 ? '' : 's'} configured
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const activePrice = getActivePrice(plan);
              
              return (
                <Card key={plan._id} className={`relative flex flex-col justify-between ${!plan.isActive ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-lg">{plan.name}</h3>
                          {!plan.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                          {plan.isTemplate && (
                            <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200">
                              Template
                            </Badge>
                          )}
                        </div>
                        
                        {/* Price Display */}
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
                      
                      {/* Action Buttons: Edit, Duplicate, Delete */}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDuplicateDialog(plan)}
                          title="Duplicate plan"
                          className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-primary"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/super-admin/plans/edit/${plan._id}`)}
                          title="Edit plan"
                          className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-primary"
                        >
                          <Pencil1Icon className="w-3.5 h-3.5" />
                        </Button>
                        {plan.name.toLowerCase() !== 'free' && plan.name.toLowerCase() !== 'free plan' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deletePlan(plan._id, plan.name)}
                            title="Delete plan"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {plan.description}
                      </p>
                      
                      <Collapsible open={expandedPlans[plan._id]} onOpenChange={() => toggleExpand(plan._id)}>
                        <div className="space-y-1.5 text-xs">
                          {/* Key features always shown */}
                          {getPlanFeatureLines(plan).slice(0, 5).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                              <ArchiveIcon className="w-3 h-3 flex-shrink-0 text-primary/60" />
                              <span className="truncate">{feature}</span>
                            </div>
                          ))}
                          
                          <CollapsibleContent className="space-y-1.5 mt-1.5">
                            {getPlanFeatureLines(plan).slice(5).map((feature, idx) => (
                              <div key={idx + 5} className="flex items-center gap-2 text-muted-foreground">
                                <ArchiveIcon className="w-3 h-3 flex-shrink-0 text-primary/60" />
                                <span className="truncate">{feature}</span>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </div>

                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full mt-3 h-7 text-[10px] uppercase tracking-wider font-bold text-muted-foreground hover:text-primary transition-colors"
                          >
                            {expandedPlans[plan._id] ? (
                              <>Hide Details <ChevronUpIcon className="ml-1 w-3 h-3" /></>
                            ) : (
                              <>Show All Features <ChevronDownIcon className="ml-1 w-3 h-3" /></>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    </div>

                    <div className="pt-3 border-t mt-3 flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openDuplicateDialog(plan)}
                        className="w-full text-xs gap-1.5 font-medium"
                      >
                        <Copy className="w-3 h-3" />
                        Duplicate Plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {plans.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-xl p-8">
              <p className="text-muted-foreground mb-3">No plans found in database.</p>
              <Button onClick={() => setActiveView('templates')} variant="outline" className="gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Browse Starter Templates
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Duplicate / Clone Plan Modal Dialog */}
      <Dialog open={!!duplicateTarget} onOpenChange={(open) => !open && setDuplicateTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary" />
              Duplicate Plan or Template
            </DialogTitle>
            <DialogDescription>
              Create a new standalone subscription plan cloned from{" "}
              <span className="font-semibold text-foreground">
                "{duplicateTarget?.name}"
              </span>
              . All features, quotas, biometrics, and limits will be copied.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="planName" className="text-sm font-medium">
                New Plan Name
              </Label>
              <Input
                id="planName"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="e.g. Growth Pro Tier 2"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDuplicateTarget(null)}
              disabled={duplicating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDuplicateSubmit}
              disabled={duplicating || !duplicateName.trim()}
              className="gap-2"
            >
              {duplicating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Duplicating...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Confirm Duplicate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
