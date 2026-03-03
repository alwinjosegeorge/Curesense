import React, { useState, useEffect } from 'react';
import { Shield, MapPin, Activity, AlertCircle, RefreshCw, Send, Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

export default function MobileModule() {
    const navigate = useNavigate();
    const [gForce, setGForce] = useState(1.0);
    const [speed, setSpeed] = useState(45);
    const [tilt, setTilt] = useState(0);
    const [immobility, setImmobility] = useState(0);
    const [isDetecting, setIsDetecting] = useState(false);
    const [confidence, setConfidence] = useState(0);
    const [status, setStatus] = useState<'IDLE' | 'DRIVING' | 'EMERGENCY'>('IDLE');
    const [logs, setLogs] = useState<{ time: string; msg: string }[]>([]);

    // Simulation Logic: Mult-Sensor Fusion
    // Confidence = (G-Force 40%) + (Speed Drop 30%) + (Tilt 15%) + (Immobility 15%)
    useEffect(() => {
        let score = 0;

        // G-Force factor (Impact)
        if (gForce >= 5) score += 40;
        else if (gForce >= 3) score += 20;

        // Speed factor (Sudden deceleration)
        if (speed < 5 && gForce > 4) score += 30;

        // Tilt factor (Orientation shift)
        if (Math.abs(tilt) > 60) score += 15;

        // Immobility factor
        if (immobility > 10) score += 15;

        setConfidence(score);

        if (score >= 85 && status !== 'EMERGENCY') {
            triggerEmergency();
        }
    }, [gForce, speed, tilt, immobility]);

    const addLog = (msg: string) => {
        setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 5));
    };

    const triggerEmergency = async () => {
        setStatus('EMERGENCY');
        addLog('CRITICAL: Accident Detected! Confidence: ' + confidence + '%');

        try {
            // Simulate backend notification
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.from('alerts').insert({
                type: 'critical',
                message: `EMERGENCY ALERT: Accident detected! G-Force: ${gForce.toFixed(1)}G, Speed: ${speed}km/h. Immediate assistance required.`,
                patient_id: 'd9e0789a-0987-4321-ba98-76543210abcd' // Placeholder for demo patient or actual auth user id
            });

            if (error) throw error;
            toast.error('Emergency Response Triggered! Notifying Doctor & Relatives...', { duration: 10000 });

            // Start live tracking simulation
            addLog('Live location tracking started.');
        } catch (e) {
            console.error('Failed to report accident:', e);
        }
    };

    const reset = () => {
        setStatus('IDLE');
        setGForce(1.0);
        setSpeed(45);
        setTilt(0);
        setImmobility(0);
        setConfidence(0);
        addLog('System monitoring reset.');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans p-4">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => navigate('/login')} className="p-2 hover:bg-slate-900 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h1 className="text-xl font-bold tracking-tight">CureSense <span className="text-medical-blue">MOBILE</span></h1>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold font-display">System Integrity Monitor</p>
                </div>
                <div className="w-10" />
            </div>

            <div className="flex-1 space-y-4 max-w-md mx-auto w-full">
                {/* Radar/Status Display */}
                <Card className="bg-slate-900 border-slate-800 p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
                    <div className={`absolute inset-0 opacity-10 ${status === 'EMERGENCY' ? 'bg-red-500 animate-pulse' : 'bg-medical-blue'}`} />

                    <div className="relative z-10 w-40 h-40 rounded-full border-4 border-slate-800 flex items-center justify-center">
                        {status === 'EMERGENCY' ? (
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="bg-red-500 rounded-full p-6">
                                <AlertCircle className="w-12 h-12 text-white" />
                            </motion.div>
                        ) : (
                            <div className="text-center">
                                <Activity className={`w-12 h-12 mb-2 mx-auto ${status === 'IDLE' ? 'text-slate-500' : 'text-medical-blue animate-pulse'}`} />
                                <span className="text-xs font-bold text-slate-400">{status}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 text-center z-10">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                            {status === 'EMERGENCY' ? 'CRASH DETECTED' : 'SYSTEM PASSIVE'}
                        </h2>
                        <div className="flex items-center gap-2 justify-center mt-2">
                            <Badge variant={status === 'EMERGENCY' ? 'destructive' : 'secondary'} className="rounded-sm">
                                Confidence: {confidence}%
                            </Badge>
                            {status !== 'IDLE' && (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-sm">
                                    Tracking Active
                                </Badge>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Simulation Controls */}
                <div className="grid grid-cols-1 gap-4">
                    <Card className="bg-slate-900 border-slate-800 p-4">
                        <label className="text-xs text-slate-400 mb-2 block">SIMULATE IMPACT (G-FORCE)</label>
                        <div className="flex items-center gap-4">
                            <Slider value={[gForce]} min={0} max={10} step={0.1} onValueChange={([v]) => setGForce(v)} className="flex-1" />
                            <span className={`text-sm font-mono w-12 text-right ${gForce > 5 ? 'text-red-500' : ''}`}>{gForce.toFixed(1)}G</span>
                        </div>
                    </Card>

                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-slate-900 border-slate-800 p-4">
                            <label className="text-xs text-slate-400 mb-2 block">SPEED (KM/H)</label>
                            <div className="flex items-center justify-between">
                                <input type="number" value={speed} onChange={e => setSpeed(parseInt(e.target.value))} className="bg-transparent text-xl font-bold w-full outline-none" />
                                <Activity className="w-4 h-4 text-slate-600" />
                            </div>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800 p-4">
                            <label className="text-xs text-slate-400 mb-2 block">TILT ANGLE</label>
                            <div className="flex items-center justify-between">
                                <input type="number" value={tilt} onChange={e => setTilt(parseInt(e.target.value))} className="bg-transparent text-xl font-bold w-full outline-none" />
                                <RefreshCw className="w-4 h-4 text-slate-600" />
                            </div>
                        </Card>
                    </div>

                    <Card className="bg-slate-900 border-slate-800 p-4">
                        <label className="text-xs text-slate-400 mb-2 block">IMMOBILITY DURATION (SEC)</label>
                        <div className="flex items-center gap-4">
                            <Slider value={[immobility]} min={0} max={30} step={1} onValueChange={([v]) => setImmobility(v)} className="flex-1" />
                            <span className="text-sm font-mono w-12 text-right">{immobility}s</span>
                        </div>
                    </Card>
                </div>

                {/* Action Bar */}
                <div className="flex gap-4">
                    <Button variant="outline" className="flex-1 border-slate-800 hover:bg-slate-800 text-slate-300 py-6" onClick={reset}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                    <Button className="flex-1 gradient-medical text-white font-bold py-6 shadow-xl shadow-medical-blue/20" onClick={() => setStatus('DRIVING')}>
                        <Activity className="w-4 h-4 mr-2" /> Start Mode
                    </Button>
                </div>

                {/* Event Logs */}
                <Card className="bg-slate-900/50 border-slate-800 p-4 mt-4">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center justify-between">
                        Live Stream Logs
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </h3>
                    <div className="space-y-2">
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-3 text-xs">
                                <span className="text-slate-600 font-mono">[{log.time}]</span>
                                <span className={log.msg.includes('CRITICAL') ? 'text-red-400 font-medium' : 'text-slate-400'}>{log.msg}</span>
                            </div>
                        ))}
                        {logs.length === 0 && <p className="text-xs text-slate-700 italic">Listening for sensor data...</p>}
                    </div>
                </Card>
            </div>

            <div className="mt-auto pt-6 text-center">
                <p className="text-[9px] text-slate-600">ENCRYPTED END-TO-END VIA CURESENSE GUARDIAN · HIPAA COMPLIANT</p>
            </div>
        </div>
    );
}
