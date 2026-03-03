import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Hash, User, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface Appointment {
  id: string;
  patientName: string;
  doctor: string;
  date: string;
  time: string;
  type: string;
  tokenNo: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Follow-up';
  notes?: string;
}

const statusColors: Record<string, string> = {
  Scheduled: 'bg-medical-blue-light text-medical-blue',
  Completed: 'bg-risk-stable-bg text-risk-stable',
  Cancelled: 'bg-risk-critical-bg text-risk-critical',
  'Follow-up': 'bg-risk-moderate-bg text-risk-moderate',
};

export default function AppointmentBooking({ role = 'admin' }: { role?: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ patient: '', doctor: '', date: '', time: '', type: 'Consultation', notes: '' });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (name)
        `)
        .order('appointment_date', { ascending: true });

      if (error) throw error;

      const transformed: Appointment[] = (data || []).map(a => ({
        id: a.id,
        patientName: (a.patients as any)?.name || 'Unknown',
        doctor: 'Dr. Priya Sharma', // Placeholder
        date: a.appointment_date,
        time: a.appointment_time || '',
        type: a.type,
        tokenNo: a.token_no || 'TKN-XXXX',
        status: a.status as any,
        notes: a.notes || ''
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
      // Find patient by name (demo fallback) or use first patient
      const { data: pData } = await supabase.from('patients').select('id').ilike('name', `%${form.patient}%`).limit(1);
      const patientId = pData && pData.length > 0 ? pData[0].id : null;

      if (!patientId) {
        toast.error('Patient not found. Please enter a valid patient name.');
        setSubmitting(false);
        return;
      }

      const tokenNo = `TKN-${String(Date.now()).slice(-4)}`;

      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientId,
          appointment_date: form.date,
          appointment_time: form.time,
          type: form.type,
          notes: form.notes,
          token_no: tokenNo,
          status: 'Scheduled'
        });

      if (error) throw error;

      toast.success(`Appointment booked! Token: ${tokenNo}`);
      setForm({ patient: '', doctor: '', date: '', time: '', type: 'Consultation', notes: '' });
      fetchAppointments();
    } catch (e) {
      console.error('Error booking appointment:', e);
      toast.error('Failed to book appointment');
    }
    setSubmitting(false);
  };

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
              <div>
                <Label className="flex items-center gap-1.5 text-xs"><User className="w-3.5 h-3.5" />Patient Name</Label>
                <Input value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })} placeholder="Patient name" className="mt-1" required />
                <p className="text-[10px] text-muted-foreground mt-1">Must match an existing patient name for this demo.</p>
              </div>
              <div>
                <Label className="text-xs">Doctor</Label>
                <Select value={form.doctor} onValueChange={v => setForm({ ...form, doctor: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. Priya Sharma">Dr. Priya Sharma</SelectItem>
                    <SelectItem value="Dr. Anil Verma">Dr. Anil Verma</SelectItem>
                    <SelectItem value="Dr. Kavitha Nair">Dr. Kavitha Nair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Appointment Type</Label>
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
          <h3 className="font-display font-semibold text-card-foreground">Upcoming Appointments</h3>
          <Badge variant="secondary" className="text-xs">
            {appointments.filter(a => a.status === 'Scheduled').length} scheduled
          </Badge>
        </div>
        <div className="divide-y divide-border overflow-y-auto max-h-[600px]">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-medical-blue" /></div>
          ) : appointments.map((apt, i) => (
            <motion.div key={apt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-medical-blue-light flex items-center justify-center">
                <Calendar className="w-5 h-5 text-medical-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-card-foreground">{apt.patientName}</div>
                <div className="text-xs text-muted-foreground">{apt.doctor} · {apt.type} · Token: {apt.tokenNo}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-card-foreground">{apt.date}</div>
                <div className="text-xs text-muted-foreground">{apt.time}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[apt.status]}`}>
                {apt.status}
              </span>
            </motion.div>
          ))}
          {!loading && appointments.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">No appointments found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
