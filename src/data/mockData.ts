// Mock data for CureSense platform

export interface Patient {
  id: string;
  admissionNo: string;
  tokenNo: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  contact: string;
  assignedDoctor: string;
  admissionDate: string;
  status: 'Admitted' | 'Under Observation' | 'Discharged' | 'Critical';
  symptoms: string[];
  diagnosis?: string;
  vitals: VitalRecord[];
  prescriptions: Prescription[];
  labReports: LabReport[];
  riskScores: RiskScores;
}

export interface VitalRecord {
  timestamp: string;
  bp: { systolic: number; diastolic: number };
  sugar: number;
  temperature: number;
  oxygen: number;
  heartRate: number;
}

export interface Prescription {
  id: string;
  medicine: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Completed' | 'Discontinued';
}

export interface LabReport {
  id: string;
  testName: string;
  date: string;
  status: 'Pending' | 'Completed';
  result?: string;
  normalRange?: string;
  value?: string;
  flag?: 'Normal' | 'Abnormal' | 'Critical';
}

export interface RiskScores {
  treatmentFailure: number;
  diseaseProgression: number;
  drugSideEffect: number;
  readmission: number;
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export const mockVitals: VitalRecord[] = [
  { timestamp: '2026-03-01 08:00', bp: { systolic: 130, diastolic: 85 }, sugar: 140, temperature: 99.2, oxygen: 96, heartRate: 82 },
  { timestamp: '2026-03-01 12:00', bp: { systolic: 135, diastolic: 88 }, sugar: 155, temperature: 99.8, oxygen: 95, heartRate: 88 },
  { timestamp: '2026-03-01 16:00', bp: { systolic: 128, diastolic: 82 }, sugar: 130, temperature: 99.0, oxygen: 97, heartRate: 78 },
  { timestamp: '2026-03-01 20:00', bp: { systolic: 140, diastolic: 90 }, sugar: 160, temperature: 100.2, oxygen: 94, heartRate: 92 },
  { timestamp: '2026-03-02 08:00', bp: { systolic: 138, diastolic: 87 }, sugar: 145, temperature: 100.5, oxygen: 93, heartRate: 90 },
  { timestamp: '2026-03-02 12:00', bp: { systolic: 132, diastolic: 84 }, sugar: 135, temperature: 99.5, oxygen: 96, heartRate: 80 },
];

export const mockPatients: Patient[] = [
  {
    id: 'p1',
    admissionNo: 'ADM001',
    tokenNo: 'TKN-0042',
    name: 'Rajesh Kumar',
    age: 55,
    gender: 'Male',
    contact: '+91 98765 43210',
    assignedDoctor: 'Dr. Priya Sharma',
    admissionDate: '2026-02-28',
    status: 'Admitted',
    symptoms: ['Persistent fever', 'Chest pain', 'Shortness of breath'],
    diagnosis: 'Suspected Pneumonia',
    vitals: mockVitals,
    prescriptions: [
      { id: 'rx1', medicine: 'Amoxicillin', dosage: '500mg', frequency: 'Every 8 hours', startDate: '2026-02-28', status: 'Active' },
      { id: 'rx2', medicine: 'Paracetamol', dosage: '650mg', frequency: 'Every 6 hours (SOS)', startDate: '2026-02-28', status: 'Active' },
      { id: 'rx3', medicine: 'Azithromycin', dosage: '250mg', frequency: 'Once daily', startDate: '2026-03-01', status: 'Active' },
    ],
    labReports: [
      { id: 'lab1', testName: 'Complete Blood Count', date: '2026-02-28', status: 'Completed', value: 'WBC: 14,500', normalRange: '4,500-11,000', flag: 'Abnormal' },
      { id: 'lab2', testName: 'Chest X-Ray', date: '2026-02-28', status: 'Completed', result: 'Bilateral infiltrates noted', flag: 'Abnormal' },
      { id: 'lab3', testName: 'Blood Culture', date: '2026-03-01', status: 'Pending' },
      { id: 'lab4', testName: 'CRP', date: '2026-03-01', status: 'Completed', value: '48 mg/L', normalRange: '<10 mg/L', flag: 'Critical' },
    ],
    riskScores: { treatmentFailure: 35, diseaseProgression: 55, drugSideEffect: 20, readmission: 40 },
  },
  {
    id: 'p2',
    admissionNo: 'ADM002',
    tokenNo: 'TKN-0043',
    name: 'Meera Devi',
    age: 42,
    gender: 'Female',
    contact: '+91 87654 32109',
    assignedDoctor: 'Dr. Priya Sharma',
    admissionDate: '2026-03-01',
    status: 'Under Observation',
    symptoms: ['High blood sugar', 'Dizziness', 'Fatigue'],
    diagnosis: 'Diabetic Ketoacidosis',
    vitals: mockVitals.map(v => ({ ...v, sugar: v.sugar + 80, temperature: v.temperature - 1 })),
    prescriptions: [
      { id: 'rx4', medicine: 'Insulin Glargine', dosage: '20 units', frequency: 'Once daily at bedtime', startDate: '2026-03-01', status: 'Active' },
      { id: 'rx5', medicine: 'Metformin', dosage: '1000mg', frequency: 'Twice daily', startDate: '2026-03-01', status: 'Active' },
    ],
    labReports: [
      { id: 'lab5', testName: 'HbA1c', date: '2026-03-01', status: 'Completed', value: '11.2%', normalRange: '<5.7%', flag: 'Critical' },
      { id: 'lab6', testName: 'Blood Glucose Fasting', date: '2026-03-02', status: 'Completed', value: '310 mg/dL', normalRange: '70-100 mg/dL', flag: 'Critical' },
    ],
    riskScores: { treatmentFailure: 25, diseaseProgression: 70, drugSideEffect: 15, readmission: 60 },
  },
  {
    id: 'p3',
    admissionNo: 'ADM003',
    tokenNo: 'TKN-0044',
    name: 'Amit Singh',
    age: 68,
    gender: 'Male',
    contact: '+91 76543 21098',
    assignedDoctor: 'Dr. Priya Sharma',
    admissionDate: '2026-03-02',
    status: 'Critical',
    symptoms: ['Severe chest pain', 'Irregular heartbeat', 'Sweating'],
    diagnosis: 'Acute Myocardial Infarction',
    vitals: mockVitals.map(v => ({ ...v, bp: { systolic: v.bp.systolic + 20, diastolic: v.bp.diastolic + 15 }, heartRate: v.heartRate + 20, oxygen: v.oxygen - 4 })),
    prescriptions: [
      { id: 'rx6', medicine: 'Aspirin', dosage: '325mg', frequency: 'Immediately then 81mg daily', startDate: '2026-03-02', status: 'Active' },
      { id: 'rx7', medicine: 'Heparin', dosage: '5000 units', frequency: 'IV drip', startDate: '2026-03-02', status: 'Active' },
      { id: 'rx8', medicine: 'Nitroglycerin', dosage: '0.4mg', frequency: 'Sublingual PRN', startDate: '2026-03-02', status: 'Active' },
    ],
    labReports: [
      { id: 'lab7', testName: 'Troponin I', date: '2026-03-02', status: 'Completed', value: '8.5 ng/mL', normalRange: '<0.04 ng/mL', flag: 'Critical' },
      { id: 'lab8', testName: 'ECG', date: '2026-03-02', status: 'Completed', result: 'ST elevation in leads II, III, aVF', flag: 'Critical' },
    ],
    riskScores: { treatmentFailure: 60, diseaseProgression: 80, drugSideEffect: 45, readmission: 75 },
  },
];

export const mockAlerts: Alert[] = [
  { id: 'a1', patientId: 'p3', patientName: 'Amit Singh', type: 'critical', message: 'Oxygen saturation dropped below 90%. Immediate attention required.', timestamp: '2026-03-02 11:45', acknowledged: false },
  { id: 'a2', patientId: 'p1', patientName: 'Rajesh Kumar', type: 'warning', message: 'Fever not reducing within expected timeline. Temperature: 100.5°F', timestamp: '2026-03-02 10:30', acknowledged: false },
  { id: 'a3', patientId: 'p2', patientName: 'Meera Devi', type: 'warning', message: 'Blood sugar levels persistently elevated. Fasting glucose: 310 mg/dL', timestamp: '2026-03-02 09:15', acknowledged: true },
  { id: 'a4', patientId: 'p3', patientName: 'Amit Singh', type: 'critical', message: 'BP spike detected: 160/105 mmHg. Potential hypertensive crisis.', timestamp: '2026-03-02 08:00', acknowledged: false },
];
