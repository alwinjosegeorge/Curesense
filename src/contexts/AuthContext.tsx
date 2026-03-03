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
      .eq('id', userId)
      .single();

    if (data && !error) {
      setUser({
        id: data.id,
        name: data.name || 'User',
        role: data.role as UserRole,
        idNumber: data.id_number
      });
    }
  };

  const login = async (identifier: string, password: string, role: UserRole): Promise<boolean> => {
    setLoading(true);
    try {
      let email = identifier;

      // If it's an ID (like DOC001 or ADM001) rather than an email, look up the real email
      if (!identifier.includes('@')) {
        const { data: profile, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id_number', identifier)
          .single();

        if (lookupError || !profile?.email) {
          throw new Error('Invalid ID or account not found.');
        }
        email = profile.email;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Verify role matches
      const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', data.user.id).single();
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
