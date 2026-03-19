'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User,
  Shield,
  Upload,
  Trash2,
  Lock,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Validation schemas
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

type TabType = 'profile' | 'security';

const tabs = [
  { id: 'profile' as TabType, label: 'Profile', icon: User },
  { id: 'security' as TabType, label: 'Security', icon: Shield },
];

// Password strength calculator
function calculatePasswordStrength(password: string): { strength: number; label: string; color: string } {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 12.5;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 12.5;

  let label = 'Weak';
  let color = 'bg-red-500';
  if (strength >= 75) {
    label = 'Strong';
    color = 'bg-green-500';
  } else if (strength >= 50) {
    label = 'Medium';
    color = 'bg-yellow-500';
  }

  return { strength, label, color };
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, label: 'Weak', color: 'bg-red-500' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      jobTitle: '',
      department: '',
      bio: '',
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Get from localStorage
        const userId = localStorage.getItem('userId');
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        const userAvatar = localStorage.getItem('userAvatar');

        // Use localStorage data
        if (userId && userName && userEmail) {
          const userData = {
            _id: userId,
            name: userName,
            email: userEmail,
            avatar: userAvatar || undefined,
            jobTitle: '',
            department: '',
            bio: '',
            language: 'en-US',
            timezone: 'America/Los_Angeles',
            twoFactorEnabled: false,
          };
          
          setUser(userData);
          
          profileForm.reset({
            name: userName,
            email: userEmail,
            jobTitle: '',
            department: '',
            bio: '',
          });
          
          if (userAvatar) {
            setAvatarPreview(userAvatar);
          }
        }

        // TODO: Uncomment when backend endpoint is ready
        /*
        // Fetch full user data from API
        const response = await api.get('/users/profile');
        const userData = response.data.data || response.data;
        
        // Update Zustand store
        setUser(userData);
        
        // Update form with full data
        profileForm.reset({
          name: userData.name || '',
          email: userData.email || '',
          jobTitle: userData.jobTitle || '',
          department: userData.department || '',
          bio: userData.bio || '',
        });
        
        setAvatarPreview(userData.avatar || null);
        setTwoFactorEnabled(userData.twoFactorEnabled || false);
        setLanguage(userData.language || 'en-US');
        setTimezone(userData.timezone || 'America/Los_Angeles');
        */
        
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        toast.error('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [setUser, profileForm]);

  // Watch password field for strength meter
  const newPassword = passwordForm.watch('newPassword');
  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(calculatePasswordStrength(newPassword));
    }
  }, [newPassword]);

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        toast.error('File size must be less than 800KB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setAvatarFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle avatar removal
  const handleAvatarRemove = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save profile
  const onSaveProfile = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      // For now, just update localStorage since backend endpoint doesn't exist
      localStorage.setItem('userName', data.name);
      
      // Update Zustand store with current data
      const updatedUser = {
        _id: localStorage.getItem('userId') || '',
        name: data.name,
        email: data.email,
        avatar: avatarPreview || undefined,
        jobTitle: data.jobTitle,
        department: data.department,
        bio: data.bio,
        language,
        timezone,
        twoFactorEnabled,
      };
      
      setUser(updatedUser);
      
      // If avatar was changed, update localStorage
      if (avatarPreview) {
        localStorage.setItem('userAvatar', avatarPreview);
      } else {
        localStorage.removeItem('userAvatar');
      }

      toast.success('Profile updated successfully!');
      
      // TODO: Uncomment when backend endpoint is ready
      /*
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('jobTitle', data.jobTitle || '');
      formData.append('department', data.department || '');
      formData.append('bio', data.bio || '');
      formData.append('language', language);
      formData.append('timezone', timezone);
      formData.append('twoFactorEnabled', String(twoFactorEnabled));

      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else if (!avatarPreview) {
        formData.append('removeAvatar', 'true');
      }

      const response = await api.patch('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedUser = response.data.data || response.data;
      setUser(updatedUser);
      
      // Update localStorage
      localStorage.setItem('userName', updatedUser.name);
      if (updatedUser.avatar) {
        localStorage.setItem('userAvatar', updatedUser.avatar);
      }
      */
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const onChangePassword = async (data: PasswordFormData) => {
    setIsSaving(true);
    try {
      await api.post('/users/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      toast.success('Password changed successfully!');
      passwordForm.reset();
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel changes
  const handleCancel = () => {
    // Get current user data from store or localStorage
    const currentUser = user || {
      name: localStorage.getItem('userName') || '',
      email: localStorage.getItem('userEmail') || '',
      avatar: localStorage.getItem('userAvatar') || null,
    };

    profileForm.reset({
      name: currentUser.name || '',
      email: currentUser.email || '',
      jobTitle: (currentUser as any).jobTitle || '',
      department: (currentUser as any).department || '',
      bio: (currentUser as any).bio || '',
    });
    setAvatarPreview((currentUser as any).avatar || null);
    setAvatarFile(null);
    setTwoFactorEnabled((currentUser as any).twoFactorEnabled || false);
    setLanguage((currentUser as any).language || 'en-US');
    setTimezone((currentUser as any).timezone || 'America/Los_Angeles');
    toast.info('Changes cancelled');
  };

  // Get user initials
  const getUserInitials = () => {
    const name = user?.name || localStorage.getItem('userName') || 'User';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f0f]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Account Settings</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-slate-200 dark:border-[#262626] overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-[#262626]">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Settings
                </h2>
              </div>
              <nav className="flex flex-col">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all',
                        isActive
                          ? 'text-primary bg-primary/5 border-r-4 border-primary'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#262626] hover:text-primary'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 space-y-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <>
                <section className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-slate-200 dark:border-[#262626] overflow-hidden">
                  <div className="p-6 border-b border-slate-100 dark:border-[#262626]">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Profile Information
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Update your personal details and how others see you on the platform.
                    </p>
                  </div>

                  <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="p-6 space-y-6">
                    {/* Avatar Section */}
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-slate-600 dark:text-slate-400">
                              {getUserInitials()}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </div>

                      <div className="text-center sm:text-left">
                        <h4 className="font-semibold text-slate-900 dark:text-white">Your Avatar</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          JPG, GIF or PNG. Max size of 800KB
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                          >
                            Upload New
                          </Button>
                          <Button
                            type="button"
                            onClick={handleAvatarRemove}
                            size="sm"
                            variant="outline"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          {...profileForm.register('name')}
                          className="w-full"
                        />
                        {profileForm.formState.errors.name && (
                          <p className="text-xs text-red-500">
                            {profileForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          {...profileForm.register('email')}
                          disabled
                          className="w-full bg-slate-50 dark:bg-slate-900 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Email cannot be changed
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jobTitle">Job Title</Label>
                        <Input
                          id="jobTitle"
                          {...profileForm.register('jobTitle')}
                          placeholder="e.g., Senior Product Designer"
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Select
                          value={profileForm.watch('department')}
                          onValueChange={(value) => profileForm.setValue('department', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="design">Design</SelectItem>
                            <SelectItem value="engineering">Engineering</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          {...profileForm.register('bio')}
                          placeholder="Tell us about yourself..."
                          rows={4}
                          className="w-full"
                        />
                        {profileForm.formState.errors.bio && (
                          <p className="text-xs text-red-500">
                            {profileForm.formState.errors.bio.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </form>
                </section>
              </>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <section className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-slate-200 dark:border-[#262626] overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-[#262626]">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Security & Access
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Manage your account password and authentication methods.
                  </p>
                </div>

                <div className="p-6 space-y-8">
                  {/* Password Change */}
                  <form onSubmit={passwordForm.handleSubmit(onChangePassword)}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Change Password
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Ensure your account is using a long, random password to stay secure.
                        </p>
                      </div>

                      <div className="md:col-span-2 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Current Password</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            {...passwordForm.register('currentPassword')}
                            className="w-full"
                          />
                          {passwordForm.formState.errors.currentPassword && (
                            <p className="text-xs text-red-500">
                              {passwordForm.formState.errors.currentPassword.message}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              {...passwordForm.register('newPassword')}
                              className="w-full"
                            />
                            {passwordForm.formState.errors.newPassword && (
                              <p className="text-xs text-red-500">
                                {passwordForm.formState.errors.newPassword.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              {...passwordForm.register('confirmPassword')}
                              className="w-full"
                            />
                            {passwordForm.formState.errors.confirmPassword && (
                              <p className="text-xs text-red-500">
                                {passwordForm.formState.errors.confirmPassword.message}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Password Strength Meter */}
                        {newPassword && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 dark:text-slate-400">
                                Password Strength
                              </span>
                              <span className={cn(
                                'font-semibold',
                                passwordStrength.strength >= 75 ? 'text-green-600' :
                                passwordStrength.strength >= 50 ? 'text-yellow-600' :
                                'text-red-600'
                              )}>
                                {passwordStrength.label}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full transition-all duration-300', passwordStrength.color)}
                                style={{ width: `${passwordStrength.strength}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={isSaving}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            'Update Password'
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>

                  <hr className="border-slate-100 dark:border-[#262626]" />

                  {/* Two Factor Auth */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Two-Factor Authentication
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Add an extra layer of security to your account by requiring a code.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={twoFactorEnabled}
                      onCheckedChange={setTwoFactorEnabled}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Other Tabs - Removed */}
            {activeTab !== 'profile' && activeTab !== 'security' && (
              <section className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-slate-200 dark:border-[#262626] overflow-hidden">
                <div className="p-12 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    This section has been removed.
                  </p>
                </div>
              </section>
            )}

            {/* Action Bar */}
            {(activeTab === 'profile' || activeTab === 'security') && (
              <div className="flex items-center justify-end gap-3 pt-4 pb-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={profileForm.handleSubmit(onSaveProfile)}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
