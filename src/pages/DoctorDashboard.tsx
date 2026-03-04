import React, { useState, useEffect, useRef, useCallback } from 'react';
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
// ─── Lab Report View Modal (with file viewer) ───────────────────────────────────
function LabReportModal({ lab, onClose }: { lab: any; onClose: () => void }) {
  const flagColor = lab.flag === 'Critical' ? 'text-red-600' : lab.flag === 'Abnormal' ? 'text-amber-600' : 'text-green-600';
  const isPdf = lab.reportUrl?.toLowerCase().includes('.pdf');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
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

          {/* Uploaded Report File */}
          {lab.reportUrl && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground font-medium mb-2">Uploaded Report</p>
              {isPdf ? (
                <a href={lab.reportUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 transition-colors text-sm font-medium">
                  <FileText className="w-5 h-5" />
                  Open PDF Report
                </a>
              ) : (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src={lab.reportUrl} alt={`${lab.testName} report`}
                    className="w-full object-contain max-h-80 bg-black/5" />
                  <div className="p-2 flex justify-end">
                    <a href={lab.reportUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Open full size
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
          {!lab.reportUrl && (
            <div className="p-4 rounded-lg border border-dashed border-border text-center">
              <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-1 opacity-40" />
              <p className="text-xs text-muted-foreground">No report file uploaded</p>
            </div>
          )}
        </div>
        <Button onClick={onClose} className="w-full mt-5 gradient-medical text-primary-foreground">Close</Button>
      </motion.div>
    </div>
  );
}

// ─── Department-Specific Field Config ──────────────────────────────────────
const DEPT_FIELDS: Record<string, { vitalsExtra: { key: string; label: string; placeholder: string; unit: string }[], labSuggestions: string[], assessments: { key: string; label: string; type: string; options?: string[] }[] }> = {
  'Cardiology': {
    vitalsExtra: [
      { key: 'troponin', label: 'Troponin I (ng/mL)', placeholder: '0.04', unit: 'ng/mL' },
      { key: 'ck_mb', label: 'CK-MB (U/L)', placeholder: '25', unit: 'U/L' },
      { key: 'bnp', label: 'BNP (pg/mL)', placeholder: '100', unit: 'pg/mL' },
    ],
    labSuggestions: ['ECG', 'Echocardiogram', 'Troponin I', 'CK-MB', 'BNP', 'Lipid Profile', 'Chest X-Ray', 'Coronary Angiogram'],
    assessments: [
      { key: 'ecg_rhythm', label: 'ECG Rhythm', type: 'select', options: ['Normal Sinus Rhythm', 'Atrial Fibrillation', 'ST Elevation (STEMI)', 'ST Depression', 'LBBB', 'Heart Block', 'VT/VF'] },
      { key: 'ef_percent', label: 'Ejection Fraction (%)', type: 'number' },
      { key: 'nyha_class', label: 'NYHA Class', type: 'select', options: ['Class I', 'Class II', 'Class III', 'Class IV'] },
    ]
  },
  'Neurology / Neurosurgery': {
    vitalsExtra: [
      { key: 'gcs_score', label: 'GCS Score (3-15)', placeholder: '15', unit: '/15' },
      { key: 'pupils', label: 'Pupil Size (mm)', placeholder: '3', unit: 'mm' },
    ],
    labSuggestions: ['CT Brain', 'MRI Brain', 'EEG', 'CSF Analysis', 'D-Dimer', 'MRI Spine'],
    assessments: [
      { key: 'nih_stroke_scale', label: 'NIH Stroke Scale (0-42)', type: 'number' },
      { key: 'pupil_reactivity', label: 'Pupil Reactivity', type: 'select', options: ['Both Reactive', 'Left Fixed', 'Right Fixed', 'Both Fixed', 'Sluggish'] },
      { key: 'power_grade', label: 'Motor Power (0-5)', type: 'select', options: ['0 - No movement', '1 - Flicker', '2 - Gravity eliminated', '3 - Against gravity', '4 - Against resistance', '5 - Normal'] },
      { key: 'speech', label: 'Speech', type: 'select', options: ['Normal', 'Dysarthria', 'Aphasia', 'Mutism'] },
    ]
  },
  'Pulmonology / Chest Medicine': {
    vitalsExtra: [
      { key: 'respiratory_rate', label: 'Respiratory Rate (/min)', placeholder: '16', unit: '/min' },
      { key: 'peak_flow', label: 'Peak Flow (L/min)', placeholder: '400', unit: 'L/min' },
      { key: 'fev1', label: 'FEV1 (%)', placeholder: '80', unit: '%' },
    ],
    labSuggestions: ['Chest X-Ray', 'CT Chest', 'Spirometry', 'ABG', 'Sputum Culture', 'D-Dimer', 'HRCT Chest'],
    assessments: [
      { key: 'breath_sounds', label: 'Breath Sounds', type: 'select', options: ['Clear', 'Wheeze', 'Crackles', 'Rhonchi', 'Absent', 'Pleural Rub'] },
      { key: 'dyspnea_grade', label: 'Dyspnea (mMRC)', type: 'select', options: ['Grade 0 - None', 'Grade 1 - On hills', 'Grade 2 - Level walking', 'Grade 3 - 100m', 'Grade 4 - At rest'] },
      { key: 'cough_type', label: 'Cough Type', type: 'select', options: ['None', 'Dry', 'Productive', 'Hemoptysis', 'Night cough'] },
    ]
  },
  'Nephrology': {
    vitalsExtra: [
      { key: 'urine_output_ml', label: 'Urine Output (mL/24h)', placeholder: '1500', unit: 'mL/24h' },
      { key: 'weight_kg', label: 'Body Weight (kg)', placeholder: '70', unit: 'kg' },
    ],
    labSuggestions: ['Serum Creatinine', 'BUN', 'eGFR', 'Urine Routine', 'Urine Culture', 'Serum Electrolytes', 'Urine Protein:Creatinine Ratio'],
    assessments: [
      { key: 'edema_grade', label: 'Pedal Edema', type: 'select', options: ['None', '+1 (Mild)', '+2 (Moderate)', '+3 (Severe)', '+4 (Pitting)'] },
      { key: 'dialysis_session', label: 'Dialysis Session', type: 'select', options: ['Not Required', 'HD Today', 'PD Today', 'CRRT', 'Planned'] },
      { key: 'fluid_balance', label: 'Fluid Balance', type: 'select', options: ['Balanced', 'Positive 500mL', 'Positive 1L', 'Positive 2L', 'Negative'] },
    ]
  },
  'Obstetrics & Gynaecology': {
    vitalsExtra: [
      { key: 'fhr', label: 'Fetal Heart Rate (bpm)', placeholder: '140', unit: 'bpm' },
      { key: 'fundal_height', label: 'Fundal Height (cm)', placeholder: '28', unit: 'cm' },
    ],
    labSuggestions: ['USG Obstetric', 'HbA1c', 'CBC', 'Urine Protein', 'Coagulation Profile', 'Pap Smear'],
    assessments: [
      { key: 'gestational_age', label: 'Gestational Age (weeks)', type: 'number' },
      { key: 'presentation', label: 'Fetal Presentation', type: 'select', options: ['Cephalic', 'Breech', 'Transverse', 'Oblique'] },
      { key: 'cervical_os', label: 'Cervical Os', type: 'select', options: ['Closed', '1-2 cm', '3-4 cm', '5-6 cm', 'Fully Dilated', 'Not Applicable'] },
    ]
  },
  'Orthopaedics': {
    vitalsExtra: [
      { key: 'pain_score', label: 'Pain Score (VAS 0-10)', placeholder: '5', unit: '/10' },
    ],
    labSuggestions: ['X-Ray', 'MRI Joint', 'CT Bone', 'Bone Density (DEXA)', 'ESR', 'CRP', 'Uric Acid'],
    assessments: [
      { key: 'affected_joint', label: 'Affected Area', type: 'select', options: ['Spine', 'Hip', 'Knee', 'Shoulder', 'Ankle', 'Wrist', 'Elbow', 'Other'] },
      { key: 'rom_status', label: 'Range of Motion', type: 'select', options: ['Full', 'Restricted Mildly', 'Restricted Moderately', 'Severely Restricted', 'No Movement'] },
      { key: 'weight_bearing', label: 'Weight Bearing', type: 'select', options: ['Full', 'Partial', 'Non-Weight Bearing', 'Bed Rest'] },
    ]
  },
  'Paediatrics': {
    vitalsExtra: [
      { key: 'weight_kg', label: 'Weight (kg)', placeholder: '20', unit: 'kg' },
      { key: 'height_cm', label: 'Height (cm)', placeholder: '110', unit: 'cm' },
    ],
    labSuggestions: ['CBC', 'Blood Culture', 'Chest X-Ray', 'Urine Routine', 'Dengue NS1', 'Malaria Antigen', 'Widal Test'],
    assessments: [
      { key: 'wfa_percentile', label: 'Weight-for-Age Percentile', type: 'select', options: ['Normal (>25th)', 'Mild SAM (15-25th)', 'Moderate SAM (3-15th)', 'Severe SAM (<3rd)'] },
      { key: 'fontanelle', label: 'Fontanelle (if infant)', type: 'select', options: ['N/A', 'Normal', 'Bulging', 'Sunken', 'Closed'] },
      { key: 'dehydration', label: 'Dehydration Status', type: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
    ]
  },
  'Psychiatry / Behavioural Sciences': {
    vitalsExtra: [],
    labSuggestions: ['CBC', 'LFT', 'Thyroid Profile', 'Serum Lithium', 'Clozapine Level', 'EEG'],
    assessments: [
      { key: 'phq9_score', label: 'PHQ-9 Score (0-27)', type: 'number' },
      { key: 'mse_affect', label: 'Affect (Mental State)', type: 'select', options: ['Euthymic', 'Depressed', 'Anxious', 'Elated', 'Labile', 'Blunted', 'Flat'] },
      { key: 'insight', label: 'Insight', type: 'select', options: ['Full', 'Partial', 'None'] },
      { key: 'suicidality', label: 'Suicidal Ideation', type: 'select', options: ['None', 'Passive Ideation', 'Active Ideation', 'Plan present', 'Attempt'] },
    ]
  },
  'ENT (Ear, Nose & Throat)': {
    vitalsExtra: [],
    labSuggestions: ['Audiogram', 'Tympanogram', 'CT Paranasal Sinus', 'Nasal Endoscopy', 'Throat Swab Culture', 'Laryngoscopy'],
    assessments: [
      { key: 'hearing_loss', label: 'Hearing Loss', type: 'select', options: ['None', 'Mild (26-40 dB)', 'Moderate (41-60 dB)', 'Severe (61-80 dB)', 'Profound (>81 dB)'] },
      { key: 'vertigo_type', label: 'Vertigo', type: 'select', options: ['None', 'BPPV', 'Menieres', 'Labyrinthitis', 'Central', 'Other'] },
      { key: 'tympanic_membrane', label: 'Tympanic Membrane', type: 'select', options: ['Intact', 'Perforated', 'Retracted', 'Bulging', 'Scarred'] },
      { key: 'nasal_septum', label: 'Nasal Septum', type: 'select', options: ['Midline', 'Deviated Left', 'Deviated Right', 'Perforated'] },
    ]
  },
  'Ophthalmology': {
    vitalsExtra: [
      { key: 'iop_right', label: 'IOP Right Eye (mmHg)', placeholder: '15', unit: 'mmHg' },
      { key: 'iop_left', label: 'IOP Left Eye (mmHg)', placeholder: '15', unit: 'mmHg' },
    ],
    labSuggestions: ['OCT Macula', 'Visual Field Test', 'Fundus Photography', 'Fluorescein Angiography', 'Ultrasound B-Scan'],
    assessments: [
      { key: 'va_right', label: 'Visual Acuity Right', type: 'select', options: ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'CF', 'HM', 'PL', 'NPL'] },
      { key: 'va_left', label: 'Visual Acuity Left', type: 'select', options: ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'CF', 'HM', 'PL', 'NPL'] },
      { key: 'lens_status', label: 'Lens', type: 'select', options: ['Clear', 'Early Cataract', 'Mature Cataract', 'IOL in situ', 'Aphakia'] },
    ]
  },
};

// ─── Add Data Panel ──────────────────────────────────────────────────────────
function AddDataPanel({ patient, department, onRefresh, onClose }: { patient: Patient; department: string; onRefresh: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<'vitals' | 'rx' | 'lab' | 'assess'>('vitals');
  const [submitting, setSubmitting] = useState(false);

  const deptConfig = DEPT_FIELDS[department] || DEPT_FIELDS['Cardiology'];

  const [vitals, setVitals] = useState({ bp_systolic: '', bp_diastolic: '', sugar: '', temperature: '', oxygen: '', heart_rate: '' });
  const [deptVitals, setDeptVitals] = useState<Record<string, string>>({});
  const [assessment, setAssessment] = useState<Record<string, string>>({});
  const [rx, setRx] = useState({ medicine: '', dosage: '', frequency: '', start_date: new Date().toISOString().slice(0, 10) });
  const [lab, setLab] = useState({ test_name: '', value: '', normal_range: '', flag: 'Normal', result: '' });
  const [labFile, setLabFile] = useState<File | null>(null);
  const [labFilePreview, setLabFilePreview] = useState<string | null>(null);

  const submitVitals = async () => {
    if (!vitals.bp_systolic || !vitals.bp_diastolic) { toast.error('BP is required'); return; }
    setSubmitting(true);
    try {
      const extras = Object.entries(deptVitals).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');
      const assessmentStr = Object.entries(assessment).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');
      const { error } = await (supabase as any).from('vitals').insert({
        patient_id: patient.id,
        bp_systolic: parseInt(vitals.bp_systolic),
        bp_diastolic: parseInt(vitals.bp_diastolic),
        sugar: vitals.sugar ? parseFloat(vitals.sugar) : null,
        temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
        oxygen: vitals.oxygen ? parseFloat(vitals.oxygen) : null,
        heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate) : null,
        notes: [extras, assessmentStr].filter(Boolean).join(' | ') || null,
      });
      if (error) throw error;
      toast.success('Vitals recorded successfully');
      setVitals({ bp_systolic: '', bp_diastolic: '', sugar: '', temperature: '', oxygen: '', heart_rate: '' });
      setDeptVitals({});
      setAssessment({});
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
      setRx({ medicine: '', dosage: '', frequency: '', start_date: new Date().toISOString().slice(0, 10) });
      onRefresh();
    } catch (e: any) { toast.error(e.message || 'Failed to add prescription'); }
    finally { setSubmitting(false); }
  };

  const submitLab = async () => {
    if (!lab.test_name) { toast.error('Test name is required'); return; }
    setSubmitting(true);
    try {
      // Upload file to Supabase Storage if one is selected
      let reportUrl: string | null = null;
      if (labFile) {
        const ext = labFile.name.split('.').pop();
        const path = `${patient.id}/${Date.now()}_${lab.test_name.replace(/\s+/g, '_')}.${ext}`;
        const { data: uploadData, error: uploadError } = await (supabase as any).storage
          .from('lab-reports')
          .upload(path, labFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = (supabase as any).storage.from('lab-reports').getPublicUrl(path);
        reportUrl = urlData?.publicUrl || null;
      }

      const { error } = await (supabase as any).from('lab_reports').insert({
        patient_id: patient.id,
        test_name: lab.test_name,
        date: new Date().toISOString().slice(0, 10),
        value: lab.value || null,
        normal_range: lab.normal_range || null,
        flag: lab.flag !== 'Normal' ? lab.flag : null,
        result: lab.result || null,
        status: 'Completed',
        report_url: reportUrl,
      });
      if (error) throw error;
      toast.success(labFile ? 'Lab report & file uploaded!' : 'Lab report added');
      setLab({ test_name: '', value: '', normal_range: '', flag: 'Normal', result: '' });
      setLabFile(null);
      setLabFilePreview(null);
      onRefresh();
    } catch (e: any) { toast.error(e.message || 'Failed to add lab report'); }
    finally { setSubmitting(false); }
  };

  const inputClass = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
      className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="w-full max-w-md h-full bg-card shadow-2xl flex flex-col overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div>
            <h3 className="text-lg font-bold text-card-foreground">Add Patient Data</h3>
            <p className="text-sm text-muted-foreground">{patient.name} · {patient.admissionNo}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{department}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-border overflow-x-auto">
          {[
            { key: 'vitals', label: 'Vitals', icon: <Activity className="w-4 h-4" /> },
            { key: 'assess', label: `${department.split(' ')[0]} Exam`, icon: <Stethoscope className="w-4 h-4" /> },
            { key: 'rx', label: 'Prescription', icon: <Pill className="w-4 h-4" /> },
            { key: 'lab', label: 'Lab Report', icon: <FlaskConical className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex-1 flex items-center justify-center gap-1 py-3 text-xs font-medium whitespace-nowrap px-2 transition-colors ${tab === t.key ? 'border-b-2 border-accent text-accent' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto pb-24">
          {tab === 'vitals' && (
            <>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Standard Vitals</p>
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
                  <Label>O₂ Saturation (%)</Label>
                  <input className={inputClass} type="number" placeholder="98" value={vitals.oxygen} onChange={e => setVitals(v => ({ ...v, oxygen: e.target.value }))} />
                </div>
                <div>
                  <Label>Heart Rate (bpm)</Label>
                  <input className={inputClass} type="number" placeholder="72" value={vitals.heart_rate} onChange={e => setVitals(v => ({ ...v, heart_rate: e.target.value }))} />
                </div>
              </div>
              {deptConfig.vitalsExtra.length > 0 && (
                <>
                  <p className="text-xs text-accent font-medium uppercase tracking-wide border-t border-border pt-3">{department} — Specific Parameters</p>
                  <div className="grid grid-cols-2 gap-3">
                    {deptConfig.vitalsExtra.map(f => (
                      <div key={f.key}>
                        <Label>{f.label}</Label>
                        <div className="relative">
                          <input className={inputClass} type="number" placeholder={f.placeholder} value={deptVitals[f.key] || ''} onChange={e => setDeptVitals(v => ({ ...v, [f.key]: e.target.value }))} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{f.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'assess' && (
            <>
              <p className="text-xs text-accent font-medium uppercase tracking-wide">{department} — Clinical Assessment</p>
              <div className="space-y-3">
                {deptConfig.assessments.map(f => (
                  <div key={f.key}>
                    <Label>{f.label}</Label>
                    {f.type === 'select' ? (
                      <select className={inputClass} value={assessment[f.key] || ''} onChange={e => setAssessment(v => ({ ...v, [f.key]: e.target.value }))}>
                        <option value="">Select...</option>
                        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input className={inputClass} type="number" value={assessment[f.key] || ''} onChange={e => setAssessment(v => ({ ...v, [f.key]: e.target.value }))} />
                    )}
                  </div>
                ))}
                {deptConfig.assessments.length === 0 && <p className="text-sm text-muted-foreground">No department-specific assessments defined.</p>}
              </div>
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
                <select className={inputClass} value={rx.frequency} onChange={e => setRx(v => ({ ...v, frequency: e.target.value }))}>
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
                <select className={inputClass} value={lab.flag} onChange={e => setLab(v => ({ ...v, flag: e.target.value }))}>
                  <option>Normal</option>
                  <option>Abnormal</option>
                  <option>Critical</option>
                </select>
              </div>
              <div>
                <Label>Interpretation / Notes</Label>
                <textarea className={inputClass + ' h-20 resize-none'} placeholder="Optional interpretation or radiologist notes..." value={lab.result} onChange={e => setLab(v => ({ ...v, result: e.target.value }))} />
              </div>

              {/* File Upload */}
              <div>
                <Label>Upload Report (Image or PDF)</Label>
                <label className="mt-1 flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors relative">
                  {labFilePreview ? (
                    labFilePreview === 'pdf' ? (
                      <div className="flex flex-col items-center gap-1">
                        <FileText className="w-8 h-8 text-accent" />
                        <span className="text-xs text-accent font-medium truncate max-w-[200px]">{labFile?.name}</span>
                        <span className="text-xs text-muted-foreground">PDF selected</span>
                      </div>
                    ) : (
                      <img src={labFilePreview} alt="preview" className="h-full w-full object-contain rounded-xl p-1" />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Plus className="w-6 h-6 text-muted-foreground opacity-50" />
                      <span className="text-xs text-muted-foreground">Click to upload image or PDF</span>
                      <span className="text-xs text-muted-foreground opacity-60">JPG, PNG, WEBP, PDF · Max 10MB</span>
                    </div>
                  )}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,application/pdf"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setLabFile(f);
                      if (f.type === 'application/pdf') {
                        setLabFilePreview('pdf');
                      } else {
                        const reader = new FileReader();
                        reader.onload = ev => setLabFilePreview(ev.target?.result as string);
                        reader.readAsDataURL(f);
                      }
                    }} />
                </label>
                {labFile && (
                  <button onClick={() => { setLabFile(null); setLabFilePreview(null); }}
                    className="mt-1 text-xs text-red-500 hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Remove file
                  </button>
                )}
              </div>

            </>
          )}
        </div>

        {/* ── Sticky Save Footer ── */}
        <div className="sticky bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <Button onClick={onClose} variant="outline" className="flex-1 text-muted-foreground" disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={tab === 'vitals' ? submitVitals : tab === 'assess' ? submitVitals : tab === 'rx' ? submitRx : submitLab}
            disabled={submitting}
            className="flex-1 gradient-medical text-primary-foreground font-semibold">
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" />
                {tab === 'vitals' ? 'Save Vitals' :
                  tab === 'assess' ? 'Save Assessment' :
                    tab === 'rx' ? 'Add Prescription' :
                      labFile ? 'Upload & Save Report' : 'Add Lab Report'}
              </>
            )}
          </Button>
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
  const [doctorDept, setDoctorDept] = useState('Internal Medicine / General Medicine');
  const [doctorDbId, setDoctorDbId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [appointmentCount, setAppointmentCount] = useState(0);

  const patientsRef = useRef<Patient[]>([]);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [emergencyAlert, setEmergencyAlert] = useState<{ patientName: string; message: string; admissionNo: string } | null>(null);

  useEffect(() => { fetchData(); }, []);

  // ── Realtime alert subscription (runs after fetchData sets patients) ──────
  useEffect(() => {
    const channel = (supabase as any)
      .channel('doctor-patient-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload: any) => {
          const newAlert = payload.new;
          const matchedPatient = patientsRef.current.find(p => p.id === newAlert.patient_id);
          if (!matchedPatient) return;

          // Show full-screen emergency overlay
          setEmergencyAlert({
            patientName: matchedPatient.name,
            admissionNo: matchedPatient.admissionNo,
            message: newAlert.message || `Emergency from ${matchedPatient.name}!`,
          });

          // Start continuous alarm using Web Audio API
          const playAlarmCycle = () => {
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const beep = (freq: number, t: number, dur: number) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.connect(g);
                g.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'square';
                g.gain.setValueAtTime(0.5, ctx.currentTime + t);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
                osc.start(ctx.currentTime + t);
                osc.stop(ctx.currentTime + t + dur + 0.05);
              };
              beep(1047, 0.0, 0.15);
              beep(1047, 0.2, 0.15);
              beep(784, 0.4, 0.35);
            } catch { /* blocked */ }
          };
          playAlarmCycle();
          alarmIntervalRef.current = setInterval(playAlarmCycle, 2000);

          // Add to alerts list
          setAlerts(prev => [{
            id: newAlert.id,
            patientId: newAlert.patient_id,
            patientName: matchedPatient.name,
            type: newAlert.type,
            message: newAlert.message,
            timestamp: newAlert.created_at,
            acknowledged: false,
          }, ...prev]);
        }
      )
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, []);

  // Keep patientsRef in sync
  useEffect(() => { patientsRef.current = patients; }, [patients]);

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

      // If real user, filter to their patients and fetch department
      if (user?.role === 'doctor' && user?.id) {
        const { data: doctorRow } = await (supabase as any)
          .from('doctors')
          .select('id, departments(name)')
          .eq('user_id', user.id)
          .maybeSingle();

        if (doctorRow) {
          query = query.eq('assigned_doctor_id', doctorRow.id);
          setDoctorDbId(doctorRow.id);
          if (doctorRow.departments?.name) setDoctorDept(doctorRow.departments.name);
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
          reportUrl: lab.report_url || null,
        })),
        riskScores: { treatmentFailure: 35, diseaseProgression: 55, drugSideEffect: 20, readmission: 40 },
      }));

      setPatients(transformed);
      if (transformed.length > 0 && !selectedPatient) setSelectedPatient(transformed[0]);

      // Alerts — only for this doctor's patients
      const patientIds = transformed.map(p => p.id);
      const { data: alertsData } = patientIds.length > 0
        ? await (supabase as any)
          .from('alerts')
          .select('*')
          .in('patient_id', patientIds)
          .order('created_at', { ascending: false })
        : { data: [] };

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

      // Appointment count for today
      if (doctorRow?.id) {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase.from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', doctorRow.id)
          .eq('appointment_date', today);
        setAppointmentCount(count || 0);
      }
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
      const SUPABASE_URL = 'https://weafydetjbnyuxfrxovk.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYWZ5ZGV0amJueXV4ZnJ4b3ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzA2MDcsImV4cCI6MjA4ODEwNjYwN30.e6JqupZSTxyB8NZr7v6VU74-6P4FbHU0NNPACkdJKY8';
      const latestVitals = selectedPatient.vitals.length > 0 ? selectedPatient.vitals[selectedPatient.vitals.length - 1] : {};
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-treatment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          type: 'risk_analysis',
          department: doctorDept,
          patientData: {
            name: selectedPatient.name,
            age: selectedPatient.age,
            gender: selectedPatient.gender,
            symptoms: selectedPatient.symptoms,
            diagnosis: selectedPatient.diagnosis,
            vitals: latestVitals,
            allVitals: selectedPatient.vitals.slice(-5),
            prescriptions: selectedPatient.prescriptions.filter((rx: any) => rx.status === 'Active'),
            labReports: selectedPatient.labReports,
            riskScores: selectedPatient.riskScores,
          },
        }),
      });
      const data = await response.json();
      if (data.error) toast.error(data.error);
      else {
        setAiResult(data.result);
        toast.success(`AI analysis complete${data.source === 'gemini' ? ' (Gemini AI)' : ' (Clinical Rules Engine)'}`);
      }
    } catch (e: any) {
      toast.error('Failed to reach AI service. Check your connection.');
    } finally {
      setAiLoading(false);
    }
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

      {/* ── FULL-SCREEN EMERGENCY ALERT OVERLAY ── */}
      <AnimatePresence>
        {emergencyAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)' }}
          >
            {/* Pulsing red background glow */}
            <motion.div
              animate={{ scale: [1, 1.04, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute inset-0 bg-red-600/20"
            />

            <motion.div
              initial={{ scale: 0.7, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.7, y: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative bg-gradient-to-br from-red-900 via-red-800 to-red-900 rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-8 border-2 border-red-500"
              style={{ boxShadow: '0 0 80px rgba(239,68,68,0.7), 0 0 200px rgba(239,68,68,0.3)' }}
            >
              {/* Blinking icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-24 h-24 rounded-full bg-red-500/30 border-4 border-red-400 flex items-center justify-center"
                >
                  <span className="text-5xl">🚨</span>
                </motion.div>
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-3xl font-black text-white tracking-tight">EMERGENCY ALERT</h2>
                <div className="bg-red-950/60 rounded-2xl p-4 border border-red-500/40">
                  <p className="text-red-200 text-sm font-semibold uppercase tracking-widest mb-1">Patient</p>
                  <p className="text-white text-2xl font-bold">{emergencyAlert.patientName}</p>
                  <p className="text-red-300 text-sm mt-1">Admission No: {emergencyAlert.admissionNo}</p>
                </div>
                <div className="bg-black/40 rounded-xl p-4 border border-red-700/40">
                  <p className="text-red-100 text-base leading-relaxed">{emergencyAlert.message}</p>
                </div>
                <p className="text-red-300 text-xs opacity-70">{new Date().toLocaleTimeString()}</p>
              </div>

              <button
                onClick={() => {
                  // Stop alarm
                  if (alarmIntervalRef.current) {
                    clearInterval(alarmIntervalRef.current);
                    alarmIntervalRef.current = null;
                  }
                  setEmergencyAlert(null);
                  toast.success('Alert acknowledged. Please attend to the patient immediately.');
                }}
                className="mt-8 w-full bg-white text-red-700 font-black text-lg py-4 rounded-2xl hover:bg-red-50 active:scale-95 transition-all shadow-lg"
              >
                ✅ Acknowledge &amp; Silence Alarm
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Patients', value: patients.length, icon: <Users className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600' },
          { label: 'Critical', value: criticalCount, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-100 text-red-600' },
          { label: 'Active Alerts', value: activeAlerts.length, icon: <Activity className="w-5 h-5" />, color: 'bg-amber-100 text-amber-600' },
          { label: "Today's Appointments", value: appointmentCount, icon: <Clock className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-600' },
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
          <div className="p-4 border-b border-border space-y-2">
            <h3 className="font-semibold text-card-foreground">My Patients ({patients.length})</h3>
            <input
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
              placeholder="🔍 Search by name or ID..."
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {patients.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">No patients assigned to you.</div>
            )}
            {patients
              .filter(p => !patientSearch || p.name?.toLowerCase().includes(patientSearch.toLowerCase()) || p.admissionNo?.toLowerCase().includes(patientSearch.toLowerCase()))
              .map(patient => (
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
              <div className="p-5 border-b border-border">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-xl font-bold text-card-foreground">{selectedPatient.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {selectedPatient.admissionNo} · Token: {selectedPatient.tokenNo} · Admitted: {selectedPatient.admissionDate}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedPatient.contact}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status dropdown */}
                    <select
                      value={selectedPatient.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        await supabase.from('patients').update({ status: newStatus }).eq('id', selectedPatient.id);
                        setSelectedPatient(p => p ? { ...p, status: newStatus as any } : p);
                        setPatients(ps => ps.map(p => p.id === selectedPatient.id ? { ...p, status: newStatus as any } : p));
                        toast.success(`Status updated to ${newStatus}`);
                      }}
                      className={`text-xs px-2 py-1.5 rounded-full font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent ${statusColor[selectedPatient.status] || 'bg-muted text-muted-foreground'}`}
                    >
                      <option value="Admitted">Admitted</option>
                      <option value="Under Observation">Under Observation</option>
                      <option value="Critical">Critical</option>
                      <option value="Stable">Stable</option>
                      <option value="Discharged">Discharged</option>
                    </select>
                    <Button size="sm" onClick={() => setShowAddData(true)} className="gradient-medical text-primary-foreground text-xs gap-1">
                      <Plus className="w-3.5 h-3.5" /> Add Data
                    </Button>
                  </div>
                </div>
                {/* Diagnosis inline editor */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    defaultValue={selectedPatient.diagnosis || ''}
                    key={selectedPatient.id}
                    placeholder="Type diagnosis here and click Save..."
                    className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    id="diagnosis-input"
                  />
                  <Button size="sm" variant="outline" className="text-xs shrink-0"
                    onClick={async () => {
                      const val = (document.getElementById('diagnosis-input') as HTMLInputElement)?.value;
                      await supabase.from('patients').update({ diagnosis: val }).eq('id', selectedPatient.id);
                      setSelectedPatient(p => p ? { ...p, diagnosis: val } : p);
                      toast.success('Diagnosis saved ✓');
                    }}>
                    Save Dx
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
                  <TabsContent value="ai" className="mt-4 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button onClick={runAiAnalysis} disabled={aiLoading} className="gradient-medical text-primary-foreground hover:opacity-90 gap-2">
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                        {aiLoading ? 'Analysing Patient Data...' : '🧠 Run AI Risk Analysis'}
                      </Button>
                      {aiResult && <PDFGenerator patientName={selectedPatient.name} type="Case Summary" data={selectedPatient} />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Analyses all vitals, active prescriptions, lab results and diagnosis using AI to generate a clinical risk report.
                    </p>

                    {aiLoading && (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-12 h-12 rounded-full gradient-medical flex items-center justify-center animate-pulse">
                          <Brain className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-sm text-muted-foreground animate-pulse">Processing clinical data...</p>
                      </div>
                    )}

                    {aiResult && !aiLoading && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        {/* Parse risk level line */}
                        {(() => {
                          const lines = aiResult.split('\n').filter(l => l.trim());
                          const riskLine = lines.find(l => l.toLowerCase().includes('risk level') || l.match(/🔴|🟠|🟡|🟢/));
                          const isHigh = riskLine?.toLowerCase().includes('critical') || riskLine?.includes('🔴');
                          const isMod = riskLine?.toLowerCase().includes('high') || riskLine?.includes('🟠');
                          const riskColor = isHigh ? 'bg-red-50 border-red-200 text-red-800' : isMod ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800';
                          return (
                            <>
                              {riskLine && (
                                <div className={`p-3 rounded-xl border font-semibold text-sm ${riskColor}`}>
                                  {riskLine.replace(/\*\*/g, '')}
                                </div>
                              )}
                              <div className="p-4 rounded-xl bg-card border border-border shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <Brain className="w-4 h-4 text-accent" />
                                  <span className="text-sm font-bold text-card-foreground">AI Clinical Analysis</span>
                                  <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">Analysis Complete</Badge>
                                </div>
                                <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none">
                                  {aiResult.replace(/\*\*/g, '').replace(/^[🔴🟠🟡🟢].*\n/, '')}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </motion.div>
                    )}

                    {/* Static risk scores still shown below */}
                    <div className="mt-2">
                      <RiskPanel scores={selectedPatient.riskScores} />
                    </div>
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
          <AddDataPanel patient={selectedPatient} department={doctorDept} onRefresh={() => { fetchData(); setShowAddData(false); }} onClose={() => setShowAddData(false)} />
        )}
      </AnimatePresence>

      {/* Lab Report Modal */}
      {viewingLab && <LabReportModal lab={viewingLab} onClose={() => setViewingLab(null)} />}
    </div>
  );
}

function DoctorAppointments() {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (user?.id) {
      (supabase as any).from('doctors').select('id').eq('user_id', user.id).maybeSingle()
        .then(({ data }: any) => { if (data?.id) setDoctorId(data.id); });
    }
  }, [user]);

  return <AppointmentBooking role="doctor" doctorId={doctorId} />;
}

export default function DoctorDashboard() {
  const location = useLocation();
  if (location.pathname === '/doctor/appointments') return <DashboardLayout><DoctorAppointments /></DashboardLayout>;
  return <DashboardLayout><DoctorMain /></DashboardLayout>;
}
