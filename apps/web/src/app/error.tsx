'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
            >
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </motion.div>
            <CardTitle className="text-2xl font-bold">Something went wrong</CardTitle>
            <CardDescription>
              An unexpected error occurred. Our team has been notified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && (
              <div className="rounded-md bg-destructive/5 p-3 text-sm text-destructive">
                <p className="font-medium mb-1">Error Details:</p>
                <code className="block text-xs whitespace-pre-wrap break-words">
                  {error.message}
                </code>
              </div>
            )}
            {error.digest && (
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Error ID: <code className="font-mono">{error.digest}</code>
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={reset} className="flex-1" variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
