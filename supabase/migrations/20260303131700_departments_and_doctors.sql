
-- Departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT, -- Emoji or icon name
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional link to auth user
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Select policies (Public read for booking)
CREATE POLICY "Allow public read of departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Allow public read of doctors" ON public.doctors FOR SELECT USING (true);

-- Insert Data
DO $$
DECLARE
  dept_id UUID;
BEGIN
  -- Cardiology
  INSERT INTO public.departments (name, icon) VALUES ('Cardiology', '❤️') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Biby Chacko Olari', 'Cardiologist', dept_id),
    ('Dr. Ramdas Nayak H', 'Senior Cardiologist', dept_id),
    ('Dr. James Thomas', 'Cardiologist', dept_id),
    ('Dr. Raju George', 'Cardiologist', dept_id),
    ('Dr. Rajeev Abraham', 'Cardiologist', dept_id);

  -- Paediatrics
  INSERT INTO public.departments (name, icon) VALUES ('Paediatrics', '👶') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Thomas Abraham', 'Paediatrician', dept_id),
    ('Dr. R. Suresh Kumar', 'Paediatrician', dept_id),
    ('Dr. Jyothis James', 'Paediatrician', dept_id);

  -- Neurology / Neurosurgery
  INSERT INTO public.departments (name, icon) VALUES ('Neurology / Neurosurgery', '🧠') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Arun George Tharayanil', 'Senior Neurologist', dept_id),
    ('Dr. Vijayakumar Madhavdass Menon', 'Neurosurgeon', dept_id);

  -- Orthopaedics
  INSERT INTO public.departments (name, icon) VALUES ('Orthopaedics', '🦴') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Prof. Dr. Mathew Abraham', 'Orthopaedic Head', dept_id),
    ('Dr. O.T. George', 'Orthopaedic Surgeon', dept_id);

  -- Internal Medicine / General Medicine
  INSERT INTO public.departments (name, icon) VALUES ('Internal Medicine / General Medicine', '🩺') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Joy Mani Theckedathu', 'Internal Medicine', dept_id),
    ('Dr. Jubil Jose Kurian', 'General Physician', dept_id),
    ('Dr. Prince Joseph', 'General Physician', dept_id),
    ('Dr. Sheela Kurian V', 'General Physician', dept_id);

  -- Obstetrics & Gynaecology
  INSERT INTO public.departments (name, icon) VALUES ('Obstetrics & Gynaecology', '🤰') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Agitha Kumari', 'Gynaecologist & Obstetrician', dept_id),
    ('Dr. T. Geetha', 'Gynaecologist & Obstetrician', dept_id);

  -- Pathology
  INSERT INTO public.departments (name, icon) VALUES ('Pathology', '🧪') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Rosamma Thomas', 'Pathologist', dept_id);

  -- Ophthalmology
  INSERT INTO public.departments (name, icon) VALUES ('Ophthalmology', '👁️') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Manuel John', 'Ophthalmologist', dept_id);

  -- Nephrology
  INSERT INTO public.departments (name, icon) VALUES ('Nephrology', '💧') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Manjula Ramachandran', 'Nephrologist', dept_id);

  -- ENT (Ear, Nose & Throat)
  INSERT INTO public.departments (name, icon) VALUES ('ENT (Ear, Nose & Throat)', '👂') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Philip George', 'ENT Specialist', dept_id);

  -- Psychiatry / Behavioural Sciences
  INSERT INTO public.departments (name, icon) VALUES ('Psychiatry / Behavioural Sciences', '🧠') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Roy Abraham Kallivayalil', 'Psychiatrist & Mental Health Specialist', dept_id);

  -- Radiology & Imaging
  INSERT INTO public.departments (name, icon) VALUES ('Radiology & Imaging', '🩻') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Rajesh Antony', 'Radiologist / Head – Imaging', dept_id);

  -- Pulmonology / Chest Medicine
  INSERT INTO public.departments (name, icon) VALUES ('Pulmonology / Chest Medicine', '🫁') RETURNING id INTO dept_id;
  INSERT INTO public.doctors (name, specialty, department_id) VALUES 
    ('Dr. Merin Yohannan', 'Pulmonologist', dept_id),
    ('Dr. Jaisy Thomas', 'Pulmonologist', dept_id);
END $$;
