import React, { ReactNode } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';
import NotificationPanel from '@/components/NotificationPanel';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-display font-semibold text-card-foreground capitalize">
              {user?.role} Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationPanel />
            <div className="w-8 h-8 rounded-full gradient-medical flex items-center justify-center text-primary-foreground text-sm font-bold">
              {user?.name.charAt(0)}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
