import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import Link from 'next/link';

export default function Home() {
  return (
    <PageTransition>
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to <span className="text-primary">Vully</span>
          </h1>
          <p className="text-muted-foreground max-w-md">
            Modern apartment management platform for administrators, technicians, and residents.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
