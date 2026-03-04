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
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  demoLogin: (role: UserRole, id: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setLoading(false); } };

    // Hard timeout — if Supabase hangs for any reason, unblock after 2.5s
    const timeout = setTimeout(finish, 2500);

    // Restore patient session from localStorage (instant, no network)
    const saved = localStorage.getItem('curesense_patient_session');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
        finish(); // Patient session found — no need to wait for Supabase
      } catch {
        localStorage.removeItem('curesense_patient_session');
      }
    }

    // Check Supabase session for doctors/admins/nurses
    if (!saved) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          return fetchProfile(session.user.id);
        }
      }).catch(console.error).finally(finish);
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('curesense_patient_session');
      } else if (session?.user) {
        await fetchProfile(session.user.id);
      }
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data && !error) {
      const d = data as any;
      setUser({
        id: d.id,
        name: d.full_name || 'User',
        role: (d.role || '').toLowerCase() as UserRole,
        idNumber: d.id_number
      });
    }
  };

  const login = async (identifier: string, password: string, role: UserRole): Promise<boolean> => {
    setLoading(true);
    try {
      // Custom logic for nurses
      if (role === 'nurse') {
        const { data: nurse, error: nurseError } = await (supabase as any)
          .from('nurses')
          .select('*, doctors!assigned_doctor_id(id, name)')
          .eq('employee_id', identifier)
          .eq('date_of_birth', password)
          .single();

        if (nurseError || !nurse) {
          throw new Error('Invalid Employee ID or Date of Birth.');
        }

        const nurseUser = {
          id: nurse.id,
          name: nurse.name,
          role: 'nurse' as UserRole,
          idNumber: nurse.employee_id,
          assignedDoctorId: nurse.assigned_doctor_id,
          assignedDoctorName: (nurse.doctors as any)?.name || ''
        };
        setUser(nurseUser as any);
        localStorage.setItem('curesense_patient_session', JSON.stringify(nurseUser));
        toast.success(`Welcome, Nurse ${nurse.name}`);
        return true;
      }

      // Custom logic for patients
      if (role === 'patient') {
        const { data: patient, error: patientError } = await (supabase as any)
          .from('patients')
          .select('*')
          .eq('admission_no', identifier)
          .eq('date_of_birth', password)
          .single();

        if (patientError || !patient) {
          throw new Error('Invalid Admission Number or Date of Birth.');
        }

        const patientUser = { id: patient.id, name: patient.name, role: 'patient' as UserRole, idNumber: patient.admission_no };
        setUser(patientUser);
        // Persist patient session so refresh works without clearing storage
        localStorage.setItem('curesense_patient_session', JSON.stringify(patientUser));
        toast.success(`Welcome, ${patient.name}`);
        return true;
      }

      let email = identifier;

      // Single profiles lookup: get both email AND role together (was 2 separate lookups before)
      const { data: profile, error: lookupError } = await (supabase as any)
        .from('profiles')
        .select('email, role')
        .eq('id_number', identifier)
        .single();

      if (lookupError || !profile?.email) {
        throw new Error('Account not found. Check your ID.');
      }

      // Role mismatch — fail fast before even attempting auth
      if (profile.role !== role) {
        throw new Error(`This ID belongs to a ${profile.role} account, not ${role}.`);
      }

      email = profile.email;

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      return true;
    } catch (e: any) {
      toast.error(e.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = (role: UserRole, id: string) => {
    const demoUser: User = {
      id: `demo-${id}`,
      name: role === 'doctor' ? `Dr. ${id}` : id,
      role,
      idNumber: id
    };
    setUser(demoUser);
    toast.success('Signed in with Demo Mode');
  };

  const logout = async () => {
    // Clear patient session from localStorage immediately
    localStorage.removeItem('curesense_patient_session');
    setUser(null);
    toast.info('Signed out');
    // Sign out from Supabase in background (non-blocking)
    supabase.auth.signOut();
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
