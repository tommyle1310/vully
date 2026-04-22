'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

// Google icon SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// Zalo icon SVG
function ZaloIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <circle cx="24" cy="24" r="20" fill="#0068FF"/>
      <path d="M32.5 19.5h-8l4-6c.4-.6.1-1.4-.5-1.8-.6-.4-1.4-.1-1.8.5l-5 7.5c-.2.3-.2.7 0 1 .2.3.5.5.8.5h8l-4 6c-.4.6-.1 1.4.5 1.8.2.1.4.2.6.2.4 0 .8-.2 1.1-.6l5-7.5c.2-.3.2-.7 0-1-.2-.4-.5-.6-.7-.6z" fill="white"/>
      <path d="M20 28h-4v-8.5c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5V29c0 .6.4 1 1 1h6c.6 0 1-.4 1-1s-.4-1-1-1z" fill="white"/>
    </svg>
  );
}

interface OAuthButtonsProps {
  isLoading?: boolean;
}

export function OAuthButtons({ isLoading: externalLoading }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'zalo' | null>(null);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  
  const handleGoogleLogin = () => {
    setLoadingProvider('google');
    // Redirect to backend OAuth initiation endpoint
    window.location.href = `${apiUrl}/auth/google`;
  };
  
  const handleZaloLogin = () => {
    setLoadingProvider('zalo');
    // Redirect to backend OAuth initiation endpoint
    window.location.href = `${apiUrl}/auth/zalo`;
  };
  
  const isLoading = externalLoading || loadingProvider !== null;

  return (
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Button
          type="button"
          variant="outline"
          className="w-full"
          size="lg"
          disabled={isLoading}
          onClick={handleGoogleLogin}
        >
          {loadingProvider === 'google' ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-5 w-5" />
          )}
          Continue with Google
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          type="button"
          variant="outline"
          className="w-full bg-[#0068FF]/5 hover:bg-[#0068FF]/10 border-[#0068FF]/20"
          size="lg"
          disabled={isLoading}
          onClick={handleZaloLogin}
        >
          {loadingProvider === 'zalo' ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <ZaloIcon className="mr-2 h-5 w-5" />
          )}
          Continue with Zalo
        </Button>
      </motion.div>
    </div>
  );
}

// Separator component for "OR" divider
export function OAuthSeparator() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">
          Or continue with email
        </span>
      </div>
    </div>
  );
}
