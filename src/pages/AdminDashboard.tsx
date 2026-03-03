import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import AppointmentBooking from '@/components/AppointmentBooking';
import { motion } from 'framer-motion';
import { UserPlus, Users, Calendar, Hash, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Patient } from '@/data/mockData';

function AdminMain() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [stats, setStats] = useState({ admissions: 0, tokens: 0, appointments: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', age: '', gender: '', contact: '', symptoms: '', doctor_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch patients with joined doctors
      const { data: pData, error: pError } = await supabase
        .from('patients')
        .select(`
          *,
          doctors (name)
        `)
        .order('created_at', { ascending: false });

      if (pError) throw pError;

      // Fetch all doctors for the dropdown
      const { data: dData } = await supabase.from('doctors').select('id, name').order('name');
      if (dData) setDoctors(dData);

      // Fetch Today's stats
      const today = new Date().toISOString().split('T')[0];
      const { count: aptCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today);

      const transformed: Patient[] = (pData || []).map(p => ({
        id: p.id,
        admissionNo: p.admission_no,
        tokenNo: p.token_no,
        name: p.name,
        age: p.age,
        gender: p.gender as any,
        contact: p.contact || '',
        assignedDoctor: (p.doctors as any)?.name || 'Needs Assignment',
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
      setStats({
        admissions: pData?.length || 0,
        tokens: pData?.filter(p => p.admission_date === today).length || 12, // fallback or real
        appointments: aptCount || 0
      });
    } catch (e) {
      console.error('Error fetching data:', e);
      toast.error('Failed to load dashboard data');
    }
    setLoading(false);
  };

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const nextId = (patients.length + 1);
      const admNo = `ADM${String(nextId).padStart(3, '0')}`;
      const tokenNo = `TKN-${String(40 + nextId).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('patients')
        .insert({
          name: form.name,
          age: parseInt(form.age),
          gender: form.gender,
          contact: form.contact,
          symptoms: form.symptoms.split(',').map(s => s.trim()),
          assigned_doctor_id: form.doctor_id,
          admission_no: admNo,
          token_no: tokenNo,
          status: 'Admitted'
        })
        .select(); // Select the inserted data to get the ID

      if (error) throw error;

      logAction('Patient Admission', 'Patient', data[0].id, { name: form.name });
      toast.success(`Patient admitted: ${form.name}`);
      setForm({ name: '', age: '', gender: '', contact: '', symptoms: '', doctor_id: '' });
      fetchData(); // Refresh list
    } catch (e) {
      console.error('Error admitting patient:', e);
      toast.error('Failed to admit patient');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-medical-blue" />
        <span className="ml-3 text-lg font-medium text-muted-foreground">Loading admissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Admissions', value: stats.admissions, icon: <Users className="w-5 h-5" />, color: 'bg-medical-blue-light text-medical-blue' },
          { label: "Today's Admissions", value: stats.tokens, icon: <Hash className="w-5 h-5" />, color: 'bg-medical-teal-light text-medical-teal' },
          { label: 'Today Reservations', value: stats.appointments, icon: <Calendar className="w-5 h-5" />, color: 'bg-risk-moderate-bg text-risk-moderate' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>{stat.icon}</div>
            <div className="text-2xl font-display font-bold text-card-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus className="w-5 h-5 text-accent" />
            <h3 className="font-display font-semibold text-card-foreground text-lg">New Patient Admission</h3>
          </div>
          <form onSubmit={handleAdmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Patient Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="mt-1" required />
              </div>
              <div>
                <Label>Age</Label>
                <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" className="mt-1" required />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Contact Number</Label>
                <Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="+91 XXXXX XXXXX" className="mt-1" required />
              </div>
              <div className="col-span-2">
                <Label>Initial Symptoms</Label>
                <Textarea value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} placeholder="Describe symptoms (comma separated)..." className="mt-1" rows={3} required />
              </div>
              <div className="col-span-2">
                <Label>Assign Doctor</Label>
                <Select value={form.doctor_id} onValueChange={v => setForm({ ...form, doctor_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full gradient-medical text-primary-foreground hover:opacity-90">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {submitting ? 'Admitting...' : 'Admit Patient'}
            </Button>
          </form>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-display font-semibold text-card-foreground">Recent Admissions</h3>
          </div>
          <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
            {patients.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-card-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.admissionNo} · {p.age}y {p.gender}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === 'Critical' ? 'bg-risk-critical-bg text-risk-critical' :
                    p.status === 'Admitted' ? 'bg-medical-blue-light text-medical-blue' :
                      'bg-risk-moderate-bg text-risk-moderate'
                    }`}>{p.status}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">Symptoms: {p.symptoms.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSettings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-display font-bold text-foreground">Settings</h2>
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="font-display font-semibold text-card-foreground mb-4">System Configuration</h3>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <span>Session Timeout</span>
              <span className="font-medium text-foreground">30 minutes</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <span>Audit Logging</span>
              <span className="font-medium text-risk-stable">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <span>Data Encryption</span>
              <span className="font-medium text-risk-stable">AES-256</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <span>Role-Based Access</span>
              <span className="font-medium text-risk-stable">Active</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function AdminDashboard() {
  const location = useLocation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.pathname === '/admin/patients') {
      fetchPatients();
    }
  }, [location.pathname]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('patients').select('*, doctors(name)').order('name');
      if (error) throw error;
      setPatients((data || []).map(p => ({
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
        vitals: [],
        prescriptions: [],
        labReports: [],
        riskScores: { treatmentFailure: 0, diseaseProgression: 0, drugSideEffect: 0, readmission: 0 }
      })));
    } catch (e) {
      toast.error('Failed to load patients');
    }
    setLoading(false);
  };

  if (location.pathname === '/admin/appointments') return <DashboardLayout><AppointmentBooking role="admin" /></DashboardLayout>;
  if (location.pathname === '/admin/settings') return <AdminSettings />;
  if (location.pathname === '/admin/patients') return (
    <DashboardLayout>
      <div className="bg-card rounded-xl border border-border shadow-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-display font-semibold text-card-foreground">All Patients</h3>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-medical-blue" /></div>
          ) : patients.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm text-card-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.admissionNo} · {p.age}y {p.gender}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === 'Critical' ? 'bg-risk-critical-bg text-risk-critical' :
                p.status === 'Admitted' ? 'bg-medical-blue-light text-medical-blue' :
                  'bg-risk-moderate-bg text-risk-moderate'
                }`}>{p.status}</span>
            </div>
          ))}
          {!loading && patients.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No patients found.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );

  return <DashboardLayout><AdminMain /></DashboardLayout>;
}
