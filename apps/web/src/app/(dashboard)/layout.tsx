'use client';

import { motion } from 'framer-motion';
import {
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserProfileDropdown } from '@/components/user-profile-dropdown';
import { ProtectedRoute } from '@/components/protected-route';
import { FloatingChatWidget } from '@/components/floating-chat-widget';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useState } from 'react';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between
     lg:px-6 px-4
     ">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserProfileDropdown />
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar
          isMobileOpen={mobileSidebarOpen}
          isCollapsed={sidebarCollapsed}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuClick={() => setMobileSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
      <FloatingChatWidget />
    </ProtectedRoute>
  );
}
