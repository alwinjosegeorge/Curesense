import React, { useState } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Stethoscope, Heart, UserCog, ArrowRight, Eye, EyeOff, Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const roles: { role: UserRole; label: string; icon: React.ReactNode; description: string; idLabel: string; idPlaceholder: string }[] = [
  { role: 'patient', label: 'Patient', icon: <Heart className="w-6 h-6" />, description: 'View your health records & track progress', idLabel: 'Admission Number', idPlaceholder: 'ADM001' },
  { role: 'doctor', label: 'Doctor', icon: <Stethoscope className="w-6 h-6" />, description: 'Manage patients & AI-assisted treatments', idLabel: 'Doctor ID', idPlaceholder: 'DOC001' },
  { role: 'nurse', label: 'Nurse', icon: <Shield className="w-6 h-6" />, description: 'Record vitals & patient observations', idLabel: 'Nurse ID', idPlaceholder: 'NUR001' },
  { role: 'admin', label: 'Hospital Admin', icon: <UserCog className="w-6 h-6" />, description: 'Manage admissions & administration', idLabel: 'Admin ID', idPlaceholder: 'ADMIN01' },
];

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isRealAuth, setIsRealAuth] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();

  const activeRole = roles.find(r => r.role === selectedRole);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (isRealAuth) {
      if (!loginId || !password) {
        toast.error(`Please enter your ${activeRole?.idLabel || 'ID'} and password`);
        return;
      }
      setLoading(true);
      const success = await login(loginId, password, selectedRole);
      setLoading(false);
      if (success) navigate(`/${selectedRole}`);
    } else {
      if (!loginId) {
        toast.error('Please enter your ID');
        return;
      }
      demoLogin(selectedRole, loginId);
      navigate(`/${selectedRole}`);
    }
  };

  return (
    <div className="min-h-screen flex text-foreground">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-[45%] gradient-hero relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-primary-foreground/20"
              style={{ width: `${200 + i * 150}px`, height: `${200 + i * 150}px`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          ))}
        </div>
        <div className="relative z-10 text-primary-foreground max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-accent/20 backdrop-blur flex items-center justify-center">
                <Stethoscope className="w-7 h-7" />
              </div>
              <h1 className="text-3xl font-display font-bold tracking-tight">CureSense</h1>
            </div>
            <h2 className="text-4xl font-display font-bold leading-tight mb-4">
              AI-Powered Smart Treatment Intelligence
            </h2>
            <p className="text-lg opacity-80 leading-relaxed">
              Predictive analytics, real-time monitoring, and intelligent treatment recommendations — all in one unified platform.
            </p>
            <div className="mt-10 space-y-4 text-sm opacity-70">
              <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> AI-driven risk prediction & alerts</div>
              <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Real-time vitals monitoring</div>
              <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Multi-sensor accident detection</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right - Login */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg gradient-medical flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-bold text-foreground">CureSense</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/mobile-demo')} className="gap-2">
              <Phone className="w-4 h-4" /> Mobile Module
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div key="roles" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-2xl font-display font-bold">Welcome back</h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/mobile-demo')} className="hidden lg:flex gap-2">
                    <Phone className="w-4 h-4" /> Mobile Demo
                  </Button>
                </div>
                <p className="text-muted-foreground mb-8">Select your role to continue</p>
                <div className="space-y-3">
                  {roles.map((r) => (
                    <button key={r.role} onClick={() => { setSelectedRole(r.role); setLoginId(''); setPassword(''); }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-accent hover:shadow-elevated transition-all duration-200 text-left group">
                      <div className="w-11 h-11 rounded-lg bg-medical-blue-light flex items-center justify-center text-medical-blue group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                        {r.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-card-foreground">{r.label}</div>
                        <div className="text-sm text-muted-foreground">{r.description}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={() => { setSelectedRole(null); setIsRealAuth(false); }} className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-1">
                  ← Back to role selection
                </button>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gradient-medical flex items-center justify-center text-primary-foreground">
                      {activeRole?.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold">{activeRole?.label} Login</h2>
                      <p className="text-sm text-muted-foreground">CureSense Secure Portal</p>
                    </div>
                  </div>
                </div>

                <div className="flex rounded-lg bg-muted p-1 mb-6">
                  <button onClick={() => setIsRealAuth(false)} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${!isRealAuth ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    Demo (No Password)
                  </button>
                  <button onClick={() => setIsRealAuth(true)} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${isRealAuth ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    Real Login (With Password)
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {isRealAuth ? (
                    <>
                      <div>
                        <Label>{activeRole?.idLabel} / Email</Label>
                        <Input
                          value={loginId}
                          onChange={e => setLoginId(e.target.value)}
                          placeholder={activeRole?.idPlaceholder}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label>{(selectedRole === 'patient' || selectedRole === 'nurse') ? 'Date of Birth' : 'Password'}</Label>
                        <div className="relative mt-1.5">
                          <Input
                            type={(selectedRole === 'patient' || selectedRole === 'nurse') && !showPassword ? 'password' : (showPassword ? 'text' : 'password')}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder={(selectedRole === 'patient' || selectedRole === 'nurse') ? 'YYYY-MM-DD' : '••••••••'}
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label>{activeRole?.idLabel}</Label>
                      <Input value={loginId} onChange={e => setLoginId(e.target.value)} placeholder={activeRole?.idPlaceholder} className="mt-1.5" />
                    </div>
                  )}

                  <Button type="submit" disabled={loading} className="w-full gradient-medical text-primary-foreground hover:opacity-90">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {isRealAuth ? 'Sign In' : `Enter as ${activeRole?.label}`}
                  </Button>

                  <p className="text-[10px] text-center text-muted-foreground mt-4 leading-relaxed">
                    By signing in, you agree to our HIPAA-compliant data processing terms.
                    {!isRealAuth && <span className="block mt-1 font-medium text-accent">Demo Mode: No password required for testing purposes.</span>}
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
