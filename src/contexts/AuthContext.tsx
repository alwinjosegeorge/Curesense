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
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
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

        setUser({
          id: patient.id,
          name: patient.name,
          role: 'patient',
          idNumber: patient.admission_no
        });
        toast.success(`Welcome back, ${patient.name}`);
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
    await supabase.auth.signOut();
    setUser(null);
    toast.info('Signed out');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, demoLogin, logout, isAuthenticated: !!user }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
