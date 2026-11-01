'use client';

import { useState } from 'react';
import { Building2, Plus, Users, Edit2, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export type DepartmentItem = {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  color?: string;
  isActive: boolean;
  employeeCount?: number;
  headOfDepartment?: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  } | null;
};

interface DepartmentsManagementTabProps {
  workspaceId: string;
  departments: DepartmentItem[];
  canManage: boolean;
  onRefresh: () => void;
}

export function DepartmentsManagementTab({
  workspaceId,
  departments,
  canManage,
  onRefresh,
}: DepartmentsManagementTabProps) {
  const [openModal, setOpenModal] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#135BEC');

  const openCreateDialog = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setDescription('');
    setColor('#135BEC');
    setOpenModal(true);
  };

  const openEditDialog = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code || '');
    setDescription(dept.description || '');
    setColor(dept.color || '#135BEC');
    setOpenModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter department name');
      return;
    }

    setSaving(true);
    try {
      if (editingDept) {
        await api.patch(`/workspaces/${workspaceId}/hr/departments/${editingDept._id}`, {
          name: name.trim(),
          code: code.trim(),
          description: description.trim(),
          color,
        });
        toast.success(`Department "${name}" updated successfully`);
      } else {
        await api.post(`/workspaces/${workspaceId}/hr/departments`, {
          name: name.trim(),
          code: code.trim(),
          description: description.trim(),
          color,
        });
        toast.success(`Department "${name}" created successfully`);
      }
      setOpenModal(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: DepartmentItem) => {
    if (!confirm(`Are you sure you want to delete department "${dept.name}"?`)) return;

    setDeletingId(dept._id);
    try {
      await api.delete(`/workspaces/${workspaceId}/hr/departments/${dept._id}`);
      toast.success(`Department "${dept.name}" deleted successfully`);
      onRefresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete department');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Company Departments</h2>
          <p className="text-sm text-muted-foreground">
            Manage organization units, departmental codes, and track team headcount.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        )}
      </div>

      {departments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold text-lg">No departments configured</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              Create your organization departments to categorize employees and standardize job roles.
            </p>
            {canManage && (
              <Button onClick={openCreateDialog} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Add First Department
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Card key={dept._id} className="relative overflow-hidden transition-all hover:shadow-sm">
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: dept.color || '#135BEC' }}
              />
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      {dept.name}
                      {dept.code && (
                        <Badge variant="secondary" className="text-xs uppercase tracking-wider">
                          {dept.code}
                        </Badge>
                      )}
                    </CardTitle>
                    {dept.description && (
                      <CardDescription className="text-xs line-clamp-2 mt-1">
                        {dept.description}
                      </CardDescription>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(dept)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={deletingId === dept._id}
                        onClick={() => handleDelete(dept)}
                      >
                        {deletingId === dept._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    {dept.employeeCount || 0} active member{(dept.employeeCount || 0) === 1 ? '' : 's'}
                  </span>
                  {dept.headOfDepartment?.name ? (
                    <span className="truncate max-w-[140px]" title={dept.headOfDepartment.name}>
                      Head: {dept.headOfDepartment.name}
                    </span>
                  ) : (
                    <span className="italic text-muted-foreground/70">No head assigned</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
            <DialogDescription>
              {editingDept
                ? 'Update departmental information and code.'
                : 'Define a new department for your company organization structure.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Department Name *</Label>
              <Input
                id="dept-name"
                placeholder="e.g. Engineering, Marketing, Product"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dept-code">Code / Acronym</Label>
                <Input
                  id="dept-code"
                  placeholder="e.g. ENG, MKT"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept-color">Badge Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="dept-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 rounded border p-1 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono uppercase text-muted-foreground">{color}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-desc">Description (optional)</Label>
              <Textarea
                id="dept-desc"
                placeholder="Brief description of department responsibility..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDept ? 'Save Changes' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
