"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Loader2, Globe, MessageSquare, Palette, Monitor } from "lucide-react";
import { accentColors, AccentColor } from "@/store/useThemeStore";

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    whatsappContactNumber: "",
    systemName: "",
    accentColor: "mint",
    themeMode: "light",
    logoUrl: ""
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/super-admin/settings");
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put("/super-admin/settings", settings);
      if (response.data.success) {
        toast.success("System settings updated successfully");
        // Trigger a global event so other components can update
        window.dispatchEvent(new CustomEvent('whatsapp-number-updated', { 
          detail: { whatsappContactNumber: settings.whatsappContactNumber } 
        }));
        window.dispatchEvent(new CustomEvent('system-settings-updated', { 
          detail: settings 
        }));
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update system settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground">Manage global branding and configuration for the entire application.</p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600" />
              General Branding
            </CardTitle>
            <CardDescription>Basic identity settings for the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="systemName">System Name</Label>
              <Input
                id="systemName"
                value={settings.systemName}
                onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                placeholder="e.g. Teamsever"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">System Logo URL</Label>
              <Input
                id="logoUrl"
                value={settings.logoUrl}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                placeholder="e.g. /logo.png or https://example.com/logo.png"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp Contact Number</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    className="pl-10"
                    value={settings.whatsappContactNumber}
                    onChange={(e) => setSettings({ ...settings, whatsappContactNumber: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">This number is used for support and global announcements.</p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-600" />
              Appearance & Theme
            </CardTitle>
            <CardDescription>Customize the default visual style of the application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>System Accent Color</Label>
              <div className="grid grid-cols-5 sm:grid-cols-11 gap-2">
                {(Object.keys(accentColors) as AccentColor[]).map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSettings({ ...settings, accentColor: color });
                      // Live preview
                      window.dispatchEvent(new CustomEvent('system-settings-updated', { 
                        detail: { ...settings, accentColor: color } 
                      }));
                    }}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      settings.accentColor === color ? "border-purple-600 scale-110 shadow-md" : "border-transparent"
                    }`}
                    style={{ backgroundColor: accentColors[color] }}
                    title={color.charAt(0).toUpperCase() + color.slice(1)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="themeMode">Default Theme Mode</Label>
              <Select
                value={settings.themeMode}
                onValueChange={(val: any) => {
                  setSettings({ ...settings, themeMode: val });
                  // Live preview
                  window.dispatchEvent(new CustomEvent('system-settings-updated', { 
                    detail: { ...settings, themeMode: val } 
                  }));
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <SelectValue placeholder="Theme Mode" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light Mode</SelectItem>
                  <SelectItem value="dark">Dark Mode</SelectItem>
                  <SelectItem value="auto">System Default (Auto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
