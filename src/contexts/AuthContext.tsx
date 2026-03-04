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
    // Restore patient session from localStorage first (instant, no network)
    const saved = localStorage.getItem('curesense_patient_session');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
        setLoading(false); // Patient: no need to wait for Supabase
      } catch {
        localStorage.removeItem('curesense_patient_session');
      }
    }

    // Check Supabase session for doctors/admins/nurses
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (e) {
        console.error('Session check failed:', e);
      } finally {
        setLoading(false); // Always clear loading, even on network error
      }
    };

    if (!saved) {
      checkSession(); // Only need Supabase check for non-patient users
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

    return () => subscription.unsubscribe();
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

      // If it's an ID (like DOC001 or ADM001) rather than an email, look up the real email
      if (!identifier.includes('@')) {
        const { data: profile, error: lookupError } = await (supabase as any)
          .from('profiles')
          .select('email')
          .eq('id_number', identifier)
          .single();

        if (lookupError || !(profile as any)?.email) {
          throw new Error('Invalid ID or account not found.');
        }
        email = (profile as any).email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Verify role matches
      const { data: profile } = await (supabase as any).from('profiles').select('role').eq('user_id', data.user.id).single();
      if (profile?.role !== role) {
        await supabase.auth.signOut();
        toast.error(`Account found, but it is not a ${role} account.`);
        return false;
      }

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
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground font-medium">Loading CureSense...</p>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
