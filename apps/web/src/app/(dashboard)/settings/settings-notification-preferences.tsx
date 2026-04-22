'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/use-notifications';

interface PreferencesFormValues {
  push_enabled: boolean;
  email_enabled: boolean;
  zalo_enabled: boolean;
  payment_notifications: boolean;
  incident_notifications: boolean;
  announcement_notifications: boolean;
}

function PreferencesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

export function SettingsNotificationPreferences() {
  const { toast } = useToast();
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  const form = useForm<PreferencesFormValues>({
    defaultValues: {
      push_enabled: true,
      email_enabled: true,
      zalo_enabled: false,
      payment_notifications: true,
      incident_notifications: true,
      announcement_notifications: true,
    },
  });

  useEffect(() => {
    if (preferences) {
      form.reset({
        push_enabled: preferences.push_enabled ?? true,
        email_enabled: preferences.email_enabled ?? true,
        zalo_enabled: preferences.zalo_enabled ?? false,
        payment_notifications: preferences.payment_notifications ?? true,
        incident_notifications: preferences.incident_notifications ?? true,
        announcement_notifications: preferences.announcement_notifications ?? true,
      });
    }
  }, [preferences, form]);

  const onSubmit = (values: PreferencesFormValues) => {
    updatePreferences.mutate(values, {
      onSuccess: () => {
        toast({ title: 'Preferences saved', description: 'Your notification preferences have been updated.' });
      },
      onError: () => {
        toast({ title: 'Failed to save', description: 'Could not update preferences. Please try again.', variant: 'destructive' });
      },
    });
  };

  if (isLoading) return <PreferencesSkeleton />;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Delivery Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Delivery Channels</CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push_enabled" className="font-medium">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications on your devices</p>
              </div>
            </div>
            <Switch
              id="push_enabled"
              checked={form.watch('push_enabled')}
              onCheckedChange={(checked) => form.setValue('push_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email_enabled" className="font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email notifications for important updates</p>
              </div>
            </div>
            <Switch
              id="email_enabled"
              checked={form.watch('email_enabled')}
              onCheckedChange={(checked) => form.setValue('email_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="zalo_enabled" className="font-medium">Zalo Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via Zalo messaging</p>
              </div>
            </div>
            <Switch
              id="zalo_enabled"
              checked={form.watch('zalo_enabled')}
              onCheckedChange={(checked) => form.setValue('zalo_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Types</CardTitle>
          <CardDescription>Select which types of notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="payment_notifications" className="font-medium">Payment Updates</Label>
                <p className="text-sm text-muted-foreground">Payment confirmations, reminders, and overdue notices</p>
              </div>
            </div>
            <Switch
              id="payment_notifications"
              checked={form.watch('payment_notifications')}
              onCheckedChange={(checked) => form.setValue('payment_notifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="incident_notifications" className="font-medium">Incident Updates</Label>
                <p className="text-sm text-muted-foreground">New incidents, status changes, and comment notifications</p>
              </div>
            </div>
            <Switch
              id="incident_notifications"
              checked={form.watch('incident_notifications')}
              onCheckedChange={(checked) => form.setValue('incident_notifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="announcement_notifications" className="font-medium">Announcements</Label>
                <p className="text-sm text-muted-foreground">Building announcements and management updates</p>
              </div>
            </div>
            <Switch
              id="announcement_notifications"
              checked={form.watch('announcement_notifications')}
              onCheckedChange={(checked) => form.setValue('announcement_notifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={updatePreferences.isPending}>
        {updatePreferences.isPending ? 'Saving...' : 'Save Preferences'}
      </Button>
    </form>
  );
}
