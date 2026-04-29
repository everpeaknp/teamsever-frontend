'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2, Zap, LogOut, Moon, Sun, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { useThemeStore } from '@/store/useThemeStore';
import { clearAuthData, getCurrentUser } from '@/lib/auth';
import { submitEsewaPayment } from '@/lib/esewa';
import { CurrencyDisplay } from '@/components/currency/CurrencyDisplay';
import { CurrencySwitcherCompact } from '@/components/currency/CurrencySwitcher';
import { PaymentSelectionModal } from '@/components/modals/PaymentSelectionModal';
import { Plan } from '@/types';


export default function PricingPage() {
  const router = useRouter();
  const { whatsappNumber, systemName } = useSystemSettings();
  const { subscription } = useSubscription();
  const { themeMode, setThemeMode } = useThemeStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.name) {
      setUserName(user.name);
    }
    fetchPlans();
    fetchNotificationCount();
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadNotifications(response.data.count || 0);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  const handleLogout = () => {
    clearAuthData();
    router.push('/login');
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/plans');
      const sortedPlans = response.data.data.sort((a: Plan, b: Plan) => a.price - b.price);
      setPlans(sortedPlans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPlan = async (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toString();
  };

  const isCurrentPlan = (planName: string) => {
    return planName.toLowerCase() === subscription?.plan?.name?.toLowerCase();
  };

  const getFeaturesList = (plan: Plan) => {
    const features = [];
    
    // Core Limits
    features.push({
      category: 'Core Limits',
      items: [
        `${formatLimit(plan.features.maxWorkspaces)} Workspace${plan.features.maxWorkspaces !== 1 ? 's' : ''}`,
        `${formatLimit(plan.features.maxMembers)} Member${plan.features.maxMembers !== 1 ? 's' : ''} per workspace`,
        `${formatLimit(plan.features.maxSpaces)} Space${plan.features.maxSpaces !== 1 ? 's' : ''}`,
        `${formatLimit(plan.features.maxLists)} List${plan.features.maxLists !== 1 ? 's' : ''}`,
        `${formatLimit(plan.features.maxFolders)} Folder${plan.features.maxFolders !== 1 ? 's' : ''}`,
        `${formatLimit(plan.features.maxTasks)} Task${plan.features.maxTasks !== 1 ? 's' : ''}`,
      ]
    });
    
    // Team Management
    const teamItems = [`${formatLimit(plan.features.maxAdmins)} Admin${plan.features.maxAdmins !== 1 ? 's' : ''}`];
    
    // Add custom roles if available
    if ((plan.features as any).maxCustomRoles !== undefined && (plan.features as any).maxCustomRoles !== 0) {
      teamItems.push(`${formatLimit((plan.features as any).maxCustomRoles)} Custom Role${(plan.features as any).maxCustomRoles !== 1 ? 's' : ''}`);
    }
    
    features.push({
      category: 'Team Management',
      items: teamItems
    });
    
    // Advanced Features
    const advancedItems = [];
    
    if (plan.features.hasAccessControl) {
      advancedItems.push(`${plan.features.accessControlTier.charAt(0).toUpperCase() + plan.features.accessControlTier.slice(1)} Access Control`);
    }
    
    // Add tables feature if available
    if ((plan.features as any).maxTables !== undefined && (plan.features as any).maxTables !== 0) {
      advancedItems.push(`${formatLimit((plan.features as any).maxTables)} Custom Table${(plan.features as any).maxTables !== 1 ? 's' : ''}`);
      
      if ((plan.features as any).maxColumnsLimit !== undefined) {
        advancedItems.push(`${formatLimit((plan.features as any).maxColumnsLimit)} Column${(plan.features as any).maxColumnsLimit !== 1 ? 's' : ''} per table`);
      }
      
      if ((plan.features as any).maxRowsLimit !== undefined) {
        advancedItems.push(`${formatLimit((plan.features as any).maxRowsLimit)} Row${(plan.features as any).maxRowsLimit !== 1 ? 's' : ''} per table`);
      }
    }
    
    if (advancedItems.length > 0) {
      features.push({
        category: 'Advanced Features',
        items: advancedItems
      });
    }
    
    // Communication
    const commItems = [];
    
    if (plan.features.hasGroupChat) {
      const messageLimit = plan.features.messageLimit === -1 ? 'Unlimited' : plan.features.messageLimit;
      commItems.push(`Group Chat (${messageLimit} messages/month)`);
    } else {
      commItems.push('Group Chat (Disabled)');
    }
    
    if (plan.features.announcementCooldown === 0) {
      commItems.push('No Announcement Cooldown');
    } else {
      commItems.push(`${plan.features.announcementCooldown}h Announcement Cooldown`);
    }
    
    // Add direct messages if available
    if ((plan.features as any).maxDirectMessagesPerUser !== undefined && (plan.features as any).maxDirectMessagesPerUser !== 0) {
      commItems.push(`${formatLimit((plan.features as any).maxDirectMessagesPerUser)} DM${(plan.features as any).maxDirectMessagesPerUser !== 1 ? 's' : ''} per user`);
    }
    
    features.push({
      category: 'Communication',
      items: commItems
    });
    
    // Content Storage
    const storageItems = [];
    
    if ((plan.features as any).maxFiles !== undefined && (plan.features as any).maxFiles !== 0) {
      storageItems.push(`${formatLimit((plan.features as any).maxFiles)} File${(plan.features as any).maxFiles !== 1 ? 's' : ''} per user`);
    }
    
    if ((plan.features as any).maxDocuments !== undefined && (plan.features as any).maxDocuments !== 0) {
      storageItems.push(`${formatLimit((plan.features as any).maxDocuments)} Document${(plan.features as any).maxDocuments !== 1 ? 's' : ''} per user`);
    }
    
    if (storageItems.length > 0) {
      features.push({
        category: 'Content Storage',
        items: storageItems
      });
    }
    
    return features;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Dashboard-style Header */}
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Teamsever</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Welcome back, {userName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:text-primary transition-colors hidden sm:block"
              >
                Dashboard
              </Link>

              <CurrencySwitcherCompact />

              <button
                onClick={() => router.push('/notifications')}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              <button
                onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title={themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {themeMode === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors flex-shrink-0"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {plans.map((plan) => {
                const isCurrent = isCurrentPlan(plan.name);
                const isFree = plan.price === 0;
                const isProcessing = processingPlanId === plan._id;
                const features = getFeaturesList(plan);

                return (
                  <div
                    key={plan._id}
                    className={`relative rounded-2xl border-2 p-8 transition-all flex flex-col bg-white dark:bg-gray-800 ${
                      isCurrent
                        ? 'border-purple-500 shadow-xl shadow-purple-500/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-lg'
                    }`}
                  >
                    {isCurrent && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
                        Current Plan
                      </Badge>
                    )}

                    {!isFree && plan.price < 100 && !isCurrent && (
                      <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white">
                        Popular
                      </Badge>
                    )}

                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline justify-center gap-1 mb-3">
                        <CurrencyDisplay 
                          amount={plan.basePrice || plan.price} 
                          baseCurrency={plan.baseCurrency || 'NPR'}
                          className="text-5xl font-extrabold text-gray-900 dark:text-white"
                        />
                        <span className="text-gray-500 dark:text-gray-400">/month</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {plan.description}
                      </p>
                    </div>

                    <ul className="space-y-4 mb-8 flex-grow">
                      {features.map((featureGroup, groupIndex) => (
                        <li key={groupIndex} className="space-y-2">
                          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                            {featureGroup.category}
                          </div>
                          <ul className="space-y-2 pl-2">
                            {featureGroup.items.map((item, itemIndex) => {
                              const isDisabled = item.includes('(Disabled)');
                              
                              return (
                                <li key={itemIndex} className="flex items-start gap-2">
                                  {isDisabled ? (
                                    <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                  )}
                                  <span className={`text-sm ${isDisabled ? 'text-gray-500 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {item.replace(' (Disabled)', '')}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto">
                      {isCurrent ? (
                        <Button
                          disabled
                          className="w-full bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                          size="lg"
                        >
                          Current Plan
                        </Button>
                      ) : isFree ? (
                        <Button
                          disabled
                          variant="outline"
                          className="w-full"
                          size="lg"
                        >
                          Free Plan
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleBuyPlan(plan)}
                          disabled={isProcessing}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
                          size="lg"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-5 h-5 mr-2" />
                              Get Started
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Selection Modal */}
            {selectedPlan && (
              <PaymentSelectionModal
                isOpen={showPaymentModal}
                onClose={() => {
                  setShowPaymentModal(false);
                  setSelectedPlan(null);
                }}
                plan={selectedPlan}
                whatsappNumber={whatsappNumber}
                systemName={systemName}
              />
            )}

            {/* Payment Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Secure Payment with eSewa
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                All payments are securely processed through eSewa, Nepal's most trusted digital wallet. Click "Get Started" to proceed with payment.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Test Credentials:</strong> eSewa ID: 9806800001 | Password: Nepal@123 | MPIN: 1122 | Token: 123456
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
