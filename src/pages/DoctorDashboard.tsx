import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import VitalsChart from '@/components/VitalsChart';
import RiskPanel from '@/components/RiskPanel';
import AlertPanel from '@/components/AlertPanel';
import CaseSummary from '@/components/CaseSummary';
import VoiceInput from '@/components/VoiceInput';
import AppointmentBooking from '@/components/AppointmentBooking';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, Activity, Brain, FileText, FlaskConical, Pill, Stethoscope, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';
import PDFGenerator from '@/components/PDFGenerator';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Patient, Alert } from '@/data/mockData';

const statusColor: Record<string, string> = {
  'Admitted': 'bg-medical-blue-light text-medical-blue',
  'Under Observation': 'bg-risk-moderate-bg text-risk-moderate',
  'Discharged': 'bg-risk-stable-bg text-risk-stable',
  'Critical': 'bg-risk-critical-bg text-risk-critical',
};

function DoctorMain() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [caseNotes, setCaseNotes] = useState('');
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch patients with related data
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select(`
          *,
          vitals (*),
          prescriptions (*),
          lab_reports (*)
        `);

      if (patientsError) throw patientsError;

      // Transform data to match mock model
      const transformedPatients: Patient[] = (patientsData || []).map(p => ({
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
        diagnosis: p.diagnosis,
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
      }));

      setPatients(transformedPatients);
      if (transformedPatients.length > 0) setSelectedPatient(transformedPatients[0]);

      // Fetch alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      const transformedAlerts: Alert[] = (alertsData || []).map(a => ({
        id: a.id,
        patientId: a.patient_id,
        patientName: transformedPatients.find(p => p.id === a.patient_id)?.name || 'Unknown',
        type: a.type as any,
        message: a.message,
        timestamp: a.created_at,
        acknowledged: a.acknowledged
      }));

      setAlerts(transformedAlerts);
    } catch (e) {
      console.error('Error fetching data:', e);
      toast.error('Failed to load patient data');
    }
    setLoading(false);
  };

  const acknowledgeAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ acknowledged: true })
        .eq('id', id);

      if (error) throw error;
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
      logAction('Acknowledge Alert', 'Alert', id);
      toast.success('Alert acknowledged');
    } catch (e) {
      toast.error('Failed to acknowledge alert');
    }
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
      if (data.error) {
        toast.error(data.error);
      } else {
        setAiResult(data.result);
        toast.success('AI analysis complete');
      }
    } catch (e) {
      toast.error('Failed to run AI analysis');
    }
    setAiLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-3 text-lg font-medium text-muted-foreground">Loading patient data...</span>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] bg-card rounded-xl border border-dashed border-border p-8">
        <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-bold text-card-foreground">No patients found</h3>
        <p className="text-muted-foreground text-center mt-2 max-w-md">There are currently no patients admitted in the system.</p>
      </div>
    );
  }

  const criticalCount = patients.filter(p => p.status === 'Critical').length;
  const activeAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: patients.length, icon: <Users className="w-5 h-5" />, color: 'bg-medical-blue-light text-medical-blue' },
          { label: 'Critical', value: criticalCount, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-risk-critical-bg text-risk-critical' },
          { label: 'Active Alerts', value: activeAlerts.length, icon: <Activity className="w-5 h-5" />, color: 'bg-risk-moderate-bg text-risk-moderate' },
          { label: 'AI Insights', value: '12', icon: <Brain className="w-5 h-5" />, color: 'bg-medical-teal-light text-medical-teal' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>{stat.icon}</div>
            </div>
            <div className="text-2xl font-display font-bold text-card-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {activeAlerts.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <h3 className="text-base font-display font-semibold text-card-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-risk-critical" /> Active Alerts
          </h3>
          <AlertPanel alerts={activeAlerts} onDismiss={acknowledgeAlert} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border border-border shadow-card">
          <div className="p-4 border-b border-border">
            <h3 className="font-display font-semibold text-card-foreground">My Patients</h3>
          </div>
          <div className="divide-y divide-border">
            {patients.map((patient) => (
              <button key={patient.id} onClick={() => setSelectedPatient(patient)}
                className={`w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center gap-3 ${selectedPatient?.id === patient.id ? 'bg-muted/70' : ''}`}>
                <div className="w-10 h-10 rounded-full gradient-medical flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {patient.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-card-foreground truncate">{patient.name}</div>
                  <div className="text-xs text-muted-foreground">{patient.admissionNo} · {patient.age}y · {patient.gender}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[patient.status]}`}>{patient.status}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedPatient && (
            <div className="bg-card rounded-xl border border-border p-5 shadow-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-display font-bold text-card-foreground">{selectedPatient.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.admissionNo} · Token: {selectedPatient.tokenNo} · Admitted: {selectedPatient.admissionDate}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Symptoms: {selectedPatient.symptoms.join(', ')}</p>
                  {selectedPatient.diagnosis && (
                    <p className="text-sm font-medium text-accent mt-1">Dx: {selectedPatient.diagnosis}</p>
                  )}
                </div>
                <span className={`text-sm px-3 py-1 rounded-full font-semibold ${statusColor[selectedPatient.status]}`}>
                  {selectedPatient.status}
                </span>
              </div>

              <Tabs defaultValue="vitals" className="mt-4">
                <TabsList className="bg-muted">
                  <TabsTrigger value="vitals" className="text-xs"><Activity className="w-3.5 h-3.5 mr-1" />Vitals</TabsTrigger>
                  <TabsTrigger value="prescriptions" className="text-xs"><Pill className="w-3.5 h-3.5 mr-1" />Rx</TabsTrigger>
                  <TabsTrigger value="labs" className="text-xs"><FlaskConical className="w-3.5 h-3.5 mr-1" />Labs</TabsTrigger>
                  <TabsTrigger value="ai" className="text-xs"><Brain className="w-3.5 h-3.5 mr-1" />AI Risk</TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" />Notes</TabsTrigger>
                  <TabsTrigger value="summary" className="text-xs"><Stethoscope className="w-3.5 h-3.5 mr-1" />Summary</TabsTrigger>
                </TabsList>

                <TabsContent value="vitals" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <VitalsChart vitals={selectedPatient.vitals} type="bp" />
                    <VitalsChart vitals={selectedPatient.vitals} type="oxygen" />
                    <VitalsChart vitals={selectedPatient.vitals} type="sugar" />
                    <VitalsChart vitals={selectedPatient.vitals} type="heartRate" />
                  </div>
                </TabsContent>

                <TabsContent value="prescriptions" className="mt-4">
                  <div className="space-y-2">
                    {selectedPatient.prescriptions.map(rx => (
                      <div key={rx.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <div>
                          <div className="font-medium text-sm text-foreground">{rx.medicine}</div>
                          <div className="text-xs text-muted-foreground">{rx.dosage} · {rx.frequency}</div>
                        </div>
                        <Badge variant={rx.status === 'Active' ? 'default' : 'secondary'} className="text-xs">{rx.status}</Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="labs" className="mt-4">
                  <div className="space-y-2">
                    {selectedPatient.labReports.map(lab => (
                      <div key={lab.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <div>
                          <div className="font-medium text-sm text-foreground">{lab.testName}</div>
                          <div className="text-xs text-muted-foreground">{lab.date} {lab.value && `· ${lab.value}`} {lab.normalRange && `(Normal: ${lab.normalRange})`}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${lab.flag === 'Critical' ? 'bg-risk-critical-bg text-risk-critical' :
                          lab.flag === 'Abnormal' ? 'bg-risk-moderate-bg text-risk-moderate' :
                            lab.status === 'Pending' ? 'bg-muted text-muted-foreground' :
                              'bg-risk-stable-bg text-risk-stable'
                          }`}>{lab.flag || lab.status}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="ai" className="mt-4">
                  <RiskPanel scores={selectedPatient.riskScores} />
                  <div className="mt-4 flex gap-3">
                    <Button onClick={runAiAnalysis} disabled={aiLoading} className="gradient-medical text-primary-foreground hover:opacity-90">
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Brain className="w-4 h-4 mr-2" />}
                      {aiLoading ? 'Analyzing...' : 'Run AI Analysis'}
                    </Button>
                  </div>
                  {aiResult && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-xl bg-medical-blue-light border border-medical-blue/10">
                      <div className="flex items-center gap-2">
                        <PDFGenerator
                          patientName={selectedPatient.name}
                          type="Case Summary"
                          data={selectedPatient}
                        />
                        <Badge variant="outline" className="text-risk-stable border-risk-stable">Stable</Badge>
                      </div>
                      <span className="text-sm font-semibold text-medical-blue">AI Analysis Result</span>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiResult}</p>
                    </motion.div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="mt-4 space-y-4">
                  <VoiceInput
                    value={caseNotes}
                    onChange={setCaseNotes}
                    placeholder="Dictate or type case notes..."
                    label="Case Notes (Voice-to-Text Enabled)"
                    rows={4}
                  />
                  <VoiceInput
                    value={diagnosisNotes}
                    onChange={setDiagnosisNotes}
                    placeholder="Dictate or type diagnosis..."
                    label="Diagnosis Notes"
                    rows={3}
                  />
                  <Button onClick={() => { toast.success('Notes saved'); }} className="gradient-medical text-primary-foreground hover:opacity-90">
                    Save Notes
                  </Button>
                </TabsContent>

                <TabsContent value="summary" className="mt-4">
                  <CaseSummary patient={selectedPatient} />
                </TabsContent>
              </Tabs>
            </div>
          )}
          {!selectedPatient && patients.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-12 shadow-card flex flex-col items-center justify-center">
              <Stethoscope className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-card-foreground">Select a patient</h3>
              <p className="text-muted-foreground text-center mt-2 max-w-xs">Choose a patient from the list on the left.</p>
            </div>
          )}
        </div>
      </div>
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
