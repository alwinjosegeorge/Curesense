import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserRole = 'patient' | 'doctor' | 'nurse' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  idNumber?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string, role: UserRole) => Promise<boolean>;
  demoLogin: (role: UserRole, id: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SESSION_KEY = 'curesense_session';

function saveSession(u: User) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(u));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('curesense_patient_session'); // legacy key
}
function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem('curesense_patient_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadSession); // init from localStorage instantly
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we already restored a session from localStorage, no need to wait
    if (user) { setLoading(false); return; }

    // Otherwise check Supabase session for doctor/admin
    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u = await fetchProfile(session.user.id);
          if (u) { setUser(u); saveSession(u); }
        }
      } catch (e) {
        console.error('Session check error:', e);
      } finally {
        setLoading(false);
      }
    };

    // Timeout safety: never hang more than 3s
    const t = setTimeout(() => setLoading(false), 3000);
    check().finally(() => clearTimeout(t));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        clearSession();
        setUser(null);
      }
    });

    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  // ─── Fetch profile from DB ────────────────────────────────────────────────
  async function fetchProfile(userId: string): Promise<User | null> {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('id, user_id, full_name, role, id_number, email')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.user_id || data.id,
      name: data.full_name || 'User',
      role: (data.role || '').toLowerCase() as UserRole,
      idNumber: data.id_number,
      email: data.email,
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = async (identifier: string, password: string, role: UserRole): Promise<boolean> => {
    try {

      // ── NURSE login (Employee ID + DOB) ──
      if (role === 'nurse') {
        const { data: nurse, error } = await (supabase as any)
          .from('nurses')
          .select('*, doctors!assigned_doctor_id(id, name)')
          .eq('employee_id', identifier)
          .eq('date_of_birth', password)
          .single();

        if (error || !nurse) throw new Error('Invalid Employee ID or Date of Birth.');

        const u: User = {
          id: nurse.id,
          name: nurse.name,
          role: 'nurse',
          idNumber: nurse.employee_id,
          assignedDoctorId: nurse.assigned_doctor_id,
          assignedDoctorName: (nurse.doctors as any)?.name || '',
        };
        setUser(u);
        saveSession(u);
        toast.success(`Welcome, Nurse ${nurse.name}`);
        return true;
      }

      // ── PATIENT login (Admission No + DOB) ──
      if (role === 'patient') {
        const { data: patient, error } = await (supabase as any)
          .from('patients')
          .select('id, name, admission_no, date_of_birth')
          .eq('admission_no', identifier)
          .eq('date_of_birth', password)
          .single();

        if (error || !patient) throw new Error('Invalid Admission Number or Date of Birth.');

        const u: User = {
          id: patient.id,
          name: patient.name,
          role: 'patient',
          idNumber: patient.admission_no,
        };
        setUser(u);
        saveSession(u);
        toast.success(`Welcome, ${patient.name}`);
        return true;
      }

      // ── DOCTOR / ADMIN login (ID or email + password via Supabase Auth) ──
      let email = identifier;

      if (!identifier.includes('@')) {
        // Lookup email from ID number (e.g. DOC001 → their @curesense.ai email)
        const { data: profile, error } = await (supabase as any)
          .from('profiles')
          .select('email, role')
          .eq('id_number', identifier)
          .single();

        if (error || !profile?.email) throw new Error('ID not found. Please check your Doctor/Admin ID.');
        if (profile.role !== role) throw new Error(`ID "${identifier}" is a ${profile.role} account, not ${role}.`);
        email = profile.email;
      }

      // Sign in to Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // IMMEDIATELY fetch profile and set user (don't rely on onAuthStateChange timing)
      const u = await fetchProfile(authData.user.id);
      if (!u) throw new Error('Profile not found. Contact admin.');

      setUser(u);
      saveSession(u);
      toast.success(`Welcome, ${u.name}`);
      return true;

    } catch (e: any) {
      toast.error(e.message || 'Login failed. Check your credentials.');
      return false;
    }
  };

  // ─── Demo Login ───────────────────────────────────────────────────────────
  const demoLogin = (role: UserRole, id: string) => {
    const u: User = {
      id: `demo-${id}`,
      name: role === 'doctor' ? `Dr. ${id}` : id,
      role,
      idNumber: id,
    };
    setUser(u);
    saveSession(u);
    toast.success('Signed in with Demo Mode');
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = async () => {
    clearSession();
    setUser(null);
    toast.info('Signed out');
    supabase.auth.signOut().catch(() => { }); // non-blocking
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, demoLogin, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
