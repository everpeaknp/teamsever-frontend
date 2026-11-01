'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Loader2, Network, UserRound } from 'lucide-react';
import { api } from '@/lib/axios';
import { loadAllHrEmployees } from '@/lib/hrEmployees';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DepartmentsManagementTab, DepartmentItem } from '@/components/hr/DepartmentsManagementTab';
import { toast } from 'sonner';

type Employee = {
  _id: string;
  employeeNumber: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  employmentStatus: string;
  reportsTo?: { _id: string; name: string } | null;
  membership?: { role: string; customRoleTitle?: string } | null;
  user: { _id: string; name: string; email: string; profilePicture?: string };
};

export default function OrganizationPage() {
  const workspaceId = useParams().id as string;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empList, deptRes] = await Promise.all([
        loadAllHrEmployees<Employee>(workspaceId),
        api.get(`/workspaces/${workspaceId}/hr/departments`).catch(() => ({ data: { data: [], permissions: { canManage: false } } })),
      ]);
      setEmployees(empList);
      setDepartments(deptRes.data.data || []);
      setCanManage(Boolean(deptRes.data.permissions?.canManage));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load organization records');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const structure = useMemo(() => {
    const byManager = new Map<string, Employee[]>();
    const knownUsers = new Set(employees.map((employee) => employee.user?._id));
    for (const employee of employees) {
      const parent = employee.reportsTo?._id || '';
      const list = byManager.get(parent) || [];
      list.push(employee);
      byManager.set(parent, list);
    }
    Array.from(byManager.values()).forEach((list: Employee[]) =>
      list.sort(
        (a: Employee, b: Employee) =>
          (a.department || '').localeCompare(b.department || '') ||
          a.user.name.localeCompare(b.user.name)
      )
    );
    const roots = employees.filter(
      (employee) => !employee.reportsTo?._id || !knownUsers.has(employee.reportsTo._id)
    );
    return { byManager, roots: roots.length ? roots : employees };
  }, [employees]);

  const branch = (employee: Employee, path = new Set<string>()): React.ReactNode => {
    if (path.has(employee._id)) return null;
    const nextPath = new Set(path);
    nextPath.add(employee._id);
    return (
      <li key={employee._id} className="space-y-2">
        <Link href={`/workspace/${workspaceId}/hr/${employee._id}`} className="block">
          <Card className="transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{employee.user?.name}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {employee.jobTitle || 'Role not set'}
                  {employee.department ? ` · ${employee.department}` : ''}
                </span>
                <span className="mt-1 block text-xs capitalize text-muted-foreground">
                  {employee.employeeNumber} · {employee.employmentStatus.replaceAll('_', ' ')}
                  {employee.location ? ` · ${employee.location}` : ''}
                  {employee.membership?.role
                    ? ` · ${employee.membership.customRoleTitle || employee.membership.role}`
                    : ''}
                </span>
              </span>
            </CardContent>
          </Card>
        </Link>
        {(structure.byManager.get(employee.user?._id) || []).length > 0 && (
          <ul className="ml-5 space-y-3 border-l-2 border-border pl-4 sm:ml-8 sm:pl-6">
            {(structure.byManager.get(employee.user?._id) || []).map((child) =>
              branch(child, nextPath)
            )}
          </ul>
        )}
      </li>
    );
  };

  return (
    <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/workspace/${workspaceId}/hr`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Human Resources
        </Link>
        <Link
          href={`/workspace/${workspaceId}/settings/roles`}
          className="text-sm text-primary hover:underline"
        >
          Workspace roles & access
        </Link>
      </div>

      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-3 text-primary">
          <Network className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold">Organization</h1>
          <p className="text-sm text-muted-foreground">
            Workspace reporting hierarchy, departments structure, and team headcount.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="hierarchy" className="space-y-6">
          <TabsList className="grid w-full max-w-[420px] grid-cols-2">
            <TabsTrigger value="hierarchy" className="gap-2">
              <Network className="h-4 w-4" /> Reporting Hierarchy
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-2">
              <Building2 className="h-4 w-4" /> Departments ({departments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hierarchy" className="space-y-4">
            {structure.roots.length ? (
              <ul className="space-y-4">
                {structure.roots.map((employee) => branch(employee))}
              </ul>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Add employee records and set their manager to build the organization chart.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="departments">
            <DepartmentsManagementTab
              workspaceId={workspaceId}
              departments={departments}
              canManage={canManage}
              onRefresh={loadData}
            />
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}
