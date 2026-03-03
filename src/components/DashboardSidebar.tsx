import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, FileText, Bell, Calendar, Settings, LogOut,
  Stethoscope, Activity, ClipboardList, UserPlus, FlaskConical, Brain
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navByRole: Record<UserRole, NavItem[]> = {
  doctor: [
    { label: 'Dashboard', path: '/doctor', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Patients', path: '/doctor/patients', icon: <Users className="w-5 h-5" /> },
    { label: 'AI Insights', path: '/doctor/ai', icon: <Brain className="w-5 h-5" /> },
    { label: 'Alerts', path: '/doctor/alerts', icon: <Bell className="w-5 h-5" /> },
    { label: 'Appointments', path: '/doctor/appointments', icon: <Calendar className="w-5 h-5" /> },
  ],
  patient: [
    { label: 'Dashboard', path: '/patient', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Prescriptions', path: '/patient/prescriptions', icon: <FileText className="w-5 h-5" /> },
    { label: 'Lab Reports', path: '/patient/labs', icon: <FlaskConical className="w-5 h-5" /> },
    { label: 'My Vitals', path: '/patient/vitals', icon: <Activity className="w-5 h-5" /> },
    { label: 'Appointments', path: '/patient/appointments', icon: <Calendar className="w-5 h-5" /> },
  ],
  nurse: [
    { label: 'Dashboard', path: '/nurse', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Patients', path: '/nurse/patients', icon: <Users className="w-5 h-5" /> },
    { label: 'Vitals Entry', path: '/nurse/vitals', icon: <Activity className="w-5 h-5" /> },
    { label: 'Observations', path: '/nurse/observations', icon: <ClipboardList className="w-5 h-5" /> },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'New Admission', path: '/admin/admit', icon: <UserPlus className="w-5 h-5" /> },
    { label: 'All Patients', path: '/admin/patients', icon: <Users className="w-5 h-5" /> },
    { label: 'Appointments', path: '/admin/appointments', icon: <Calendar className="w-5 h-5" /> },
    { label: 'Settings', path: '/admin/settings', icon: <Settings className="w-5 h-5" /> },
  ],
};

export default function DashboardSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const items = navByRole[user.role] || [];

  return (
    <aside className="w-64 min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-sidebar-primary" />
          </div>
          <span className="text-lg font-display font-bold text-sidebar-foreground">CureSense</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === `/${user.role}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`
            }>
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary text-sm font-bold">
            {user.name?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-sidebar-foreground truncate">{user.name || 'User'}</div>
            <div className="text-xs text-sidebar-foreground/50 capitalize">{user.role}</div>
          </div>
        </div>
        <button onClick={async () => { navigate('/login', { replace: true }); await logout(); }}
          className="flex items-center gap-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent/50">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
