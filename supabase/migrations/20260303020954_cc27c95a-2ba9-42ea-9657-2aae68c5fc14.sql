
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('patient', 'doctor', 'nurse', 'admin');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'patient',
  contact TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles table (for RBAC)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_no TEXT NOT NULL UNIQUE,
  token_no TEXT NOT NULL,
  name TEXT NOT NULL,
  age INT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  contact TEXT,
  assigned_doctor_id UUID REFERENCES auth.users(id),
  admitted_by UUID REFERENCES auth.users(id),
  user_id UUID REFERENCES auth.users(id),
  admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Admitted' CHECK (status IN ('Admitted', 'Under Observation', 'Discharged', 'Critical')),
  symptoms TEXT[] DEFAULT '{}',
  diagnosis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors see assigned patients" ON public.patients FOR SELECT USING (
  assigned_doctor_id = auth.uid() OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'nurse')
);
CREATE POLICY "Admins can insert patients" ON public.patients FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Doctors and admins can update patients" ON public.patients FOR UPDATE USING (
  assigned_doctor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- Vitals table
CREATE TABLE public.vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  recorded_by UUID REFERENCES auth.users(id),
  bp_systolic INT,
  bp_diastolic INT,
  sugar NUMERIC,
  temperature NUMERIC,
  oxygen NUMERIC,
  heart_rate INT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medical staff can view vitals" ON public.vitals FOR SELECT USING (
  public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND user_id = auth.uid())
);
CREATE POLICY "Nurses and doctors can insert vitals" ON public.vitals FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse')
);

-- Prescriptions
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  prescribed_by UUID REFERENCES auth.users(id),
  medicine TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Discontinued')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View prescriptions" ON public.prescriptions FOR SELECT USING (
  public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND user_id = auth.uid())
);
CREATE POLICY "Doctors can manage prescriptions" ON public.prescriptions FOR ALL USING (public.has_role(auth.uid(), 'doctor'));

-- Lab reports
CREATE TABLE public.lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  ordered_by UUID REFERENCES auth.users(id),
  test_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
  result TEXT,
  normal_range TEXT,
  value TEXT,
  flag TEXT CHECK (flag IS NULL OR flag IN ('Normal', 'Abnormal', 'Critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View lab reports" ON public.lab_reports FOR SELECT USING (
  public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND user_id = auth.uid())
);
CREATE POLICY "Doctors can manage lab reports" ON public.lab_reports FOR ALL USING (public.has_role(auth.uid(), 'doctor'));

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES auth.users(id),
  token_no TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  type TEXT NOT NULL DEFAULT 'Consultation' CHECK (type IN ('Consultation', 'Follow-up', 'Emergency', 'Lab')),
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No-show')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View appointments" ON public.appointments FOR SELECT USING (
  doctor_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND user_id = auth.uid())
);
CREATE POLICY "Admin and doctors manage appointments" ON public.appointments FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'doctor')
);

-- Observations (nurse notes)
CREATE TABLE public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Medical staff can view observations" ON public.observations FOR SELECT USING (
  public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Nurses can add observations" ON public.observations FOR INSERT WITH CHECK (
  public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'doctor')
);

-- Alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('critical', 'warning', 'info')),
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors see alerts" ON public.alerts FOR SELECT USING (
  public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "System can create alerts" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Doctors can acknowledge alerts" ON public.alerts FOR UPDATE USING (public.has_role(auth.uid(), 'doctor'));

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit log" ON public.audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'patient');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'patient');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
