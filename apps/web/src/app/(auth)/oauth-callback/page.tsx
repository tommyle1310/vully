'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api-client';
import { UserRole } from '@vully/shared-types';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, setTokens } = useAuthStore();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMessage(decodeURIComponent(error));
      return;
    }

    if (!accessToken || !refreshToken) {
      setStatus('error');
      setErrorMessage('Authentication failed. No tokens received.');
      return;
    }

    const processOAuth = async () => {
      try {
        // Set tokens in apiClient for subsequent requests
        apiClient.setAccessToken(accessToken);
        apiClient.setRefreshToken(refreshToken);
        setTokens(accessToken, refreshToken);

        // Fetch user profile from backend
        const meResponse = await apiClient.get<{ data: { id: string; email: string; firstName: string; lastName: string; role: string; roles?: string[]; avatarUrl?: string } }>('/auth/me');
        const userData = meResponse.data;

        const storeUser = {
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          roles: (userData.roles || [userData.role]) as UserRole[],
          avatarUrl: userData.avatarUrl,
        };

        setAuth(storeUser, accessToken, refreshToken);
        setStatus('success');

        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.replace('/dashboard');
        }, 1500);
      } catch {
        setStatus('error');
        setErrorMessage('Failed to process authentication response.');
      }
    };

    processOAuth();
  }, [searchParams, setAuth, setTokens, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary"
            >
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              {status === 'processing' && 'Signing you in...'}
              {status === 'success' && 'Welcome to Vully!'}
              {status === 'error' && 'Sign in failed'}
            </CardTitle>
            <CardDescription>
              {status === 'processing' && 'Please wait while we complete your authentication.'}
              {status === 'success' && 'Redirecting to your dashboard...'}
              {status === 'error' && errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            {status === 'processing' && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="h-12 w-12 text-primary" />
              </motion.div>
            )}
            
            {status === 'success' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </motion.div>
            )}
            
            {status === 'error' && (
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <XCircle className="h-12 w-12 text-destructive" />
                </motion.div>
                <Button 
                  onClick={() => router.push('/login')}
                  variant="default"
                >
                  Back to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
