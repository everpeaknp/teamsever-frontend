import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';

interface SystemSettings {
  whatsappContactNumber: string;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Check if user is super admin before making request
      const isSuperUser = typeof window !== 'undefined' 
        ? localStorage.getItem('isSuperUser') === 'true'
        : false;
      
      if (!isSuperUser) {
        // Not a super admin, use default settings
        setSettings({ whatsappContactNumber: '+1234567890' });
        setError(null);
        setLoading(false);
        return;
      }
      
      // Try to fetch from super admin endpoint (only for super admins)
      const response = await api.get('/super-admin/settings');
      setSettings(response.data.data);
      setError(null);
    } catch (err: any) {
      // Silently use default if can't fetch
      // Only log if it's not a 403/401 error (which is expected)
      if (err.response?.status !== 403 && err.response?.status !== 401 && err.response?.status !== 500) {
        console.error('Unexpected error fetching system settings:', err);
      }
      setSettings({ whatsappContactNumber: '+1234567890' });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    
    // Listen for WhatsApp number updates
    const handleWhatsAppUpdate = (event: CustomEvent) => {
      if (event.detail?.whatsappContactNumber) {
        setSettings({ whatsappContactNumber: event.detail.whatsappContactNumber });
      }
    };
    
    window.addEventListener('whatsapp-number-updated', handleWhatsAppUpdate as EventListener);
    
    return () => {
      window.removeEventListener('whatsapp-number-updated', handleWhatsAppUpdate as EventListener);
    };
  }, []);

  return {
    settings,
    loading,
    error,
    whatsappNumber: settings?.whatsappContactNumber || '+1234567890',
    refetch: fetchSettings
  };
}
