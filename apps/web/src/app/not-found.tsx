'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0e320d] via-background to-[#0b3b24] px-4">
      {/* Changed: Added flex-col for mobile, lg:flex-row for desktop, and removed global text-center */}
      <div className="flex flex-col lg:flex-row items-center overflow-hidden gap-12 w-full max-w-4xl bg-white rounded-xl">
        
        {/* Left Side: Image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} // Changed y to x for a slide-in effect
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="relative aspect-square w-full">
            <Image
              src="https://res.cloudinary.com/dlavqnrlx/image/upload/v1775975266/gtath8x81vdm4btteuhr.png"
              alt="Page not found"
              fill
              className="object-cover"
              priority
            />
          </div>
        </motion.div>

        {/* Right Side: Content */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <h1 className="text-6xl md:text-8xl font-bold text-primary">404</h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-muted-foreground">
              Page Not Found
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-md">
              Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <Button asChild size="lg" className="gap-2">
                <Link href="/dashboard">
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </Link>
              </Button>
              {/* <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href="javascript:history.back()">
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </Link>
              </Button> */}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-12"
          >
            <p className="text-sm text-muted-foreground">
              Need help?{' '}
              <Link href="/dashboard" className="text-primary hover:underline">
                Contact support
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

