import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import VoiceInput from '@/components/VoiceInput';
import { motion } from 'framer-motion';
import { Users, Activity, ClipboardList, Thermometer, Heart, Droplets, Wind, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Patient } from '@/data/mockData';

function NurseMain() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [vitals, setVitals] = useState({ temperature: '', bp_sys: '', bp_dia: '', sugar: '', oxygen: '', heartRate: '' });
  const [observation, setObservation] = useState('');
  const [submittingVitals, setSubmittingVitals] = useState(false);
  const [submittingObs, setSubmittingObs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*');

      if (error) throw error;

      const transformed: Patient[] = (data || []).map(p => ({
        id: p.id,
        admissionNo: p.admission_no,
        tokenNo: p.token_no,
        name: p.name,
        age: p.age,
        gender: p.gender as any,
        contact: p.contact || '',
        assignedDoctor: 'Dr. Priya Sharma',
        admissionDate: p.admission_date,
        status: p.status as any,
        symptoms: p.symptoms || [],
        diagnosis: p.diagnosis || '',
        vitals: [],
        prescriptions: [],
        labReports: [],
        riskScores: { treatmentFailure: 0, diseaseProgression: 0, drugSideEffect: 0, readmission: 0 }
      }));

      setPatients(transformed);
      if (transformed.length > 0) setSelectedPatient(transformed[0]);
    } catch (e) {
      console.error('Error fetching patients:', e);
      toast.error('Failed to load patients');
    }
    setLoading(false);
  };

  const handleSubmitVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    setSubmittingVitals(true);
    try {
      const { error } = await supabase
        .from('vitals')
        .insert({
          patient_id: selectedPatient.id,
          temperature: parseFloat(vitals.temperature) || null,
          bp_systolic: parseInt(vitals.bp_sys) || null,
          bp_diastolic: parseInt(vitals.bp_dia) || null,
          sugar: parseFloat(vitals.sugar) || null,
          oxygen: parseFloat(vitals.oxygen) || null,
          heart_rate: parseInt(vitals.heartRate) || null,
        });

      if (error) throw error;
      logAction('Record Vitals', 'Patient', selectedPatient.id, { temperature: parseFloat(vitals.temperature) || null, bp_systolic: parseInt(vitals.bp_sys) || null, bp_diastolic: parseInt(vitals.bp_dia) || null, sugar: parseFloat(vitals.sugar) || null, oxygen: parseFloat(vitals.oxygen) || null, heart_rate: parseInt(vitals.heartRate) || null });

      toast.success(`Vitals recorded for ${selectedPatient.name}`);
      setVitals({ temperature: '', bp_sys: '', bp_dia: '', sugar: '', oxygen: '', heartRate: '' });
    } catch (e) {
      console.error('Error saving vitals:', e);
      toast.error('Failed to save vitals');
    }
    setSubmittingVitals(false);
  };

  const handleSaveObservation = async () => {
    if (!selectedPatient || !observation.trim()) {
      toast.error('Please select a patient and enter an observation');
      return;
    }

    setSubmittingObs(true);
    try {
      const { error } = await supabase
        .from('observations')
        .insert({
          patient_id: selectedPatient.id,
          notes: observation.trim(),
          type: 'Nurse Note'
        });

      if (error) throw error;
      logAction('Record Observation', 'Patient', selectedPatient.id, { notes: observation.trim(), type: 'Nurse Note' });

      toast.success('Observation saved');
      setObservation('');
    } catch (e) {
      console.error('Error saving observation:', e);
      toast.error('Failed to save observation');
    }
    setSubmittingObs(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-3 text-lg font-medium text-muted-foreground">Loading patients...</span>
      </div>
    );
  }

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.admissionNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Assigned Patients', value: patients.length, icon: <Users className="w-5 h-5" />, color: 'bg-medical-blue-light text-medical-blue' },
          { label: 'Vitals Due', value: 2, icon: <Activity className="w-5 h-5" />, color: 'bg-risk-moderate-bg text-risk-moderate' },
          { label: 'Observations Today', value: 5, icon: <ClipboardList className="w-5 h-5" />, color: 'bg-medical-teal-light text-medical-teal' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
            <div className="text-2xl font-display font-bold text-card-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border shadow-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border bg-card">
            <h3 className="font-display font-semibold text-card-foreground mb-3">Patients</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search name or ID..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-border">
            {filteredPatients.map((p) => (
              <button key={p.id} onClick={() => setSelectedPatient(p)}
                className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${selectedPatient?.id === p.id ? 'bg-muted/70' : ''}`}>
                <div className="font-medium text-sm text-card-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.admissionNo} · Room: {p.tokenNo}</div>
              </button>
            ))}
            {filteredPatients.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No patients found</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedPatient ? (
            <>
              <div className="bg-card rounded-xl border border-border p-5 shadow-card">
                <h3 className="font-display font-semibold text-card-foreground mb-4">
                  Record Vitals — {selectedPatient.name}
                </h3>
                <form onSubmit={handleSubmitVitals} className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="flex items-center gap-1.5 text-xs"><Thermometer className="w-3.5 h-3.5" />Temp (°F)</Label>
                      <Input type="number" step="0.1" value={vitals.temperature} onChange={e => setVitals({ ...vitals, temperature: e.target.value })} className="mt-1" placeholder="98.6" />
                    </div>
                    <div>
                      <Label className="text-xs">BP Systolic</Label>
                      <Input type="number" value={vitals.bp_sys} onChange={e => setVitals({ ...vitals, bp_sys: e.target.value })} className="mt-1" placeholder="120" />
                    </div>
                    <div>
                      <Label className="text-xs">BP Diastolic</Label>
                      <Input type="number" value={vitals.bp_dia} onChange={e => setVitals({ ...vitals, bp_dia: e.target.value })} className="mt-1" placeholder="80" />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5 text-xs"><Droplets className="w-3.5 h-3.5" />Sugar</Label>
                      <Input type="number" value={vitals.sugar} onChange={e => setVitals({ ...vitals, sugar: e.target.value })} className="mt-1" placeholder="100" />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5 text-xs"><Wind className="w-3.5 h-3.5" />O₂ (%)</Label>
                      <Input type="number" value={vitals.oxygen} onChange={e => setVitals({ ...vitals, oxygen: e.target.value })} className="mt-1" placeholder="98" />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5 text-xs"><Heart className="w-3.5 h-3.5" />Heart Rate</Label>
                      <Input type="number" value={vitals.heartRate} onChange={e => setVitals({ ...vitals, heartRate: e.target.value })} className="mt-1" placeholder="72" />
                    </div>
                  </div>
                  <Button type="submit" disabled={submittingVitals} className="gradient-medical text-primary-foreground hover:opacity-90">
                    {submittingVitals ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {submittingVitals ? 'Saving...' : 'Save Vitals'}
                  </Button>
                </form>
              </div>

              <div className="bg-card rounded-xl border border-border p-5 shadow-card">
                <h3 className="font-display font-semibold text-card-foreground mb-3">Daily Observation Notes</h3>
                <VoiceInput
                  value={observation}
                  onChange={setObservation}
                  placeholder="Dictate or type observation notes..."
                  rows={4}
                />
                <Button
                  onClick={handleSaveObservation}
                  disabled={submittingObs || !observation.trim()}
                  className="mt-3 gradient-medical text-primary-foreground hover:opacity-90"
                >
                  {submittingObs ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {submittingObs ? 'Saving...' : 'Save Observation'}
                </Button>
              </div>
            </>
          ) : (
            <div className="bg-card rounded-xl border border-border p-12 shadow-card flex flex-col items-center justify-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-card-foreground">Select a patient</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-xs">Choose a patient from the list to record vitals and observations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NurseDashboard() {
  const location = useLocation();

  if (location.pathname === '/nurse/observations') return (
    <DashboardLayout>
      <NurseMain />
    </DashboardLayout>
  );

  return <DashboardLayout><NurseMain /></DashboardLayout>;
}
