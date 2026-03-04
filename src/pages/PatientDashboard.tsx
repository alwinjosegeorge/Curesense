import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import VitalsChart from '@/components/VitalsChart';
import HomeMonitoring from '@/components/HomeMonitoring';
import VoiceInput from '@/components/VoiceInput';
import AppointmentBooking from '@/components/AppointmentBooking';
import { motion } from 'framer-motion';
import { Activity, Calendar, FileText, Heart, Thermometer, User, Users, Brain, Info, LogOut, Settings, Bell, Share2, Clipboard, Plus, CheckCircle2, AlertTriangle, ShieldCheck, Loader2, FlaskConical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Patient } from '@/data/mockData';
import { logAction } from '@/utils/audit';
import { useAuth } from '@/contexts/AuthContext';

function PatientMain() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [symptoms, setSymptoms] = useState('');
  const [sideEffects, setSideEffects] = useState('');
  const [submittingSymptom, setSubmittingSymptom] = useState(false);
  const [submittingSideEffect, setSubmittingSideEffect] = useState(false);

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    setLoading(true);
    try {
      // Patient login sets user.id = patients.id (primary key from patients table)
      const patientId = user?.id;

      let query = supabase
        .from('patients')
        .select(`
          *,
          vitals (*),
          prescriptions (*),
          lab_reports (*),
          doctors!assigned_doctor_id (name)
        `);

      if (patientId) {
        query = query.eq('id', patientId);
      } else {
        query = query.limit(1);
      }

      const { data: patientsData, error: patientError } = await query.maybeSingle();

      if (patientError) throw patientError;

      const p = patientsData;
      const transformed: Patient = {
        id: p.id,
        admissionNo: p.admission_no,
        tokenNo: p.token_no,
        name: p.name,
        age: p.age,
        gender: p.gender as any,
        contact: p.contact || '',
        assignedDoctor: (p.doctors as any)?.name || 'Unassigned',
        admissionDate: p.admission_date,
        status: p.status as any,
        symptoms: p.symptoms || [],
        diagnosis: p.diagnosis || '',
        vitals: (p.vitals || []).map((v: any) => ({
          timestamp: v.recorded_at,
          bp: { systolic: v.bp_systolic, diastolic: v.bp_diastolic },
          sugar: v.sugar,
          temperature: v.temperature,
          oxygen: v.oxygen,
          heartRate: v.heart_rate
        })),
        prescriptions: (p.prescriptions || []).map((rx: any) => ({
          id: rx.id,
          medicine: rx.medicine,
          dosage: rx.dosage,
          frequency: rx.frequency,
          startDate: rx.start_date,
          endDate: rx.end_date,
          status: rx.status as any
        })),
        labReports: (p.lab_reports || []).map((lab: any) => ({
          id: lab.id,
          testName: lab.test_name,
          date: lab.date,
          status: lab.status as any,
          result: lab.result,
          normalRange: lab.normal_range,
          value: lab.value,
          flag: lab.flag as any
        })),
        riskScores: { treatmentFailure: 35, diseaseProgression: 55, drugSideEffect: 20, readmission: 40 }
      };

      setPatient(transformed);
    } catch (e) {
      console.error('Error fetching patient data:', e);
      toast.error('Failed to load your medical records');
    }
    setLoading(false);
  };

  const handleReportSymptom = async () => {
    if (!patient || !symptoms.trim()) return;
    setSubmittingSymptom(true);
    try {
      const { error } = await supabase
        .from('observations')
        .insert({
          patient_id: patient.id,
          notes: `Patient reported symptom: ${symptoms.trim()}`
        });
      if (error) throw error;
      logAction('Record Symptom', 'Patient', patient.id, { notes: symptoms.trim(), type: 'Symptom Report' });
      toast.success('Symptoms reported to your doctor');
      setSymptoms('');
    } catch (e) {
      toast.error('Failed to report symptoms');
    }
    setSubmittingSymptom(false);
  };

  const handleReportSideEffect = async () => {
    if (!patient || !sideEffects.trim()) return;
    setSubmittingSideEffect(true);
    try {
      const { error } = await supabase
        .from('observations')
        .insert({
          patient_id: patient.id,
          notes: `Patient reported side effect: ${sideEffects.trim()}`
        });
      if (error) throw error;
      toast.success('Side effects reported to your medical team');
      setSideEffects('');
    } catch (e) {
      toast.error('Failed to report side effects');
    }
    setSubmittingSideEffect(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-3 text-lg font-medium text-muted-foreground">Loading your records...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] bg-card rounded-xl border border-dashed border-border p-8">
        <Activity className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-bold text-card-foreground">Record not found</h3>
        <p className="text-muted-foreground text-center mt-2 max-w-md">We couldn't retrieve your medical profile at this time.</p>
      </div>
    );
  }

  const latestVitals = patient.vitals[patient.vitals.length - 1] || {
    temperature: 0, oxygen: 0, heartRate: 0, sugar: 0, bp: { systolic: 0, diastolic: 0 }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="gradient-hero rounded-2xl p-6 text-primary-foreground">
        <h2 className="text-2xl font-display font-bold">Welcome, {patient.name}</h2>
        <p className="opacity-80 mt-1">Admission: {patient.admissionNo} · Doctor: {patient.assignedDoctor}</p>
        <div className="flex gap-4 mt-4">
          <div className="bg-primary-foreground/10 backdrop-blur rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold">{patient.prescriptions.filter(r => r.status === 'Active').length}</div>
            <div className="text-xs opacity-70">Active Meds</div>
          </div>
          <div className="bg-primary-foreground/10 backdrop-blur rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold">{patient.labReports.filter(r => r.status === 'Pending').length}</div>
            <div className="text-xs opacity-70">Pending Labs</div>
          </div>
          <div className="bg-primary-foreground/10 backdrop-blur rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold">{latestVitals.oxygen}%</div>
            <div className="text-xs opacity-70">O₂ Level</div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Temperature', value: `${latestVitals.temperature}°F`, icon: <Thermometer className="w-5 h-5" />, color: 'bg-risk-critical-bg text-risk-critical' },
          { label: 'Heart Rate', value: `${latestVitals.heartRate} bpm`, icon: <Heart className="w-5 h-5" />, color: 'bg-risk-moderate-bg text-risk-moderate' },
          { label: 'Blood Pressure', value: `${latestVitals.bp?.systolic || 0}/${latestVitals.bp?.diastolic || 0}`, icon: <Activity className="w-5 h-5" />, color: 'bg-medical-blue-light text-medical-blue' },
          { label: 'Blood Sugar', value: `${latestVitals.sugar} mg/dL`, icon: <FlaskConical className="w-5 h-5" />, color: 'bg-medical-teal-light text-medical-teal' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>{stat.icon}</div>
            <div className="text-lg font-bold text-card-foreground">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5 shadow-card space-y-4">
          <h3 className="font-display font-semibold text-card-foreground">Report Daily Symptoms</h3>
          <VoiceInput value={symptoms} onChange={setSymptoms} placeholder="Describe your symptoms today..." label="Symptoms (Voice-to-Text)" />
          <Button onClick={handleReportSymptom} disabled={submittingSymptom || !symptoms.trim()} className="gradient-medical text-primary-foreground hover:opacity-90">
            {submittingSymptom ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Symptoms
          </Button>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card space-y-4">
          <h3 className="font-display font-semibold text-card-foreground">Report Side Effects</h3>
          <VoiceInput value={sideEffects} onChange={setSideEffects} placeholder="Any side effects from medication..." label="Side Effects (Voice-to-Text)" />
          <Button onClick={handleReportSideEffect} disabled={submittingSideEffect || !sideEffects.trim()} className="gradient-medical text-primary-foreground hover:opacity-90">
            {submittingSideEffect ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            <h3 className="font-display font-semibold text-card-foreground">Active Prescriptions</h3>
          </div>
          <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
            {patient.prescriptions.filter(r => r.status === 'Active').map(rx => (
              <div key={rx.id} className="p-3 rounded-lg border border-border bg-background">
                <div className="font-medium text-sm text-foreground">{rx.medicine}</div>
                <div className="text-xs text-muted-foreground mt-1">{rx.dosage} · {rx.frequency}</div>
              </div>
            ))}
            {patient.prescriptions.filter(r => r.status === 'Active').length === 0 && (
              <p className="text-sm text-muted-foreground">No active prescriptions.</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-accent" />
            <h3 className="font-display font-semibold text-card-foreground">Lab Reports</h3>
          </div>
          <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
            {patient.labReports.map(lab => (
              <div key={lab.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <div>
                  <div className="font-medium text-sm text-foreground">{lab.testName}</div>
                  <div className="text-xs text-muted-foreground">{lab.date} {lab.value && `· ${lab.value}`}</div>
                </div>
                <Badge variant={lab.status === 'Pending' ? 'secondary' : 'default'} className="text-xs">{lab.status}</Badge>
              </div>
            ))}
            {patient.labReports.length === 0 && (
              <p className="text-sm text-muted-foreground">No lab reports found.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VitalsChart vitals={patient.vitals} type="bp" />
        <VitalsChart vitals={patient.vitals} type="sugar" />
        {/* Invitation Card */}
        <Card className="p-6 bg-slate-900/50 border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-medical-blue" />
            <h3 className="text-lg font-semibold">Invite Close Relative</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Grant read-only access to your medical history, prescriptions, and lab reports to a trusted family member.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="Enter relative's email"
              className="flex-1 bg-slate-800 border-slate-700 rounded-md px-3 py-2 text-sm"
            />
            <Button onClick={() => {
              logAction('Invite Relative', 'Patient', patient?.id || 'N/A');
              toast.success('Invitation link sent to your relative');
            }}>
              Send Link
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function PatientDashboard() {
  const location = useLocation();

  if (location.pathname === '/patient/vitals') return <DashboardLayout><HomeMonitoring /></DashboardLayout>;
  if (location.pathname === '/patient/appointments') return <DashboardLayout><AppointmentBooking role="patient" /></DashboardLayout>;

  return <DashboardLayout><PatientMain /></DashboardLayout>;
}
