'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
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
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
        </div>
      </body>
    </html>
  );
}
