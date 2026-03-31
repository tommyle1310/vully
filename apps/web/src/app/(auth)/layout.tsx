import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Vully',
  description: 'Sign in to your Vully account',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
