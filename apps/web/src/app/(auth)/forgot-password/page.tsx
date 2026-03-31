'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, Mail, CheckCircle, Loader2 } from 'lucide-react';

import { useForgotPassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const forgotPassword = useForgotPassword();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await forgotPassword.mutateAsync(values.email);
      setIsSubmitted(true);
    } catch (error) {
      // Even on error, show success message to prevent email enumeration
      setIsSubmitted(true);
    }
  }

  return (
    <div className="container relative flex min-h-screen flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]"
      >
        {/* Logo */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <Building2 className="h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold">Vully</h1>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {isSubmitted ? 'Check your email' : 'Forgot password'}
            </CardTitle>
            <CardDescription className="text-center">
              {isSubmitted
                ? 'We sent a password reset link to your email'
                : 'Enter your email and we\'ll send you a reset link'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center space-y-4 py-4"
              >
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    If an account exists for{' '}
                    <span className="font-medium text-foreground">
                      {form.getValues('email')}
                    </span>
                    , you will receive a password reset link shortly.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The link will expire in 1 hour.
                  </p>
                </div>
                <Button asChild variant="outline" className="mt-4">
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="name@example.com"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={forgotPassword.isPending}
                  >
                    {forgotPassword.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send Reset Link
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
          {!isSubmitted && (
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                Remember your password?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Back to Login
                </Link>
              </div>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
