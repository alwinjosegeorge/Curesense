import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import AppointmentBooking from '@/components/AppointmentBooking';
import { motion } from 'framer-motion';
import { UserPlus, Users, Calendar, Hash, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { logAction } from '@/utils/audit';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Patient } from '@/data/mockData';

function AdminMain() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [stats, setStats] = useState({ admissions: 0, tokens: 0, appointments: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', age: '', gender: '', contact: '', dob: '',
    address: '', city: '', pinCode: '', bloodGroup: '',
    emergencyName: '', emergencyPhone: '', emergencyRelation: ''
  });

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
          doctors!assigned_doctor_id (name)
        `)
        .order('created_at', { ascending: false });

      if (pError) throw pError;

      // Fetch all departments
      const { data: deptData } = await (supabase as any).from('departments').select('id, name').order('name');
      if (deptData) setDepartments(deptData);

      // Fetch all doctors initially (will filter in render if needed)
      const { data: dData } = await (supabase as any).from('doctors').select('id, name, department_id').order('name');
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
        tokens: pData?.filter(p => p.admission_date === today).length || 0,
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
          date_of_birth: form.dob,
          admission_no: admNo,
          token_no: tokenNo,
          status: 'Admitted',
          address: form.address || null,
          city: form.city || null,
          pin_code: form.pinCode || null,
          blood_group: form.bloodGroup || null,
          emergency_contact_name: form.emergencyName || null,
          emergency_contact_phone: form.emergencyPhone || null,
          emergency_contact_relation: form.emergencyRelation || null,
        } as any)
        .select();

      if (error) throw error;

      logAction('Patient Admission', 'Patient', data[0].id, { name: form.name });
      toast.success(
        `✅ Patient admitted! Tell patient: Login ID = ${admNo} · Password = DOB (${form.dob})`,
        { duration: 10000 }
      );
      setForm({ name: '', age: '', gender: '', contact: '', dob: '', address: '', city: '', pinCode: '', bloodGroup: '', emergencyName: '', emergencyPhone: '', emergencyRelation: '' });
      setSelectedDeptId('');
      fetchData();
    } catch (e: any) {
      console.error('Error admitting patient:', e);
      toast.error(e.message || 'Failed to admit patient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDoctors = selectedDeptId
    ? doctors.filter(d => d.department_id === selectedDeptId)
    : doctors;

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Patients', value: stats.admissions, icon: <Users className="w-5 h-5" />, color: 'bg-medical-blue-light text-medical-blue' },
          { label: "Today's Admissions", value: stats.tokens, icon: <Hash className="w-5 h-5" />, color: 'bg-medical-teal-light text-medical-teal' },
          { label: "Today's Appointments", value: stats.appointments, icon: <Calendar className="w-5 h-5" />, color: 'bg-risk-moderate-bg text-risk-moderate' },
          { label: 'Critical', value: patients.filter(p => p.status === 'Critical').length, icon: <span className="text-lg">🚨</span>, color: 'bg-risk-critical-bg text-risk-critical' },
          { label: 'Discharged', value: patients.filter(p => p.status === 'Discharged').length, icon: <span className="text-lg">✅</span>, color: 'bg-green-100 text-green-700' },
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
          <form onSubmit={handleAdmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Section: Personal Details */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Patient full name" className="mt-1" required />
              </div>
              <div>
                <Label>Age *</Label>
                <Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Age" className="mt-1" required />
              </div>
              <div>
                <Label>Date of Birth * <span className="text-muted-foreground font-normal">(used as login password)</span></Label>
                <Input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="mt-1" required />
              </div>
              <div>
                <Label>Gender *</Label>
                <select className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} required>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label>Blood Group</Label>
                <select className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })}>
                  <option value="">Select blood group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label>Contact Number *</Label>
                <Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="+91 XXXXX XXXXX" className="mt-1" required />
              </div>
            </div>

            {/* Section: Address */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="House No, Street, Area" className="mt-1" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" className="mt-1" />
              </div>
              <div>
                <Label>Pin Code</Label>
                <Input value={form.pinCode} onChange={e => setForm({ ...form, pinCode: e.target.value })} placeholder="686001" className="mt-1" maxLength={6} />
              </div>
            </div>

            {/* Section: Emergency Contact */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.emergencyName} onChange={e => setForm({ ...form, emergencyName: e.target.value })} placeholder="Name" className="mt-1" />
              </div>
              <div>
                <Label>Relation</Label>
                <select className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.emergencyRelation} onChange={e => setForm({ ...form, emergencyRelation: e.target.value })}>
                  <option value="">Select</option>
                  {['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label>Emergency Phone</Label>
                <Input value={form.emergencyPhone} onChange={e => setForm({ ...form, emergencyPhone: e.target.value })} placeholder="+91 XXXXX XXXXX" className="mt-1" />
              </div>
            </div>

            {/* Login info note */}
            <div className="rounded-lg border border-medical-blue-light bg-medical-blue-light/20 p-3">
              <p className="text-xs text-medical-blue font-medium">🔑 Patient Login Info (tell the patient after admission)</p>
              <p className="text-xs text-muted-foreground mt-1">Login ID: <strong>Admission Number</strong> (auto-generated) · Password: <strong>Date of Birth</strong></p>
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
      const { data, error } = await supabase.from('patients').select('*, doctors!assigned_doctor_id(name)').order('name');
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
  if (location.pathname === '/admin/patients') {
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('All');
    const filtered = patients.filter(p =>
      (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.admissionNo.toLowerCase().includes(search.toLowerCase())) &&
      (statusFilter === 'All' || p.status === statusFilter)
    );
    return (
      <DashboardLayout>
        <div className="bg-card rounded-xl border border-border shadow-card">
          <div className="p-4 border-b border-border space-y-3">
            <h3 className="font-display font-semibold text-card-foreground">All Patients ({filtered.length}/{patients.length})</h3>
            <div className="flex gap-2">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name or ID..."
                className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none">
                <option value="All">All Status</option>
                <option>Admitted</option>
                <option>Under Observation</option>
                <option>Critical</option>
                <option>Stable</option>
                <option>Discharged</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-medical-blue" /></div>
            ) : filtered.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full gradient-medical flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {p.name?.[0]}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-card-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.admissionNo} · {p.age}y {p.gender} · {p.assignedDoctor}</div>
                    {p.diagnosis && <div className="text-xs text-accent mt-0.5">Dx: {p.diagnosis}</div>}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${p.status === 'Critical' ? 'bg-risk-critical-bg text-risk-critical' :
                  p.status === 'Discharged' ? 'bg-green-100 text-green-700' :
                    p.status === 'Admitted' ? 'bg-medical-blue-light text-medical-blue' :
                      'bg-risk-moderate-bg text-risk-moderate'}`}>{p.status}</span>
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No patients found.</div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (location.pathname === '/admin/nurses') {
    const [nurses, setNurses] = React.useState<any[]>([]);
    const [nurseLoading, setNurseLoading] = React.useState(true);
    const [nurseForm, setNurseForm] = React.useState({ name: '', employeeId: '', dob: '', contact: '', doctorId: '' });
    const [nurseSubmitting, setNurseSubmitting] = React.useState(false);
    const [allDoctors, setAllDoctors] = React.useState<any[]>([]);

    React.useEffect(() => {
      const load = async () => {
        setNurseLoading(true);
        const { data: nData } = await (supabase as any).from('nurses').select('*, doctors!assigned_doctor_id(name)').order('name');
        if (nData) setNurses(nData);
        const { data: dData } = await (supabase as any).from('doctors').select('id, name').order('name');
        if (dData) setAllDoctors(dData);
        setNurseLoading(false);
      };
      load();
    }, []);

    const handleAddNurse = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!nurseForm.name || !nurseForm.employeeId || !nurseForm.dob) { toast.error('Name, Employee ID and DOB are required'); return; }
      setNurseSubmitting(true);
      try {
        const { error } = await (supabase as any).from('nurses').insert({
          name: nurseForm.name,
          employee_id: nurseForm.employeeId,
          date_of_birth: nurseForm.dob,
          contact: nurseForm.contact || null,
          assigned_doctor_id: nurseForm.doctorId || null,
        });
        if (error) throw error;
        toast.success(`✅ Nurse ${nurseForm.name} added! Login: ${nurseForm.employeeId} / DOB: ${nurseForm.dob}`);
        setNurseForm({ name: '', employeeId: '', dob: '', contact: '', doctorId: '' });
        const { data: nData } = await (supabase as any).from('nurses').select('*, doctors!assigned_doctor_id(name)').order('name');
        if (nData) setNurses(nData);
      } catch (e: any) { toast.error(e.message || 'Failed to add nurse'); }
      setNurseSubmitting(false);
    };

    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Nurse Form */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <div className="flex items-center gap-2 mb-5">
                <UserPlus className="w-5 h-5 text-accent" />
                <h3 className="font-display font-semibold text-card-foreground text-lg">Add Nurse Account</h3>
              </div>
              <form onSubmit={handleAddNurse} className="space-y-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={nurseForm.name} onChange={e => setNurseForm({ ...nurseForm, name: e.target.value })} placeholder="Nurse full name" className="mt-1" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employee ID * <span className="text-muted-foreground font-normal">(login ID)</span></Label>
                    <Input value={nurseForm.employeeId} onChange={e => setNurseForm({ ...nurseForm, employeeId: e.target.value })} placeholder="NUR001" className="mt-1" required />
                  </div>
                  <div>
                    <Label>Date of Birth * <span className="text-muted-foreground font-normal">(login password)</span></Label>
                    <Input type="date" value={nurseForm.dob} onChange={e => setNurseForm({ ...nurseForm, dob: e.target.value })} className="mt-1" required />
                  </div>
                </div>
                <div>
                  <Label>Contact Number</Label>
                  <Input value={nurseForm.contact} onChange={e => setNurseForm({ ...nurseForm, contact: e.target.value })} placeholder="Phone number" className="mt-1" />
                </div>
                <div>
                  <Label>Assign to Doctor</Label>
                  <select className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={nurseForm.doctorId} onChange={e => setNurseForm({ ...nurseForm, doctorId: e.target.value })}>
                    <option value="">Select doctor (optional)</option>
                    {allDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                  🔑 <strong>Nurse Login Credentials:</strong> <br />
                  Login ID = Employee ID · Password = Date of Birth
                </div>
                <Button type="submit" disabled={nurseSubmitting} className="w-full gradient-medical text-primary-foreground">
                  {nurseSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {nurseSubmitting ? 'Adding...' : 'Add Nurse'}
                </Button>
              </form>
            </div>

            {/* Nurses List */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-display font-semibold text-card-foreground">All Nurses ({nurses.length})</h3>
              </div>
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {nurseLoading ? (
                  <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-medical-blue" /></div>
                ) : nurses.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No nurses added yet.</div>
                ) : nurses.map(n => (
                  <div key={n.id} className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                      {n.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-card-foreground">{n.name}</div>
                      <div className="text-xs text-muted-foreground">ID: {n.employee_id} {n.contact && `· ${n.contact}`}</div>
                      <div className="text-xs mt-0.5">
                        {n.doctors?.name ? (
                          <span className="text-accent font-medium">👨‍⚕️ Dr. {n.doctors.name}</span>
                        ) : (
                          <span className="text-muted-foreground">No doctor assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return <DashboardLayout><AdminMain /></DashboardLayout>;
}
