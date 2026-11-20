import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';

interface SystemSettings {
  whatsappContactNumber: string;
  systemName: string;
  accentColor: string;
  themeMode: 'light' | 'dark' | 'auto';
  logoUrl: string;
}

const defaultSystemSettings: SystemSettings = {
  whatsappContactNumber: '+1234567890',
  systemName: 'Tasko',
  accentColor: 'mint',
  themeMode: 'light',
  logoUrl: '/tasko_logo.png',
};

function normalizeSystemBranding(value: Partial<SystemSettings> | null | undefined): SystemSettings {
  const systemName = value?.systemName?.trim();
  const logoUrl = value?.logoUrl?.trim();
  return {
    whatsappContactNumber: value?.whatsappContactNumber || defaultSystemSettings.whatsappContactNumber,
    systemName: !systemName || /teamsever/i.test(systemName) ? 'Tasko' : systemName,
    accentColor: value?.accentColor || defaultSystemSettings.accentColor,
    themeMode: value?.themeMode || defaultSystemSettings.themeMode,
    logoUrl: !logoUrl || /teamsever/i.test(logoUrl) ? '/tasko_logo.png' : logoUrl,
  };
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from super admin endpoint (which uses public access for basic settings)
      const response = await api.get('/super-admin/settings');
      if (response.data?.success) {
        setSettings(normalizeSystemBranding(response.data.data));
      }
      setError(null);
    } catch (err: any) {
      // Silently use default if can't fetch
      if (err.response?.status !== 403 && err.response?.status !== 401 && err.response?.status !== 500) {
      }
      setSettings(defaultSystemSettings);
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
        setSettings(prev => prev ? { ...prev, whatsappContactNumber: event.detail.whatsappContactNumber } : null);
      }
    };

    // Listen for systemic settings updates
    const handleSystemUpdate = (event: CustomEvent) => {
      if (event.detail) {
        setSettings(normalizeSystemBranding(event.detail));
      }
    };
    
    window.addEventListener('whatsapp-number-updated', handleWhatsAppUpdate as EventListener);
    window.addEventListener('system-settings-updated', handleSystemUpdate as EventListener);
    
    return () => {
      window.removeEventListener('whatsapp-number-updated', handleWhatsAppUpdate as EventListener);
      window.removeEventListener('system-settings-updated', handleSystemUpdate as EventListener);
    };
  }, []);

  return {
    settings,
    loading,
    error,
    whatsappNumber: settings?.whatsappContactNumber || '+1234567890',
    systemName: settings?.systemName || 'Tasko',
    accentColor: settings?.accentColor || 'mint',
    themeMode: settings?.themeMode || 'light',
    logoUrl: settings?.logoUrl || '/tasko_logo.png',
    refetch: fetchSettings
  };
}
