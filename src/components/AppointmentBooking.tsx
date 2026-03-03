import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Hash, User, FileText, Loader2, ChevronDown, ChevronUp, Phone, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Department { id: string; name: string; icon: string; }
interface Doctor { id: string; name: string; specialty: string; department_id: string; }
interface Appointment {
  id: string; patientName: string; doctorName: string; doctorSpecialty: string;
  date: string; time: string; type: string; tokenNo: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Follow-up' | 'No-show';
  notes?: string; contact?: string;
}

const statusColors: Record<string, string> = {
  Scheduled: 'bg-medical-blue-light text-medical-blue',
  Completed: 'bg-risk-stable-bg text-risk-stable',
  Cancelled: 'bg-risk-critical-bg text-risk-critical',
  'Follow-up': 'bg-risk-moderate-bg text-risk-moderate',
};

export default function AppointmentBooking({ role = 'admin', doctorId }: { role?: string; doctorId?: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    patient: '',
    isNewPatient: false,
    contact: '',
    departmentId: '',
    doctorId: doctorId || '',
    date: '',
    time: '',
    type: 'Consultation',
    notes: ''
  });

  useEffect(() => {
    fetchMetadata();
    fetchAppointments();
  }, [doctorId]);

  const fetchMetadata = async () => {
    try {
      const { data: deptData } = await (supabase as any).from('departments').select('*').order('name');
      const { data: docData } = await (supabase as any).from('doctors').select('*').order('name');
      if (deptData) setDepartments(deptData);
      if (docData) setDoctors(docData);
    } catch (e) { console.error('Error fetching metadata:', e); }
  };

  const handlePatientSearch = async (val: string) => {
    setForm({ ...form, patient: val, isNewPatient: false });
    if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      const { data } = await (supabase as any)
        .from('patients').select('id, name, age, gender, date_of_birth, contact')
        .ilike('name', `%${val}%`).limit(5);
      if (data) { setSuggestions(data); setShowSuggestions(data.length > 0); }
    } catch (e) { console.error('Search error:', e); }
  };

  const selectPatient = (p: any) => {
    setForm({ ...form, patient: p.name, isNewPatient: false, contact: p.contact || '' });
    setSuggestions([]); setShowSuggestions(false);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`*, patients (name, contact), doctors (name, specialty)`)
        .order('appointment_date', { ascending: true });

      // If doctor role — only fetch appointments for this doctor
      if (role === 'doctor' && doctorId) {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const transformed: Appointment[] = (data || []).map(a => ({
        id: a.id,
        patientName: (a.patients as any)?.name || 'Unknown',
        doctorName: (a.doctors as any)?.name || 'Unknown Doctor',
        doctorSpecialty: (a.doctors as any)?.specialty || '',
        date: a.appointment_date,
        time: a.appointment_time || '',
        type: a.type,
        tokenNo: a.token_no || 'TKN-XXXX',
        status: a.status as any,
        notes: a.notes || '',
        contact: (a.patients as any)?.contact || '',
      }));
      setAppointments(transformed);
    } catch (e) {
      console.error('Error fetching appointments:', e);
      toast.error('Failed to load appointments');
    }
    setLoading(false);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let patientId: string | null = null;

      if (form.isNewPatient) {
        const nextId = (Date.now() % 1000);
        const admNo = `APT-NEW-${nextId}`;
        const tknNo = `TKN-RES-${nextId}`;
        const { data: newPatient, error: pError } = await supabase
          .from('patients')
          .insert({ name: form.patient, contact: form.contact, admission_no: admNo, token_no: tknNo, status: 'Admitted', age: 0, gender: 'Unknown' })
          .select().single();
        if (pError) throw pError;
        patientId = newPatient.id;
      } else {
        const { data: pData } = await supabase.from('patients').select('id').ilike('name', `%${form.patient}%`).limit(1);
        patientId = pData && pData.length > 0 ? pData[0].id : null;
      }

      if (!patientId) { toast.error('Patient not found. Check name or select "New Patient".'); setSubmitting(false); return; }

      const tokenNo = `TKN-${String(Date.now()).slice(-4)}`;
      const { error } = await supabase.from('appointments').insert({
        patient_id: patientId, doctor_id: form.doctorId,
        appointment_date: form.date, appointment_time: form.time,
        type: form.type, notes: form.notes, token_no: tokenNo, status: 'Scheduled'
      });
      if (error) throw error;

      toast.success(`Appointment booked! Token: ${tokenNo}`);
      setForm({ patient: '', isNewPatient: false, contact: '', departmentId: '', doctorId: doctorId || '', date: '', time: '', type: 'Consultation', notes: '' });
      fetchAppointments();
    } catch (e) {
      console.error('Error booking appointment:', e);
      toast.error('Failed to book appointment. Please try again.');
    } finally { setSubmitting(false); }
  };

  // Filter to only upcoming (Scheduled / Follow-up) for doctor view
  const displayAppointments = role === 'doctor'
    ? appointments.filter(a => a.status === 'Scheduled' || a.status === 'Follow-up')
    : appointments;

  return (
    <div className="space-y-6">
      {(role === 'admin' || role === 'doctor') && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-5 h-5 text-accent" />
            <h3 className="font-display font-semibold text-card-foreground text-lg">Book Appointment</h3>
          </div>
          <form onSubmit={handleBook} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* New patient toggle */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center gap-4 mb-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.isNewPatient}
                    onChange={e => setForm({ ...form, isNewPatient: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-medical-blue focus:ring-medical-blue" />
                  New patient (not yet registered)
                </label>
              </div>

              {/* Patient name with autocomplete */}
              <div className="relative">
                <Label className="flex items-center gap-1.5 text-xs"><User className="w-3.5 h-3.5" />Patient Name</Label>
                <Input value={form.patient} onChange={e => handlePatientSearch(e.target.value)}
                  onFocus={() => form.patient.length >= 2 && setShowSuggestions(suggestions.length > 0)}
                  placeholder="Type to search existing patients" className="mt-1" required />
                {showSuggestions && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {suggestions.map(p => (
                      <button key={p.id} type="button"
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors border-b border-border last:border-0"
                        onClick={() => selectPatient(p)}>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.age}y · {p.gender} · {p.contact}</div>
                      </button>
                    ))}
                    <button type="button" className="w-full px-4 py-2 text-left text-xs text-accent hover:bg-muted transition-colors font-medium"
                      onClick={() => { setShowSuggestions(false); setForm({ ...form, isNewPatient: true }); }}>
                      + Register as new patient
                    </button>
                  </div>
                )}
              </div>

              {/* Contact (always shown) */}
              <div>
                <Label className="text-xs"><Phone className="w-3 h-3 inline mr-1" />Contact</Label>
                <Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Phone number" className="mt-1" />
              </div>

              {/* Department (only for admin role) */}
              {role === 'admin' && (
                <div>
                  <Label className="text-xs">Department</Label>
                  <Select value={form.departmentId} onValueChange={v => setForm({ ...form, departmentId: v, doctorId: '' })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.icon} {d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Doctor (admin picks, doctor is pre-selected) */}
              {role === 'admin' && (
                <div>
                  <Label className="text-xs"><Stethoscope className="w-3 h-3 inline mr-1" />Doctor</Label>
                  <Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })} disabled={!form.departmentId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={form.departmentId ? "Select doctor" : "Select dept first"} /></SelectTrigger>
                    <SelectContent>
                      {doctors.filter(d => d.department_id === form.departmentId).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name} ({d.specialty})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Appointment type */}
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consultation">Consultation</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Lab Review">Lab Review</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-1.5 text-xs"><Calendar className="w-3.5 h-3.5" />Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1" required />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-xs"><Clock className="w-3.5 h-3.5" />Time</Label>
                <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="mt-1" required />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" />Notes</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" className="mt-1" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button type="submit" disabled={submitting} className="gradient-medical text-primary-foreground hover:opacity-90">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {submitting ? 'Booking...' : 'Book Appointment'}
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-card-foreground">
            {role === 'doctor' ? 'My Upcoming Appointments' : 'Upcoming Appointments'}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {displayAppointments.filter(a => a.status === 'Scheduled').length} scheduled
          </Badge>
        </div>
        <div className="divide-y divide-border overflow-y-auto max-h-[600px]">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-medical-blue" /></div>
          ) : displayAppointments.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No upcoming appointments.</div>
          ) : displayAppointments.map((apt, i) => (
            <div key={apt.id}>
              <button
                className="w-full p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
                onClick={() => setExpandedId(expandedId === apt.id ? null : apt.id)}
              >
                <div className="w-10 h-10 rounded-lg bg-medical-blue-light flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-medical-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-card-foreground">{apt.patientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {role === 'admin' && <>{apt.doctorName} · </>}{apt.type} · Token: {apt.tokenNo}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium text-card-foreground">{apt.date}</div>
                  <div className="text-xs text-muted-foreground">{apt.time}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusColors[apt.status] || 'bg-muted text-muted-foreground'}`}>
                  {apt.status}
                </span>
                {expandedId === apt.id ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </button>

              <AnimatePresence>
                {expandedId === apt.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border/50 bg-muted/20">
                    <div className="px-6 py-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Patient</p>
                        <p className="font-medium">{apt.patientName}</p>
                      </div>
                      {apt.contact && (
                        <div>
                          <p className="text-xs text-muted-foreground">Contact</p>
                          <p className="font-medium">{apt.contact}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Doctor</p>
                        <p className="font-medium">{apt.doctorName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Appointment Type</p>
                        <p className="font-medium">{apt.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date & Time</p>
                        <p className="font-medium">{apt.date} {apt.time && `at ${apt.time}`}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Token No.</p>
                        <p className="font-medium">{apt.tokenNo}</p>
                      </div>
                      {apt.notes && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <p className="font-medium">{apt.notes}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
