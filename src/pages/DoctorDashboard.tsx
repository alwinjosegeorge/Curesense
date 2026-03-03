import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import VitalsChart from '@/components/VitalsChart';
import RiskPanel from '@/components/RiskPanel';
import AlertPanel from '@/components/AlertPanel';
import CaseSummary from '@/components/CaseSummary';
import VoiceInput from '@/components/VoiceInput';
import AppointmentBooking from '@/components/AppointmentBooking';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, AlertTriangle, Activity, Brain, FileText, FlaskConical, Pill, Stethoscope,
  Loader2, Plus, X, Eye, Clock, BarChart2, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';
import PDFGenerator from '@/components/PDFGenerator';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient, Alert } from '@/data/mockData';

const statusColor: Record<string, string> = {
  'Admitted': 'bg-blue-100 text-blue-700',
  'Under Observation': 'bg-amber-100 text-amber-700',
  'Discharged': 'bg-green-100 text-green-700',
  'Critical': 'bg-red-100 text-red-700',
};

// ─── Medication Timing Graph ─────────────────────────────────────────────────
function MedicationGraph({ prescriptions }: { prescriptions: any[] }) {
  const freqToHours: Record<string, number[]> = {
    'Once daily': [8],
    'Once daily at bedtime': [22],
    'Once daily at night': [22],
    'Once daily before breakfast': [7],
    'Twice daily': [8, 20],
    'Three times daily': [8, 14, 20],
    'Every 6 hours': [0, 6, 12, 18],
    'Every 8 hours': [0, 8, 16],
    'Every 12 hours': [0, 12],
    'At onset of migraine': [12],
  };

  const active = prescriptions.filter(rx => rx.status === 'Active');
  if (active.length === 0) return <p className="text-sm text-muted-foreground">No active medications.</p>;

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const colors = ['bg-blue-400', 'bg-purple-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400', 'bg-cyan-400'];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 pl-36">
        {hours.map(h => (
          <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground">
            {h % 4 === 0 ? `${h}h` : ''}
          </div>
        ))}
      </div>
      {active.map((rx, i) => {
        const key = Object.keys(freqToHours).find(k => rx.frequency?.includes(k.split(' ')[0]) || rx.frequency === k) || '';
        const timings = freqToHours[key] || freqToHours[rx.frequency] || [];
        const colorClass = colors[i % colors.length];
        return (
          <div key={rx.id} className="flex items-center gap-2">
            <div className="w-36 text-xs font-medium text-foreground truncate">{rx.medicine}</div>
            <div className="flex flex-1 gap-1 relative">
              {hours.map(h => (
                <div key={h} className={`flex-1 h-5 rounded-sm ${timings.includes(h) ? colorClass + ' opacity-90' : 'bg-muted/30'}`} />
              ))}
            </div>
            <div className="w-16 text-[10px] text-muted-foreground text-right">{rx.dosage}</div>
          </div>
        );
      })}
      <div className="flex gap-4 flex-wrap mt-2">
        {active.map((rx, i) => (
          <div key={rx.id} className="flex items-center gap-1.5 text-xs">
            <div className={`w-3 h-3 rounded-sm ${colors[i % colors.length]}`} />
            <span>{rx.medicine} – {rx.frequency}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Lab Report View Modal ───────────────────────────────────────────────────
function LabReportModal({ lab, onClose }: { lab: any; onClose: () => void }) {
  const flagColor = lab.flag === 'Critical' ? 'text-red-600' : lab.flag === 'Abnormal' ? 'text-amber-600' : 'text-green-600';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-card-foreground">{lab.testName}</h3>
            <p className="text-sm text-muted-foreground">Date: {lab.date}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          {lab.value && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Result Value</p>
              <p className="text-base font-semibold text-foreground">{lab.value}</p>
            </div>
          )}
          {lab.normalRange && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Normal Range</p>
              <p className="text-sm text-foreground">{lab.normalRange}</p>
            </div>
          )}
          {lab.result && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Interpretation</p>
              <p className="text-sm text-foreground">{lab.result}</p>
            </div>
          )}
          <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Status / Flag</p>
            <span className={`text-sm font-semibold ${flagColor}`}>{lab.flag || lab.status}</span>
          </div>
        </div>
        <Button onClick={onClose} className="w-full mt-5 gradient-medical text-primary-foreground">Close</Button>
      </motion.div>
    </div>
  );
}

// ─── Add Data Panel ──────────────────────────────────────────────────────────
function AddDataPanel({ patient, onRefresh, onClose }: { patient: Patient; onRefresh: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<'vitals' | 'rx' | 'lab'>('vitals');
  const [submitting, setSubmitting] = useState(false);

  const [vitals, setVitals] = useState({ bp_systolic: '', bp_diastolic: '', sugar: '', temperature: '', oxygen: '', heart_rate: '' });
  const [rx, setRx] = useState({ medicine: '', dosage: '', frequency: '', start_date: new Date().toISOString().slice(0, 10), notes: '' });
  const [lab, setLab] = useState({ test_name: '', value: '', normal_range: '', flag: 'Normal', result: '' });

  const submitVitals = async () => {
    if (!vitals.bp_systolic || !vitals.bp_diastolic) { toast.error('BP is required'); return; }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('vitals').insert({
        patient_id: patient.id,
        bp_systolic: parseInt(vitals.bp_systolic),
        bp_diastolic: parseInt(vitals.bp_diastolic),
        sugar: vitals.sugar ? parseFloat(vitals.sugar) : null,
        temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
        oxygen: vitals.oxygen ? parseFloat(vitals.oxygen) : null,
        heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate) : null,
      });
      if (error) throw error;
      toast.success('Vitals recorded successfully');
      setVitals({ bp_systolic: '', bp_diastolic: '', sugar: '', temperature: '', oxygen: '', heart_rate: '' });
      onRefresh();
    } catch (e: any) { toast.error(e.message || 'Failed to save vitals'); }
    finally { setSubmitting(false); }
  };

  const submitRx = async () => {
    if (!rx.medicine || !rx.dosage || !rx.frequency) { toast.error('Fill all required fields'); return; }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('prescriptions').insert({
        patient_id: patient.id,
        medicine: rx.medicine,
        dosage: rx.dosage,
        frequency: rx.frequency,
        start_date: rx.start_date,
        status: 'Active',
      });
      if (error) throw error;
      toast.success('Prescription added');
      setRx({ medicine: '', dosage: '', frequency: '', start_date: new Date().toISOString().slice(0, 10), notes: '' });
      onRefresh();
    } catch (e: any) { toast.error(e.message || 'Failed to add prescription'); }
    finally { setSubmitting(false); }
  };

  const submitLab = async () => {
    if (!lab.test_name) { toast.error('Test name is required'); return; }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('lab_reports').insert({
        patient_id: patient.id,
        test_name: lab.test_name,
        date: new Date().toISOString().slice(0, 10),
        value: lab.value || null,
        normal_range: lab.normal_range || null,
        flag: lab.flag !== 'Normal' ? lab.flag : null,
        result: lab.result || null,
        status: 'Completed',
      });
      if (error) throw error;
      toast.success('Lab report added');
      setLab({ test_name: '', value: '', normal_range: '', flag: 'Normal', result: '' });
      onRefresh();
    } catch (e: any) { toast.error(e.message || 'Failed to add lab report'); }
    finally { setSubmitting(false); }
  };

  const inputClass = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";
  const selectClass = inputClass;

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="w-full max-w-md h-full bg-card shadow-2xl overflow-y-auto flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div>
            <h3 className="text-lg font-bold text-card-foreground">Add Patient Data</h3>
            <p className="text-sm text-muted-foreground">{patient.name} · {patient.admissionNo}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-border">
          {[
            { key: 'vitals', label: 'Vitals', icon: <Activity className="w-4 h-4" /> },
            { key: 'rx', label: 'Prescription', icon: <Pill className="w-4 h-4" /> },
            { key: 'lab', label: 'Lab Report', icon: <FlaskConical className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${tab === t.key ? 'border-b-2 border-accent text-accent' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 flex-1">
          {tab === 'vitals' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>BP Systolic (mmHg) *</Label>
                  <input className={inputClass} type="number" placeholder="120" value={vitals.bp_systolic} onChange={e => setVitals(v => ({ ...v, bp_systolic: e.target.value }))} />
                </div>
                <div>
                  <Label>BP Diastolic (mmHg) *</Label>
                  <input className={inputClass} type="number" placeholder="80" value={vitals.bp_diastolic} onChange={e => setVitals(v => ({ ...v, bp_diastolic: e.target.value }))} />
                </div>
                <div>
                  <Label>Blood Sugar (mg/dL)</Label>
                  <input className={inputClass} type="number" placeholder="100" value={vitals.sugar} onChange={e => setVitals(v => ({ ...v, sugar: e.target.value }))} />
                </div>
                <div>
                  <Label>Temperature (°F)</Label>
                  <input className={inputClass} type="number" step="0.1" placeholder="98.6" value={vitals.temperature} onChange={e => setVitals(v => ({ ...v, temperature: e.target.value }))} />
                </div>
                <div>
                  <Label>Oxygen Saturation (%)</Label>
                  <input className={inputClass} type="number" placeholder="98" value={vitals.oxygen} onChange={e => setVitals(v => ({ ...v, oxygen: e.target.value }))} />
                </div>
                <div>
                  <Label>Heart Rate (bpm)</Label>
                  <input className={inputClass} type="number" placeholder="72" value={vitals.heart_rate} onChange={e => setVitals(v => ({ ...v, heart_rate: e.target.value }))} />
                </div>
              </div>
              <Button onClick={submitVitals} disabled={submitting} className="w-full gradient-medical text-primary-foreground">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Record Vitals
              </Button>
            </>
          )}

          {tab === 'rx' && (
            <>
              <div>
                <Label>Medicine Name *</Label>
                <input className={inputClass} placeholder="e.g. Amoxicillin" value={rx.medicine} onChange={e => setRx(v => ({ ...v, medicine: e.target.value }))} />
              </div>
              <div>
                <Label>Dosage *</Label>
                <input className={inputClass} placeholder="e.g. 500mg" value={rx.dosage} onChange={e => setRx(v => ({ ...v, dosage: e.target.value }))} />
              </div>
              <div>
                <Label>Frequency *</Label>
                <select className={selectClass} value={rx.frequency} onChange={e => setRx(v => ({ ...v, frequency: e.target.value }))}>
                  <option value="">Select frequency</option>
                  <option>Once daily</option>
                  <option>Twice daily</option>
                  <option>Three times daily</option>
                  <option>Every 6 hours</option>
                  <option>Every 8 hours</option>
                  <option>Every 12 hours</option>
                  <option>Once daily at bedtime</option>
                  <option>Once daily before breakfast</option>
                  <option>At onset of symptom (SOS)</option>
                  <option>IV Continuous</option>
                </select>
              </div>
              <div>
                <Label>Start Date</Label>
                <input className={inputClass} type="date" value={rx.start_date} onChange={e => setRx(v => ({ ...v, start_date: e.target.value }))} />
              </div>
              <Button onClick={submitRx} disabled={submitting} className="w-full gradient-medical text-primary-foreground">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Prescription
              </Button>
            </>
          )}

          {tab === 'lab' && (
            <>
              <div>
                <Label>Test Name *</Label>
                <input className={inputClass} placeholder="e.g. Complete Blood Count" value={lab.test_name} onChange={e => setLab(v => ({ ...v, test_name: e.target.value }))} />
              </div>
              <div>
                <Label>Result Value</Label>
                <input className={inputClass} placeholder="e.g. 14.2 g/dL" value={lab.value} onChange={e => setLab(v => ({ ...v, value: e.target.value }))} />
              </div>
              <div>
                <Label>Normal Range</Label>
                <input className={inputClass} placeholder="e.g. 12–16 g/dL" value={lab.normal_range} onChange={e => setLab(v => ({ ...v, normal_range: e.target.value }))} />
              </div>
              <div>
                <Label>Flag</Label>
                <select className={selectClass} value={lab.flag} onChange={e => setLab(v => ({ ...v, flag: e.target.value }))}>
                  <option>Normal</option>
                  <option>Abnormal</option>
                  <option>Critical</option>
                </select>
              </div>
              <div>
                <Label>Interpretation / Notes</Label>
                <textarea className={inputClass + ' h-20 resize-none'} placeholder="Optional interpretation or radiologist notes..." value={lab.result} onChange={e => setLab(v => ({ ...v, result: e.target.value }))} />
              </div>
              <Button onClick={submitLab} disabled={submitting} className="w-full gradient-medical text-primary-foreground">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Lab Report
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Doctor Dashboard ───────────────────────────────────────────────────
function DoctorMain() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [caseNotes, setCaseNotes] = useState('');
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [showAddData, setShowAddData] = useState(false);
  const [viewingLab, setViewingLab] = useState<any | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get the doctor record for the currently logged-in user
      let query = (supabase as any)
        .from('patients')
        .select(`
          *,
          vitals (*),
          prescriptions (*),
          lab_reports (*),
          doctors!assigned_doctor_id (name, id, user_id)
        `);

      // If real user, filter to their patients
      if (user?.role === 'doctor' && user?.id) {
        // Try matching by doctor's supabase user_id
        const { data: doctorRow } = await (supabase as any)
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (doctorRow) {
          query = query.eq('assigned_doctor_id', doctorRow.id);
        }
      }

      const { data: patientsData, error: patientsError } = await query.order('admission_date', { ascending: false });
      if (patientsError) throw patientsError;

      const transformed: Patient[] = (patientsData || []).map((p: any) => ({
        id: p.id,
        admissionNo: p.admission_no,
        tokenNo: p.token_no,
        name: p.name,
        age: p.age,
        gender: p.gender,
        contact: p.contact || '',
        assignedDoctor: p.doctors?.name || 'Unassigned',
        admissionDate: p.admission_date,
        status: p.status,
        symptoms: p.symptoms || [],
        diagnosis: p.diagnosis,
        vitals: (p.vitals || []).sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()).map((v: any) => ({
          timestamp: v.recorded_at,
          bp: { systolic: v.bp_systolic, diastolic: v.bp_diastolic },
          sugar: v.sugar,
          temperature: v.temperature,
          oxygen: v.oxygen,
          heartRate: v.heart_rate,
        })),
        prescriptions: (p.prescriptions || []).map((rx: any) => ({
          id: rx.id,
          medicine: rx.medicine,
          dosage: rx.dosage,
          frequency: rx.frequency,
          startDate: rx.start_date,
          endDate: rx.end_date,
          status: rx.status,
        })),
        labReports: (p.lab_reports || []).map((lab: any) => ({
          id: lab.id,
          testName: lab.test_name,
          date: lab.date,
          status: lab.status,
          result: lab.result,
          normalRange: lab.normal_range,
          value: lab.value,
          flag: lab.flag,
        })),
        riskScores: { treatmentFailure: 35, diseaseProgression: 55, drugSideEffect: 20, readmission: 40 },
      }));

      setPatients(transformed);
      if (transformed.length > 0 && !selectedPatient) setSelectedPatient(transformed[0]);

      // Alerts
      const { data: alertsData } = await (supabase as any)
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      const transformedAlerts: Alert[] = (alertsData || []).map((a: any) => ({
        id: a.id,
        patientId: a.patient_id,
        patientName: transformed.find(p => p.id === a.patient_id)?.name || 'Unknown',
        type: a.type,
        message: a.message,
        timestamp: a.created_at,
        acknowledged: a.acknowledged,
      }));
      setAlerts(transformedAlerts);
    } catch (e) {
      console.error('Error fetching data:', e);
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (id: string) => {
    try {
      await (supabase as any).from('alerts').update({ acknowledged: true }).eq('id', id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
      toast.success('Alert acknowledged');
    } catch { toast.error('Failed to acknowledge alert'); }
  };

  const runAiAnalysis = async () => {
    if (!selectedPatient) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-treatment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'risk_analysis',
          patientData: {
            name: selectedPatient.name,
            age: selectedPatient.age,
            gender: selectedPatient.gender,
            symptoms: selectedPatient.symptoms,
            diagnosis: selectedPatient.diagnosis,
            vitals: selectedPatient.vitals[selectedPatient.vitals.length - 1],
            prescriptions: selectedPatient.prescriptions.filter(rx => rx.status === 'Active'),
            labReports: selectedPatient.labReports,
            riskScores: selectedPatient.riskScores,
          },
        }),
      });
      const data = await response.json();
      if (data.error) toast.error(data.error);
      else { setAiResult(data.result); toast.success('AI analysis complete'); }
    } catch { toast.error('Failed to run AI analysis'); }
    finally { setAiLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <span className="ml-3 text-lg font-medium text-muted-foreground">Loading your patients...</span>
    </div>
  );

  const criticalCount = patients.filter(p => p.status === 'Critical').length;
  const activeAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Patients', value: patients.length, icon: <Users className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600' },
          { label: 'Critical', value: criticalCount, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-100 text-red-600' },
          { label: 'Active Alerts', value: activeAlerts.length, icon: <Activity className="w-5 h-5" />, color: 'bg-amber-100 text-amber-600' },
          { label: 'Appointments', value: '7', icon: <Clock className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-600' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
            <div className="text-2xl font-bold text-card-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h3 className="text-base font-semibold text-card-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Active Alerts
          </h3>
          <AlertPanel alerts={activeAlerts} onDismiss={acknowledgeAlert} />
        </div>
      )}

      {/* Main Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-card-foreground">My Patients ({patients.length})</h3>
          </div>
          <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {patients.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">No patients assigned to you.</div>
            )}
            {patients.map(patient => (
              <button key={patient.id} onClick={() => { setSelectedPatient(patient); setAiResult(null); }}
                className={`w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center gap-3 ${selectedPatient?.id === patient.id ? 'bg-muted/70 border-l-2 border-accent' : ''}`}>
                <div className="w-10 h-10 rounded-full gradient-medical flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {patient.name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-card-foreground truncate">{patient.name}</div>
                  <div className="text-xs text-muted-foreground">{patient.admissionNo} · {patient.age}y · {patient.gender}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusColor[patient.status] || 'bg-muted text-muted-foreground'}`}>
                  {patient.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Patient Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selectedPatient ? (
            <div className="bg-card rounded-xl border border-border shadow-card">
              {/* Header */}
              <div className="p-5 border-b border-border flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-card-foreground">{selectedPatient.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedPatient.admissionNo} · Token: {selectedPatient.tokenNo} · Admitted: {selectedPatient.admissionDate}
                  </p>
                  <p className="text-sm text-muted-foreground">Symptoms: {selectedPatient.symptoms.join(', ')}</p>
                  {selectedPatient.diagnosis && (
                    <p className="text-sm font-semibold text-accent mt-1">Dx: {selectedPatient.diagnosis}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${statusColor[selectedPatient.status]}`}>
                    {selectedPatient.status}
                  </span>
                  <Button size="sm" onClick={() => setShowAddData(true)} className="gradient-medical text-primary-foreground text-xs gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Data
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="p-5">
                <Tabs defaultValue="vitals">
                  <TabsList className="bg-muted flex-wrap h-auto gap-1">
                    <TabsTrigger value="vitals" className="text-xs"><Activity className="w-3.5 h-3.5 mr-1" />Vitals</TabsTrigger>
                    <TabsTrigger value="meds" className="text-xs"><BarChart2 className="w-3.5 h-3.5 mr-1" />Med Schedule</TabsTrigger>
                    <TabsTrigger value="prescriptions" className="text-xs"><Pill className="w-3.5 h-3.5 mr-1" />Rx</TabsTrigger>
                    <TabsTrigger value="labs" className="text-xs"><FlaskConical className="w-3.5 h-3.5 mr-1" />Labs</TabsTrigger>
                    <TabsTrigger value="ai" className="text-xs"><Brain className="w-3.5 h-3.5 mr-1" />AI Risk</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" />Notes</TabsTrigger>
                    <TabsTrigger value="summary" className="text-xs"><Stethoscope className="w-3.5 h-3.5 mr-1" />Summary</TabsTrigger>
                  </TabsList>

                  {/* Vitals */}
                  <TabsContent value="vitals" className="mt-4">
                    {selectedPatient.vitals.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">No vitals recorded yet. Click "Add Data" to record.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <VitalsChart vitals={selectedPatient.vitals} type="bp" />
                        <VitalsChart vitals={selectedPatient.vitals} type="oxygen" />
                        <VitalsChart vitals={selectedPatient.vitals} type="sugar" />
                        <VitalsChart vitals={selectedPatient.vitals} type="heartRate" />
                      </div>
                    )}
                  </TabsContent>

                  {/* Medication Schedule */}
                  <TabsContent value="meds" className="mt-4">
                    <div className="p-4 bg-muted/30 rounded-xl">
                      <h4 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-accent" /> 24-Hour Medication Schedule
                      </h4>
                      <MedicationGraph prescriptions={selectedPatient.prescriptions} />
                    </div>
                  </TabsContent>

                  {/* Prescriptions */}
                  <TabsContent value="prescriptions" className="mt-4">
                    <div className="space-y-2">
                      {selectedPatient.prescriptions.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">No prescriptions. Click "Add Data" → Prescription.</div>
                      )}
                      {selectedPatient.prescriptions.map(rx => (
                        <div key={rx.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                          <div>
                            <div className="font-medium text-sm text-foreground">{rx.medicine}</div>
                            <div className="text-xs text-muted-foreground">{rx.dosage} · {rx.frequency}</div>
                            {rx.startDate && <div className="text-xs text-muted-foreground">Started: {rx.startDate}</div>}
                          </div>
                          <Badge variant={rx.status === 'Active' ? 'default' : 'secondary'} className="text-xs">{rx.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Labs */}
                  <TabsContent value="labs" className="mt-4">
                    <div className="space-y-2">
                      {selectedPatient.labReports.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">No lab results. Click "Add Data" → Lab Report.</div>
                      )}
                      {selectedPatient.labReports.map(lab => (
                        <div key={lab.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-foreground">{lab.testName}</div>
                            <div className="text-xs text-muted-foreground">{lab.date}{lab.value && ` · ${lab.value}`}{lab.normalRange && ` (Normal: ${lab.normalRange})`}</div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${lab.flag === 'Critical' ? 'bg-red-100 text-red-600' : lab.flag === 'Abnormal' ? 'bg-amber-100 text-amber-600' : lab.status === 'Pending' ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-600'}`}>
                              {lab.flag || lab.status}
                            </span>
                            <button onClick={() => setViewingLab(lab)}
                              className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium border border-accent/30 rounded px-2 py-1 hover:bg-accent/5 transition-colors">
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* AI Risk */}
                  <TabsContent value="ai" className="mt-4">
                    <RiskPanel scores={selectedPatient.riskScores} />
                    <div className="mt-4">
                      <Button onClick={runAiAnalysis} disabled={aiLoading} className="gradient-medical text-primary-foreground hover:opacity-90">
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
                        {aiLoading ? 'Analyzing Patient Data...' : 'Run AI Risk Analysis'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">Analyzes vitals, prescriptions, and lab results to generate risk recommendations.</p>
                    </div>
                    {aiResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-blue-700 flex items-center gap-2">
                            <Brain className="w-4 h-4" /> AI Analysis Result
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600 border-green-300">Analysis Complete</Badge>
                            <PDFGenerator patientName={selectedPatient.name} type="Case Summary" data={selectedPatient} />
                          </div>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiResult}</p>
                      </motion.div>
                    )}
                  </TabsContent>

                  {/* Notes */}
                  <TabsContent value="notes" className="mt-4 space-y-4">
                    <VoiceInput value={caseNotes} onChange={setCaseNotes} placeholder="Dictate or type case notes..." label="Case Notes (Voice-to-Text Enabled)" rows={4} />
                    <VoiceInput value={diagnosisNotes} onChange={setDiagnosisNotes} placeholder="Dictate or type diagnosis..." label="Diagnosis Notes" rows={3} />
                    <Button onClick={() => toast.success('Notes saved')} className="gradient-medical text-primary-foreground hover:opacity-90">Save Notes</Button>
                  </TabsContent>

                  {/* Summary */}
                  <TabsContent value="summary" className="mt-4">
                    <CaseSummary patient={selectedPatient} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-12 shadow-card flex flex-col items-center justify-center">
              <Stethoscope className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-card-foreground">Select a patient</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-xs">Click a patient from the list on the left to view their records and manage their care.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Data Slide-in Panel */}
      <AnimatePresence>
        {showAddData && selectedPatient && (
          <AddDataPanel patient={selectedPatient} onRefresh={() => { fetchData(); setShowAddData(false); }} onClose={() => setShowAddData(false)} />
        )}
      </AnimatePresence>

      {/* Lab Report Modal */}
      {viewingLab && <LabReportModal lab={viewingLab} onClose={() => setViewingLab(null)} />}
    </div>
  );
}

function DoctorAppointments() {
  return <AppointmentBooking role="doctor" />;
}

export default function DoctorDashboard() {
  const location = useLocation();
  if (location.pathname === '/doctor/appointments') return <DashboardLayout><DoctorAppointments /></DashboardLayout>;
  return <DashboardLayout><DoctorMain /></DashboardLayout>;
}
