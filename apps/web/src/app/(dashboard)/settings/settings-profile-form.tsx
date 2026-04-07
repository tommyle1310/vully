'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2, Save, BadgeCheck, Camera } from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/date-picker';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  citizenId: z.string().optional(),
  taxId: z.string().optional(),
  dateOfBirth: z.date().optional(),
  address: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const roleLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> =
  {
    admin: { label: 'Administrator', variant: 'default' },
    technician: { label: 'Technician', variant: 'secondary' },
    resident: { label: 'Resident', variant: 'outline' },
  };

export function SettingsProfileForm() {
  const { toast } = useToast();
  const { user, updateUser } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>('');
  const [existingAvatarPublicId, setExistingAvatarPublicId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const hasAvatarPreview = avatarPreviewUrl.length > 0;

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: '',
      citizenId: '',
      taxId: '',
      dateOfBirth: undefined,
      address: '',
    },
  });

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!user) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        const response = await apiClient.get<{
          data: {
            firstName: string;
            lastName: string;
            phone?: string;
            profileData?: {
              avatarUrl?: string;
              avatarPublicId?: string;
              citizenId?: string;
              taxId?: string;
              dateOfBirth?: string;
              address?: string;
            };
          };
        }>('/users/me');

        if (!mounted) return;

        const profileData = response.data.profileData || {};
        setAvatarPreviewUrl(profileData.avatarUrl || '');
        setExistingAvatarPublicId(profileData.avatarPublicId || null);

        form.reset({
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          phone: response.data.phone || '',
          citizenId: profileData.citizenId || '',
          taxId: profileData.taxId || '',
          dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined,
          address: profileData.address || '',
        });
      } catch {
        if (!mounted) return;
        toast({
          title: 'Profile load failed',
          description: 'Could not load your profile details. You can still edit basic fields.',
          variant: 'destructive',
        });
      } finally {
        if (mounted) setIsLoadingProfile(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user, form, toast]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const handleAvatarFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please choose an image file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Avatar size must be under 5MB.',
        variant: 'destructive',
      });
      return;
    }

    if (avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setSelectedAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsUpdating(true);

    try {
      let nextAvatarUrl = avatarPreviewUrl;
      let nextAvatarPublicId = existingAvatarPublicId;

      if (selectedAvatarFile) {
        const cloudinaryPayload = new FormData();
        cloudinaryPayload.append('file', selectedAvatarFile);

        const uploadResponse = await fetch('/api/cloudinary/upload', {
          method: 'POST',
          body: cloudinaryPayload,
        });

        if (!uploadResponse.ok) {
          const errorBody = await uploadResponse
            .json()
            .catch(() => ({ error: 'Avatar upload failed.' }));
          throw new Error(errorBody.error || 'Avatar upload failed.');
        }

        const uploaded = (await uploadResponse.json()) as { secureUrl: string; publicId: string };
        nextAvatarUrl = uploaded.secureUrl;
        nextAvatarPublicId = uploaded.publicId;
      }

      const response = await apiClient.patch<{
        data: {
          firstName: string;
          lastName: string;
          phone?: string;
          profileData?: Record<string, unknown>;
        };
      }>('/users/me', {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        profileData: {
          avatarUrl: nextAvatarUrl || undefined,
          avatarPublicId: nextAvatarPublicId || undefined,
          citizenId: data.citizenId || undefined,
          taxId: data.taxId || undefined,
          dateOfBirth: data.dateOfBirth ? format(data.dateOfBirth, 'yyyy-MM-dd') : undefined,
          address: data.address || undefined,
        },
      });

      if (
        selectedAvatarFile &&
        existingAvatarPublicId &&
        nextAvatarPublicId &&
        existingAvatarPublicId !== nextAvatarPublicId
      ) {
        await fetch('/api/cloudinary/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: existingAvatarPublicId }),
        });
      }

      updateUser({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        phone: response.data.phone,
      });

      setSelectedAvatarFile(null);
      setExistingAvatarPublicId(nextAvatarPublicId || null);

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });

      if (avatarPreviewUrl.startsWith('blob:') && nextAvatarUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarPreviewUrl(nextAvatarUrl);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = () => {
    if (!user) return '?';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  if (!user) return null;

  return (
    <>
      {/* Profile Overview Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20 border border-border/70">
                <AvatarImage src={hasAvatarPreview ? avatarPreviewUrl : undefined} />
                <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isLoadingProfile || isUpdating}
              >
                <Camera className="h-3.5 w-3.5" />
              </Button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileSelected}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex gap-2 mt-2">
                {user.roles?.map((role) => (
                  <Badge key={role} variant={roleLabels[role]?.variant || 'outline'}>
                    {roleLabels[role]?.label || role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProfile ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile details...
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+84 xxx xxx xxx" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select date"
                            toDate={new Date()}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4" />
                    Additional Information
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="citizenId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Citizen ID</FormLabel>
                          <FormControl>
                            <Input placeholder="ID number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Tax number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 mt-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Your address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
