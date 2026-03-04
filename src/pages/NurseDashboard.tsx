import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';
import {
  Users, Activity, ClipboardList, Thermometer, Heart, Droplets, Wind,
  Loader2, Search, ChevronDown, ChevronUp, FileText, AlertTriangle, CheckCircle2, Pill
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const statusColor: Record<string, string> = {
  'Admitted': 'bg-blue-100 text-blue-700',
  'Critical': 'bg-red-100 text-red-700',
  'Stable': 'bg-green-100 text-green-700',
  'Under Observation': 'bg-amber-100 text-amber-700',
  'Discharged': 'bg-gray-100 text-gray-600',
};

function NurseMain() {
  const { user } = useAuth();
  const nurseUser = user as any;

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittingVitals, setSubmittingVitals] = useState(false);
  const [submittingObs, setSubmittingObs] = useState(false);
  const [vitals, setVitals] = useState({ temperature: '', bp_sys: '', bp_dia: '', sugar: '', oxygen: '', heartRate: '' });
  const [observation, setObservation] = useState('');
  const [todayObs, setTodayObs] = useState(0);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('patients')
        .select(`*, doctors!assigned_doctor_id(id, name), vitals(*), prescriptions(*), lab_reports(*)`)
        .order('name');

      // Scope to nurse's assigned doctor
      if (nurseUser?.assignedDoctorId) {
        query = query.eq('assigned_doctor_id', nurseUser.assignedDoctorId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setPatients(data || []);
      if (data && data.length > 0) setSelectedPatient(data[0]);

      // Today's observations by this nurse
      const today = new Date().toISOString().split('T')[0];
      const { count } = await (supabase as any).from('observations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);
      setTodayObs(count || 0);
    } catch (e) {
      console.error('Error fetching patients:', e);
      toast.error('Failed to load patients');
    }
    setLoading(false);
  };

  const handleSubmitVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!vitals.bp_sys || !vitals.bp_dia) { toast.error('BP is required'); return; }

    setSubmittingVitals(true);
    try {
      const { error } = await (supabase as any).from('vitals').insert({
        patient_id: selectedPatient.id,
        temperature: parseFloat(vitals.temperature) || null,
        bp_systolic: parseInt(vitals.bp_sys) || null,
        bp_diastolic: parseInt(vitals.bp_dia) || null,
        sugar: parseFloat(vitals.sugar) || null,
        oxygen: parseFloat(vitals.oxygen) || null,
        heart_rate: parseInt(vitals.heartRate) || null,
      });
      if (error) throw error;
      logAction('Record Vitals', 'Nurse', selectedPatient.id, { by: nurseUser?.name });
      toast.success(`✅ Vitals recorded for ${selectedPatient.name}`);
      setVitals({ temperature: '', bp_sys: '', bp_dia: '', sugar: '', oxygen: '', heartRate: '' });
      fetchPatients();
    } catch (e) {
      toast.error('Failed to save vitals');
    }
    setSubmittingVitals(false);
  };

  const handleSaveObservation = async () => {
    if (!selectedPatient || !observation.trim()) { toast.error('Enter observation notes'); return; }
    setSubmittingObs(true);
    try {
      const { error } = await (supabase as any).from('observations').insert({
        patient_id: selectedPatient.id,
        notes: observation.trim(),
        type: 'Nurse Note',
      });
      if (error) throw error;
      logAction('Record Observation', 'Nurse', selectedPatient.id, { notes: observation.trim() });
      toast.success('Observation saved');
      setObservation('');
      setTodayObs(n => n + 1);
    } catch (e) {
      toast.error('Failed to save observation');
    }
    setSubmittingObs(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
      <span className="ml-3 text-lg font-medium text-muted-foreground">Loading patients...</span>
    </div>
  );

  const filtered = patients.filter(p =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.admission_no || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const criticalCount = patients.filter(p => p.status === 'Critical').length;
  const latestVitals = (p: any) => {
    const vs = p.vitals || [];
    return vs.length > 0 ? vs[vs.length - 1] : null;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="gradient-hero rounded-2xl p-6 text-primary-foreground">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-display font-bold">Welcome, Nurse {nurseUser?.name || 'Nurse'}</h2>
            <p className="opacity-80 mt-1">
              {nurseUser?.assignedDoctorName ? `Assigned to Dr. ${nurseUser.assignedDoctorName}` : 'No doctor assigned'}
              {' · '}Employee ID: {nurseUser?.idNumber}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Doctor's Patients", value: patients.length, icon: <Users className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600' },
          { label: 'Critical Patients', value: criticalCount, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-100 text-red-600' },
          { label: "Today's Observations", value: todayObs, icon: <ClipboardList className="w-5 h-5" />, color: 'bg-teal-100 text-teal-600' },
          { label: 'Stable Patients', value: patients.filter(p => p.status === 'Stable').length, icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-green-100 text-green-600' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
            <div className="text-2xl font-bold text-card-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border space-y-2">
            <h3 className="font-semibold text-card-foreground">Dr. {nurseUser?.assignedDoctorName}'s Patients ({patients.length})</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name or ID..." className="pl-9 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="divide-y divide-border max-h-[65vh] overflow-y-auto">
            {filtered.map(p => {
              const lv = latestVitals(p);
              return (
                <button key={p.id} onClick={() => setSelectedPatient(p)}
                  className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${selectedPatient?.id === p.id ? 'bg-muted/70 border-l-2 border-accent' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full gradient-medical flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {p.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-card-foreground truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.admission_no} · {p.age}y · {p.gender}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusColor[p.status] || 'bg-muted text-muted-foreground'}`}>
                      {p.status}
                    </span>
                  </div>
                  {lv && (
                    <div className="mt-2 flex gap-2 text-xs text-muted-foreground pl-12">
                      <span>BP: {lv.bp_systolic}/{lv.bp_diastolic}</span>
                      {lv.temperature && <span>· T: {lv.temperature}°F</span>}
                      {lv.oxygen && <span>· O₂: {lv.oxygen}%</span>}
                    </div>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No patients found</div>
            )}
          </div>
        </div>

        {/* Patient Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selectedPatient ? (
            <div className="bg-card rounded-xl border border-border shadow-card">
              {/* Header */}
              <div className="p-5 border-b border-border">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xl font-bold text-card-foreground">{selectedPatient.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedPatient.admission_no} · Token: {selectedPatient.token_no} · {selectedPatient.age}y {selectedPatient.gender}
                    </p>
                    <p className="text-sm text-muted-foreground">📞 {selectedPatient.contact}</p>
                    {selectedPatient.diagnosis && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 bg-accent/10 text-accent text-xs font-medium px-2.5 py-1 rounded-full">
                        Dx: {selectedPatient.diagnosis}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${statusColor[selectedPatient.status] || 'bg-muted text-muted-foreground'}`}>
                    {selectedPatient.status}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="p-5">
                <Tabs defaultValue="vitals">
                  <TabsList className="bg-muted flex-wrap h-auto gap-1">
                    <TabsTrigger value="vitals" className="text-xs"><Activity className="w-3.5 h-3.5 mr-1" />Record Vitals</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs"><ClipboardList className="w-3.5 h-3.5 mr-1" />Observations</TabsTrigger>
                    <TabsTrigger value="info" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" />Patient Info</TabsTrigger>
                    <TabsTrigger value="meds" className="text-xs"><Pill className="w-3.5 h-3.5 mr-1" />Medications</TabsTrigger>
                  </TabsList>

                  {/* Vitals Recording */}
                  <TabsContent value="vitals" className="mt-4">
                    <form onSubmit={handleSubmitVitals} className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="flex items-center gap-1.5 text-xs"><Thermometer className="w-3.5 h-3.5" />Temperature (°F)</Label>
                          <Input type="number" step="0.1" value={vitals.temperature} onChange={e => setVitals({ ...vitals, temperature: e.target.value })} className="mt-1" placeholder="98.6" />
                        </div>
                        <div>
                          <Label className="text-xs">BP Systolic *</Label>
                          <Input type="number" value={vitals.bp_sys} onChange={e => setVitals({ ...vitals, bp_sys: e.target.value })} className="mt-1" placeholder="120" />
                        </div>
                        <div>
                          <Label className="text-xs">BP Diastolic *</Label>
                          <Input type="number" value={vitals.bp_dia} onChange={e => setVitals({ ...vitals, bp_dia: e.target.value })} className="mt-1" placeholder="80" />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1.5 text-xs"><Droplets className="w-3.5 h-3.5" />Blood Sugar (mg/dL)</Label>
                          <Input type="number" value={vitals.sugar} onChange={e => setVitals({ ...vitals, sugar: e.target.value })} className="mt-1" placeholder="100" />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1.5 text-xs"><Wind className="w-3.5 h-3.5" />O₂ Saturation (%)</Label>
                          <Input type="number" value={vitals.oxygen} onChange={e => setVitals({ ...vitals, oxygen: e.target.value })} className="mt-1" placeholder="98" />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1.5 text-xs"><Heart className="w-3.5 h-3.5" />Heart Rate (bpm)</Label>
                          <Input type="number" value={vitals.heartRate} onChange={e => setVitals({ ...vitals, heartRate: e.target.value })} className="mt-1" placeholder="72" />
                        </div>
                      </div>
                      <Button type="submit" disabled={submittingVitals} className="gradient-medical text-primary-foreground hover:opacity-90 w-full">
                        {submittingVitals ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Activity className="w-4 h-4 mr-2" />}
                        {submittingVitals ? 'Saving...' : 'Save Vitals'}
                      </Button>
                    </form>

                    {/* Vitals History */}
                    {(selectedPatient.vitals || []).length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Previous Vitals</p>
                        <div className="overflow-x-auto rounded-lg border border-border">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40">
                              <tr>
                                {['Date', 'BP', 'Temp', 'Sugar', 'O₂', 'HR'].map(h => (
                                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {[...(selectedPatient.vitals || [])].reverse().slice(0, 5).map((v: any, i: number) => (
                                <tr key={i} className="hover:bg-muted/20">
                                  <td className="px-3 py-2 text-muted-foreground">{v.recorded_at ? new Date(v.recorded_at).toLocaleDateString() : '—'}</td>
                                  <td className="px-3 py-2 font-medium">{v.bp_systolic || '—'}/{v.bp_diastolic || '—'}</td>
                                  <td className="px-3 py-2">{v.temperature || '—'}</td>
                                  <td className="px-3 py-2">{v.sugar || '—'}</td>
                                  <td className="px-3 py-2">{v.oxygen || '—'}</td>
                                  <td className="px-3 py-2">{v.heart_rate || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Observations */}
                  <TabsContent value="notes" className="mt-4 space-y-3">
                    <textarea
                      value={observation}
                      onChange={e => setObservation(e.target.value)}
                      rows={4}
                      placeholder="Type nurse observation notes (patient behaviour, complaints, medication given, etc.)..."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                    <Button onClick={handleSaveObservation} disabled={submittingObs || !observation.trim()}
                      className="gradient-medical text-primary-foreground w-full">
                      {submittingObs ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                      {submittingObs ? 'Saving...' : 'Save Observation'}
                    </Button>
                  </TabsContent>

                  {/* Patient Full Info */}
                  <TabsContent value="info" className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ['Admission No', selectedPatient.admission_no],
                        ['Token No', selectedPatient.token_no],
                        ['Age', `${selectedPatient.age} years`],
                        ['Gender', selectedPatient.gender],
                        ['Contact', selectedPatient.contact],
                        ['Blood Group', selectedPatient.blood_group || '—'],
                        ['Admission Date', selectedPatient.admission_date || '—'],
                        ['Address', selectedPatient.address ? `${selectedPatient.address}, ${selectedPatient.city || ''} ${selectedPatient.pin_code || ''}` : '—'],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-muted/30 rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">{label}</div>
                          <div className="font-medium mt-0.5 text-foreground">{value}</div>
                        </div>
                      ))}
                    </div>
                    {(selectedPatient.emergency_contact_name) && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">🆘 Emergency Contact</p>
                        <p className="text-sm font-medium">{selectedPatient.emergency_contact_name} ({selectedPatient.emergency_contact_relation})</p>
                        <p className="text-sm text-muted-foreground">{selectedPatient.emergency_contact_phone}</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Medications */}
                  <TabsContent value="meds" className="mt-4 space-y-3">
                    {(selectedPatient.prescriptions || []).filter((rx: any) => rx.status === 'Active').length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active medications.</p>
                    ) : (
                      (selectedPatient.prescriptions || []).filter((rx: any) => rx.status === 'Active').map((rx: any) => (
                        <div key={rx.id} className="p-4 rounded-lg border border-border bg-background flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                            <Pill className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{rx.medicine}</div>
                            <div className="text-xs text-muted-foreground">{rx.dosage} · {rx.frequency}</div>
                            {rx.start_date && <div className="text-xs text-muted-foreground">From: {rx.start_date}</div>}
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Active</span>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-12 shadow-card flex flex-col items-center justify-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-card-foreground">Select a patient</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-xs">Choose a patient from the list to record vitals, observations, and view their details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NurseDashboard() {
  return <DashboardLayout><NurseMain /></DashboardLayout>;
}
