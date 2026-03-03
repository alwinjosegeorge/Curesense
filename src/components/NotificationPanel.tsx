import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Notification {
  id: string;
  patientId: string;
  patientName: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

const iconMap = {
  critical: <AlertTriangle className="w-4 h-4 text-destructive" />,
  warning: <AlertTriangle className="w-4 h-4 text-risk-moderate" />,
  info: <Info className="w-4 h-4 text-medical-blue" />,
};

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new alerts
    const channel = supabase
      .channel('public:alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, payload => {
        fetchNotifications(); // Refresh on new alert
        toast.info('New alert received');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          patients (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const transformed: Notification[] = (data || []).map(n => ({
        id: n.id,
        patientId: n.patient_id,
        patientName: (n.patients as any)?.name || 'Unknown Patient',
        type: n.type as any,
        message: n.message,
        timestamp: new Date(n.created_at).toLocaleString(),
        acknowledged: n.acknowledged
      }));

      setNotifications(transformed);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  };

  const unread = notifications.filter(n => !n.acknowledged).length;

  const dismiss = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ acknowledged: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, acknowledged: true } : n));
    } catch (e) {
      toast.error('Failed to dismiss notification');
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-12 w-80 bg-card border border-border rounded-xl shadow-elevated z-50 overflow-hidden"
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h4 className="text-sm font-semibold text-card-foreground">Notifications</h4>
                <span className="text-xs text-muted-foreground">{unread} unread</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-3 flex items-start gap-3 ${!n.acknowledged ? 'bg-muted/30' : ''}`}>
                      <div className="mt-0.5">{iconMap[n.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-card-foreground">{n.patientName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{n.timestamp}</p>
                      </div>
                      {!n.acknowledged && (
                        <button onClick={() => dismiss(n.id)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
