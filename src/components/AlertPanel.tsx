import React from 'react';
import { Alert } from '@/data/mockData';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const alertStyles = {
  critical: { icon: <AlertTriangle className="w-5 h-5" />, bg: 'bg-risk-critical-bg', border: 'border-risk-critical/30', text: 'text-risk-critical', badge: 'bg-risk-critical' },
  warning: { icon: <AlertCircle className="w-5 h-5" />, bg: 'bg-risk-moderate-bg', border: 'border-risk-moderate/30', text: 'text-risk-moderate', badge: 'bg-risk-moderate' },
  info: { icon: <Info className="w-5 h-5" />, bg: 'bg-medical-blue-light', border: 'border-medical-blue/20', text: 'text-medical-blue', badge: 'bg-medical-blue' },
};

export default function AlertPanel({ alerts, onDismiss }: { alerts: Alert[]; onDismiss?: (id: string) => void }) {
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {alerts.map((alert) => {
          const style = alertStyles[alert.type];
          return (
            <motion.div key={alert.id}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 100 }}
              className={`flex items-start gap-3 p-4 rounded-xl ${style.bg} border ${style.border} ${alert.type === 'critical' ? 'animate-pulse-risk' : ''}`}>
              <div className={style.text}>{style.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-accent-foreground ${style.badge}`}>
                    {alert.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">{alert.patientName}</span>
                </div>
                <p className="text-sm text-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
              </div>
              {onDismiss && (
                <button onClick={() => onDismiss(alert.id)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
