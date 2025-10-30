import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/layout/Navbar";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Moon, 
  Sun, 
  Globe, 
  Lock, 
  Database,
  Shield,
  Monitor,
  Smartphone,
  Mail,
  MessageSquare,
  Volume2,
  Eye,
  Users,
  Save,
  RotateCcw
} from "lucide-react";
import { supabase } from '../lib/supabase';
import { toast } from '@/hooks/use-toast';
import { withAuth } from '../lib/withAuth';

function Settings() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    // Appearance
    theme: 'dark',
    language: 'en',
    
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    attendanceAlerts: true,
    systemUpdates: true,
    marketingEmails: false,
    
    // Privacy & Security
    twoFactorEnabled: false,
    sessionTimeout: '60',
    dataSharing: false,
    profileVisibility: 'university',
    
    // System
    autoBackup: true,
    dataRetention: '365',
    analyticsEnabled: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: settingsData } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userData.user.id)
          .single();

        if (settingsData) {
          setSettings({
            ...settings,
            ...settingsData.preferences
          });
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: userData.user.id,
            preferences: settings
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Settings saved successfully",
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSettings({
      theme: 'dark',
      language: 'en',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      attendanceAlerts: true,
      systemUpdates: true,
      marketingEmails: false,
      twoFactorEnabled: false,
      sessionTimeout: '60',
      dataSharing: false,
      profileVisibility: 'university',
      autoBackup: true,
      dataRetention: '365',
      analyticsEnabled: true,
    });
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults",
    });
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen dark bg-background">
      <Navbar showProfileMenu />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Settings"
          description="Customize your ATMA experience and preferences"
        />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Settings Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Settings Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-3 p-2 bg-primary/10 rounded-lg">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Appearance</span>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Notifications</span>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Privacy & Security</span>
                </div>
                <div className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">System</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-2">
                  <Button onClick={handleSave} disabled={loading} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleReset} className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Settings Content */}
          <motion.div
            className="lg:col-span-2 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="h-5 w-5 mr-2" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize how ATMA looks and feels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <Select value={settings.theme} onValueChange={(value) => updateSetting('theme', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Language</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred language</p>
                  </div>
                  <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Manage how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Email Notifications</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center space-x-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Push Notifications</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>SMS Notifications</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">Receive critical updates via SMS</p>
                  </div>
                  <Switch
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Attendance Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified about attendance updates</p>
                  </div>
                  <Switch
                    checked={settings.attendanceAlerts}
                    onCheckedChange={(checked) => updateSetting('attendanceAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>System Updates</Label>
                    <p className="text-sm text-muted-foreground">Notifications about system maintenance</p>
                  </div>
                  <Switch
                    checked={settings.systemUpdates}
                    onCheckedChange={(checked) => updateSetting('systemUpdates', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Receive product updates and news</p>
                  </div>
                  <Switch
                    checked={settings.marketingEmails}
                    onCheckedChange={(checked) => updateSetting('marketingEmails', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Privacy & Security
                </CardTitle>
                <CardDescription>
                  Control your privacy and security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Switch
                    checked={settings.twoFactorEnabled}
                    onCheckedChange={(checked) => updateSetting('twoFactorEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">Auto logout after inactivity (minutes)</p>
                  </div>
                  <Select value={settings.sessionTimeout} onValueChange={(value) => updateSetting('sessionTimeout', value)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="60">60</SelectItem>
                      <SelectItem value="120">120</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Data Sharing</Label>
                    <p className="text-sm text-muted-foreground">Share analytics data to improve the service</p>
                  </div>
                  <Switch
                    checked={settings.dataSharing}
                    onCheckedChange={(checked) => updateSetting('dataSharing', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">Who can see your profile information</p>
                  </div>
                  <Select value={settings.profileVisibility} onValueChange={(value) => updateSetting('profileVisibility', value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Everyone</SelectItem>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  System
                </CardTitle>
                <CardDescription>
                  Configure system behavior and data management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto Backup</Label>
                    <p className="text-sm text-muted-foreground">Automatically backup your data</p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => updateSetting('autoBackup', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Data Retention</Label>
                    <p className="text-sm text-muted-foreground">How long to keep your data (days)</p>
                  </div>
                  <Select value={settings.dataRetention} onValueChange={(value) => updateSetting('dataRetention', value)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90</SelectItem>
                      <SelectItem value="180">180</SelectItem>
                      <SelectItem value="365">365</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Analytics</Label>
                    <p className="text-sm text-muted-foreground">Help improve ATMA with usage analytics</p>
                  </div>
                  <Switch
                    checked={settings.analyticsEnabled}
                    onCheckedChange={(checked) => updateSetting('analyticsEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(Settings);
