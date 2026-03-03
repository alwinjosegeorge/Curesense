
-- Seed Patients
INSERT INTO public.patients (id, admission_no, token_no, name, age, gender, contact, admission_date, status, symptoms, diagnosis)
VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 'ADM001', 'TKN-0042', 'Rajesh Kumar', 55, 'Male', '+91 98765 43210', '2026-02-28', 'Admitted', '{"Persistent fever", "Chest pain", "Shortness of breath"}', 'Suspected Pneumonia'),
('f47ac10b-58cc-4372-a567-0e02b2c3d472', 'ADM002', 'TKN-0043', 'Meera Devi', 42, 'Female', '+91 87654 32109', '2026-03-01', 'Under Observation', '{"High blood sugar", "Dizziness", "Fatigue"}', 'Diabetic Ketoacidosis'),
('f47ac10b-58cc-4372-a567-0e02b2c3d473', 'ADM003', 'TKN-0044', 'Amit Singh', 68, 'Male', '+91 76543 21098', '2026-03-02', 'Critical', '{"Severe chest pain", "Irregular heartbeat", "Sweating"}', 'Acute Myocardial Infarction');

-- Seed Vitals for Rajesh Kumar (f47ac10b-58cc-4372-a567-0e02b2c3d471)
INSERT INTO public.vitals (patient_id, bp_systolic, bp_diastolic, sugar, temperature, oxygen, heart_rate, recorded_at)
VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 130, 85, 140, 99.2, 96, 82, '2026-03-01 08:00:00+00'),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 135, 88, 155, 99.8, 95, 88, '2026-03-01 12:00:00+00'),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 128, 82, 130, 99.0, 97, 78, '2026-03-01 16:00:00+00'),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 140, 90, 160, 100.2, 94, 92, '2026-03-01 20:00:00+00'),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 138, 87, 145, 100.5, 93, 90, '2026-03-02 08:00:00+00'),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 132, 84, 135, 99.5, 96, 80, '2026-03-02 12:00:00+00');

-- Seed Prescriptions
INSERT INTO public.prescriptions (patient_id, medicine, dosage, frequency, start_date, status)
VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 'Amoxicillin', '500mg', 'Every 8 hours', '2026-02-28', 'Active'),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 'Paracetamol', '650mg', 'Every 6 hours (SOS)', '2026-02-28', 'Active'),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 'Azithromycin', '250mg', 'Once daily', '2026-03-01', 'Active'),
('f47ac10b-58cc-4372-a567-0e02b2c3d472', 'Insulin Glargine', '20 units', 'Once daily at bedtime', '2026-03-01', 'Active'),
('f47ac10b-58cc-4372-a567-0e02b2c3d472', 'Metformin', '1000mg', 'Twice daily', '2026-03-01', 'Active'),
('f47ac10b-58cc-4372-a567-0e02b2c3d473', 'Aspirin', '325mg', 'Immediately then 81mg daily', '2026-03-02', 'Active'),
('f47ac10b-58cc-4372-a567-0e02b2c3d473', 'Heparin', '5000 units', 'IV drip', '2026-03-02', 'Active'),
('f47ac10b-58cc-4372-a567-0e02b2c3d473', 'Nitroglycerin', '0.4mg', 'Sublingual PRN', '2026-03-02', 'Active');

-- Seed Lab Reports
INSERT INTO public.lab_reports (patient_id, test_name, date, status, value, normal_range, flag, result)
VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 'Complete Blood Count', '2026-02-28', 'Completed', 'WBC: 14,500', '4,500-11,000', 'Abnormal', NULL),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 'Chest X-Ray', '2026-02-28', 'Completed', NULL, NULL, 'Abnormal', 'Bilateral infiltrates noted'),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 'Blood Culture', '2026-03-01', 'Pending', NULL, NULL, NULL, NULL),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 'CRP', '2026-03-01', 'Completed', '48 mg/L', '<10 mg/L', 'Critical', NULL),
('f47ac10b-58cc-4372-a567-0e02b2c3d472', 'HbA1c', '2026-03-01', 'Completed', '11.2%', '<5.7%', 'Critical', NULL),
('f47ac10b-58cc-4372-a567-0e02b2c3d472', 'Blood Glucose Fasting', '2026-03-02', 'Completed', '310 mg/dL', '70-100 mg/dL', 'Critical', NULL),
('f47ac10b-58cc-4372-a567-0e02b2c3d473', 'Troponin I', '2026-03-02', 'Completed', '8.5 ng/mL', '<0.04 ng/mL', 'Critical', NULL),
('f47ac10b-58cc-4372-a567-0e02b2c3d473', 'ECG', '2026-03-02', 'Completed', NULL, NULL, 'Critical', 'ST elevation in leads II, III, aVF');

-- Seed Alerts
INSERT INTO public.alerts (patient_id, type, message, acknowledged, created_at)
VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d473', 'critical', 'Oxygen saturation dropped below 90%. Immediate attention required.', false, '2026-03-02 11:45:00+00'),
('f47ac10b-58cc-4372-a567-0e02b2c3d471', 'warning', 'Fever not reducing within expected timeline. Temperature: 100.5°F', false, '2026-03-02 10:30:00+00'),
('f47ac10b-58cc-4372-a567-0e02b2c3d472', 'warning', 'Blood sugar levels persistently elevated. Fasting glucose: 310 mg/dL', true, '2026-03-02 09:15:00+00'),
('f47ac10b-58cc-4372-a567-0e02b2c3d473', 'critical', 'BP spike detected: 160/105 mmHg. Potential hypertensive crisis.', false, '2026-03-02 08:00:00+00');
