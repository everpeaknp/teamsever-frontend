'use client';

import { useState, useEffect } from 'react';
import { Loader2, Globe, Check, ShieldCheck, Calendar, Sparkles } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface TaxSlab {
  name: string;
  filingStatus: string;
  thresholdMin: number;
  thresholdMax?: number | null;
  ratePercentage: number;
  fixedBaseAmount?: number;
}

interface SocialFundRule {
  name: string;
  code: string;
  description?: string;
  calculationBase: 'basic_salary' | 'gross_earnings';
  employeeRate: number;
  employerRate: number;
  cappedAnnualAmount?: number | null;
  isTaxDeductible: boolean;
}

interface StatutoryPolicy {
  _id?: string;
  countryCode: string;
  countryName: string;
  currency: string;
  primaryCalendar: 'gregorian' | 'bikram_sambat' | 'custom';
  showDualCalendar: boolean;
  fiscalYearStartMonth: number;
  fiscalYearStartDay: number;
  payrollCycle: 'monthly' | 'semi_monthly' | 'bi_weekly' | 'weekly';
  standardWeeklyHours: number;
  weekendDays: number[];
  taxExemptionAnnualLimit?: number;
  taxSlabs: TaxSlab[];
  socialFunds: SocialFundRule[];
  notes?: string;
}

export function StatutoryPolicySettingsTab({ workspaceId }: { workspaceId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<StatutoryPolicy>({
    countryCode: 'GLOBAL',
    countryName: 'Global / Custom',
    currency: 'USD',
    primaryCalendar: 'gregorian',
    showDualCalendar: false,
    fiscalYearStartMonth: 1,
    fiscalYearStartDay: 1,
    payrollCycle: 'monthly',
    standardWeeklyHours: 40,
    weekendDays: [0, 6],
    taxExemptionAnnualLimit: 0,
    taxSlabs: [],
    socialFunds: [],
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/workspaces/${workspaceId}/hr/statutory-policy`);
      if (res.data?.data) {
        setPolicy(res.data.data);
      }
    } catch {
      // no existing policy yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [workspaceId]);

  const applyPreset = async (presetCode: string) => {
    setSaving(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/hr/statutory-policy/apply-preset/${presetCode}`);
      setPolicy(res.data.data);
      toast.success(`Loaded ${res.data.data.countryName} statutory rules successfully`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not apply preset');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/workspaces/${workspaceId}/hr/statutory-policy`, policy);
      setPolicy(res.data.data);
      toast.success('Statutory & tax configuration saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save statutory policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading statutory settings…</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Statutory, Tax & Dual-Calendar Configuration
              </CardTitle>
              <CardDescription>
                Configure progressive income tax (TDS), social security / retirement funds, and calendar systems dynamically for any country.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground mr-1">One-Click Presets:</span>
              <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('NP')}>
                🇳🇵 Nepal (SSF + IRD)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('US')}>
                🇺🇸 USA (IRS + FICA)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('IN')}>
                🇮🇳 India (EPF + New Tax)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Country & Calendar Basics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-sm font-medium">
              Country Profile Name
              <Input
                value={policy.countryName}
                onChange={(e) => setPolicy({ ...policy, countryName: e.target.value })}
                placeholder="e.g. Nepal, United States"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              ISO Country Code
              <Input
                value={policy.countryCode}
                onChange={(e) => setPolicy({ ...policy, countryCode: e.target.value.toUpperCase() })}
                placeholder="NP, US, IN"
                maxLength={4}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Payroll Currency
              <Input
                value={policy.currency}
                onChange={(e) => setPolicy({ ...policy, currency: e.target.value.toUpperCase() })}
                placeholder="NPR, USD, INR"
                maxLength={3}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Standard Weekly Hours
              <Input
                type="number"
                value={policy.standardWeeklyHours}
                onChange={(e) => setPolicy({ ...policy, standardWeeklyHours: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t pt-4">
            <label className="space-y-1 text-sm font-medium">
              Primary Calendar
              <select
                aria-label="Primary Calendar"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={policy.primaryCalendar}
                onChange={(e) => setPolicy({ ...policy, primaryCalendar: e.target.value as any })}
              >
                <option value="gregorian">Gregorian (AD)</option>
                <option value="bikram_sambat">Bikram Sambat (BS)</option>
                <option value="custom">Custom Calendar</option>
              </select>
            </label>
            <div className="space-y-1 text-sm font-medium">
              <span>Dual Calendar Display</span>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="dual-calendar-toggle"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={policy.showDualCalendar}
                  onChange={(e) => setPolicy({ ...policy, showDualCalendar: e.target.checked })}
                />
                <label htmlFor="dual-calendar-toggle" className="text-xs text-muted-foreground cursor-pointer">
                  Show both AD & BS dates across HR and payslips
                </label>
              </div>
            </div>
            <label className="space-y-1 text-sm font-medium">
              Fiscal Year Start Month
              <select
                aria-label="Fiscal Year Start Month"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={policy.fiscalYearStartMonth}
                onChange={(e) => setPolicy({ ...policy, fiscalYearStartMonth: Number(e.target.value) })}
              >
                <option value={1}>January (USA, International)</option>
                <option value={4}>April (India, UK)</option>
                <option value={7}>July / Shrawan (Nepal, Australia)</option>
                <option value={10}>October</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              Payroll Cycle
              <select
                aria-label="Payroll Cycle"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={policy.payrollCycle}
                onChange={(e) => setPolicy({ ...policy, payrollCycle: e.target.value as any })}
              >
                <option value="monthly">Monthly</option>
                <option value="semi_monthly">Semi-Monthly (Twice a month)</option>
                <option value="bi_weekly">Bi-Weekly (Every 2 weeks)</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
          </div>

          {/* Social Security & Retirement Funds */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Social Security & Retirement Funds
                </h3>
                <p className="text-xs text-muted-foreground">e.g. Nepal SSF (11% + 20%), US FICA, India EPF, Australia Superannuation</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setPolicy({
                    ...policy,
                    socialFunds: [
                      ...policy.socialFunds,
                      {
                        name: 'New Fund',
                        code: 'FUND',
                        calculationBase: 'basic_salary',
                        employeeRate: 5,
                        employerRate: 5,
                        isTaxDeductible: true,
                      },
                    ],
                  });
                }}
              >
                + Add Fund
              </Button>
            </div>
            {policy.socialFunds.map((fund, idx) => (
              <div key={idx} className="grid gap-3 sm:grid-cols-6 rounded-lg border p-3 bg-muted/20 items-end">
                <label className="space-y-1 text-xs font-medium sm:col-span-2">
                  Fund Name
                  <Input
                    value={fund.name}
                    onChange={(e) => {
                      const updated = [...policy.socialFunds];
                      updated[idx].name = e.target.value;
                      setPolicy({ ...policy, socialFunds: updated });
                    }}
                  />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Fund Code
                  <Input
                    value={fund.code}
                    onChange={(e) => {
                      const updated = [...policy.socialFunds];
                      updated[idx].code = e.target.value.toUpperCase();
                      setPolicy({ ...policy, socialFunds: updated });
                    }}
                  />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Employee Rate (%)
                  <Input
                    type="number"
                    value={fund.employeeRate}
                    onChange={(e) => {
                      const updated = [...policy.socialFunds];
                      updated[idx].employeeRate = Number(e.target.value);
                      setPolicy({ ...policy, socialFunds: updated });
                    }}
                  />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Employer Rate (%)
                  <Input
                    type="number"
                    value={fund.employerRate}
                    onChange={(e) => {
                      const updated = [...policy.socialFunds];
                      updated[idx].employerRate = Number(e.target.value);
                      setPolicy({ ...policy, socialFunds: updated });
                    }}
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setPolicy({
                      ...policy,
                      socialFunds: policy.socialFunds.filter((_, i) => i !== idx),
                    });
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          {/* Progressive Tax Slabs */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Progressive Income Tax (TDS) Slabs
                </h3>
                <p className="text-xs text-muted-foreground">Configurable tax brackets per filing status (Single, Married, etc.)</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setPolicy({
                    ...policy,
                    taxSlabs: [
                      ...policy.taxSlabs,
                      {
                        name: 'New Bracket',
                        filingStatus: 'single',
                        thresholdMin: 0,
                        thresholdMax: null,
                        ratePercentage: 10,
                      },
                    ],
                  });
                }}
              >
                + Add Tax Slab
              </Button>
            </div>
            <div className="space-y-2">
              {policy.taxSlabs.map((slab, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-6 rounded-lg border p-3 bg-muted/10 items-end">
                  <label className="space-y-1 text-xs font-medium sm:col-span-2">
                    Bracket Description
                    <Input
                      value={slab.name}
                      onChange={(e) => {
                        const updated = [...policy.taxSlabs];
                        updated[idx].name = e.target.value;
                        setPolicy({ ...policy, taxSlabs: updated });
                      }}
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium">
                    Filing Status
                    <select
                      aria-label="Filing Status"
                      className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs"
                      value={slab.filingStatus}
                      onChange={(e) => {
                        const updated = [...policy.taxSlabs];
                        updated[idx].filingStatus = e.target.value;
                        setPolicy({ ...policy, taxSlabs: updated });
                      }}
                    >
                      <option value="single">Single / Individual</option>
                      <option value="married">Married / Couple</option>
                      <option value="all">All Filers</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-medium">
                    Min Threshold
                    <Input
                      type="number"
                      value={slab.thresholdMin}
                      onChange={(e) => {
                        const updated = [...policy.taxSlabs];
                        updated[idx].thresholdMin = Number(e.target.value);
                        setPolicy({ ...policy, taxSlabs: updated });
                      }}
                    />
                  </label>
                  <label className="space-y-1 text-xs font-medium">
                    Rate (%)
                    <Input
                      type="number"
                      value={slab.ratePercentage}
                      onChange={(e) => {
                        const updated = [...policy.taxSlabs];
                        updated[idx].ratePercentage = Number(e.target.value);
                        setPolicy({ ...policy, taxSlabs: updated });
                      }}
                    />
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setPolicy({
                        ...policy,
                        taxSlabs: policy.taxSlabs.filter((_, i) => i !== idx),
                      });
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button disabled={saving} onClick={save}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save Statutory & Tax Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
