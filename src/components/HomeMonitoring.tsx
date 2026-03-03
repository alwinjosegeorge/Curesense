import React, { useState, useEffect } from 'react';
import { Thermometer, Heart, Droplets, AlertTriangle, CheckCircle, TrendingUp, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface VitalEntry {
  id: string;
  date: string;
  temperature: number;
  bpSys: number;
  bpDia: number;
  sugar: number;
  status: 'normal' | 'warning' | 'critical';
}

function analyzeVitals(temp: number, bpSys: number, bpDia: number, sugar: number): { status: 'normal' | 'warning' | 'critical'; alerts: string[] } {
  const alerts: string[] = [];
  let status: 'normal' | 'warning' | 'critical' = 'normal';

  if (temp > 101) { alerts.push('High fever detected'); status = 'critical'; }
  else if (temp > 99.5) { alerts.push('Mild fever'); status = 'warning'; }

  if (bpSys > 140 || bpDia > 90) { alerts.push('High blood pressure'); status = status === 'critical' ? 'critical' : 'warning'; }
  if (bpSys > 160 || bpDia > 100) { alerts.push('Dangerously high BP — consult doctor immediately'); status = 'critical'; }

  if (sugar > 200) { alerts.push('Blood sugar critically high'); status = 'critical'; }
  else if (sugar > 140) { alerts.push('Elevated blood sugar'); status = status === 'critical' ? 'critical' : 'warning'; }
  else if (sugar < 70) { alerts.push('Low blood sugar — eat something'); status = 'warning'; }

  return { status, alerts };
}

const statusConfig = {
  normal: { icon: <CheckCircle className="w-5 h-5" />, bg: 'bg-risk-stable-bg', text: 'text-risk-stable', label: 'All Normal' },
  warning: { icon: <TrendingUp className="w-5 h-5" />, bg: 'bg-risk-moderate-bg', text: 'text-risk-moderate', label: 'Needs Attention' },
  critical: { icon: <AlertTriangle className="w-5 h-5" />, bg: 'bg-risk-critical-bg', text: 'text-risk-critical', label: 'Alert Sent' },
};

export default function HomeMonitoring() {
  const [patientId, setPatientId] = useState<string | null>(null);
  const [form, setForm] = useState({ temperature: '', bpSys: '', bpDia: '', sugar: '' });
  const [entries, setEntries] = useState<VitalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<ReturnType<typeof analyzeVitals> | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Get first patient for demo
      const { data: pData } = await supabase.from('patients').select('id').limit(1).single();
      if (pData) {
        setPatientId(pData.id);
        const { data: vData, error } = await supabase
          .from('vitals')
          .select('*')
          .eq('patient_id', pData.id)
          .order('recorded_at', { ascending: false });

        if (error) throw error;

        const transformed: VitalEntry[] = (vData || []).map(v => {
          const analysis = analyzeVitals(
            v.temperature || 98.6,
            v.bp_systolic || 120,
            v.bp_diastolic || 80,
            v.sugar || 100
          );
          return {
            id: v.id,
            date: new Date(v.recorded_at).toLocaleString(),
            temperature: v.temperature || 0,
            bpSys: v.bp_systolic || 0,
            bpDia: v.bp_diastolic || 0,
            sugar: v.sugar || 0,
            status: analysis.status
          };
        });
        setEntries(transformed);
      }
    } catch (e) {
      console.error('Error fetching history:', e);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    setSubmitting(true);
    const temp = parseFloat(form.temperature);
    const bpSys = parseInt(form.bpSys);
    const bpDia = parseInt(form.bpDia);
    const sugar = parseInt(form.sugar);

    const analysis = analyzeVitals(temp, bpSys, bpDia, sugar);
    setLastAnalysis(analysis);

    try {
      const { error } = await supabase
        .from('vitals')
        .insert({
          patient_id: patientId,
          temperature: temp,
          bp_systolic: bpSys,
          bp_diastolic: bpDia,
          sugar: sugar,
          oxygen: 98 // Default for home entry
        });

      if (error) throw error;

      if (analysis.status === 'critical') {
        toast.error('Critical values detected! Your doctor has been notified.');
        // Also create an alert in the system
        await supabase.from('alerts').insert({
          patient_id: patientId,
          type: 'critical',
          message: `Home Monitoring Alert: Temp ${temp}°F, BP ${bpSys}/${bpDia}, Sugar ${sugar}`
        });
      } else if (analysis.status === 'warning') {
        toast.warning('Some values need attention. Monitor closely.');
      } else {
        toast.success('Vitals recorded. All values are normal.');
      }

      setForm({ temperature: '', bpSys: '', bpDia: '', sugar: '' });
      fetchHistory();
    } catch (e) {
      console.error('Error saving vitals:', e);
      toast.error('Failed to save vitals');
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-5 shadow-card">
        <h3 className="font-display font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-accent" /> Home Vitals Entry
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="flex items-center gap-1.5 text-xs"><Thermometer className="w-3.5 h-3.5" />Temp (°F)</Label>
              <Input type="number" step="0.1" value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} placeholder="98.6" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs">BP Systolic</Label>
              <Input type="number" value={form.bpSys} onChange={e => setForm({ ...form, bpSys: e.target.value })} placeholder="120" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs">BP Diastolic</Label>
              <Input type="number" value={form.bpDia} onChange={e => setForm({ ...form, bpDia: e.target.value })} placeholder="80" className="mt-1" required />
            </div>
            <div>
              <Label className="flex items-center gap-1.5 text-xs"><Droplets className="w-3.5 h-3.5" />Sugar</Label>
              <Input type="number" value={form.sugar} onChange={e => setForm({ ...form, sugar: e.target.value })} placeholder="100" className="mt-1" required />
            </div>
          </div>
          <Button type="submit" disabled={submitting} className="gradient-medical text-primary-foreground hover:opacity-90">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Vitals
          </Button>
        </form>
      </div>

      <AnimatePresence>
        {lastAnalysis && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-xl border p-5 ${statusConfig[lastAnalysis.status].bg}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={statusConfig[lastAnalysis.status].text}>{statusConfig[lastAnalysis.status].icon}</div>
              <h4 className={`font-display font-semibold ${statusConfig[lastAnalysis.status].text}`}>
                {statusConfig[lastAnalysis.status].label}
              </h4>
            </div>
            {lastAnalysis.alerts.length > 0 && (
              <ul className="space-y-1.5">
                {lastAnalysis.alerts.map((alert, i) => (
                  <li key={i} className="text-sm text-foreground flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[lastAnalysis.status].text === 'text-risk-critical' ? 'bg-destructive' : 'bg-risk-moderate'}`} />
                    {alert}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-card-foreground">Recent Entries</h3>
        </div>
        <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-medical-blue" /></div>
          ) : entries.map(entry => {
            const cfg = statusConfig[entry.status];
            return (
              <div key={entry.id} className="p-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center ${cfg.text}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-card-foreground">
                    Temp: {entry.temperature}°F · BP: {entry.bpSys}/{entry.bpDia} · Sugar: {entry.sugar}
                  </div>
                  <div className="text-xs text-muted-foreground">{entry.date}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
          {!loading && entries.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">No entries found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
