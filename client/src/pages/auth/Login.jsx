import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, LineChart, ShieldCheck, Sparkles } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
            {/* Subtle decorative elements, replacing pure glassmorphism */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-surface-alt -skew-x-12 transform origin-top opacity-50 z-0"></div>

            <div className="w-full max-w-5xl z-10">
                <div className="text-center mb-16">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Sparkles className="text-primary w-10 h-10" />
                        <h1 className="text-5xl font-heading font-bold text-text-primary tracking-tight">EduSync <span className="text-primary">AI</span></h1>
                    </div>
                    <p className="text-text-secondary text-lg">Intelligent Adaptive Learning Platform</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    {/* Student Access */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        onClick={() => navigate('/login/student')}
                        className="bg-surface border border-border-subtle rounded-[var(--radius-xl)] p-8 shadow-level1 hover:shadow-level3 hover:-translate-y-2 transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <GraduationCap className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary mb-2">Student Access</h2>
                        <p className="text-text-secondary">Enter your personalized adaptive learning environment.</p>
                    </motion.div>

                    {/* Teacher Access */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        onClick={() => navigate('/login/teacher')}
                        className="bg-surface border border-border-subtle rounded-[var(--radius-xl)] p-8 shadow-level1 hover:shadow-level3 hover:-translate-y-2 transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <LineChart className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary mb-2">Faculty Portal</h2>
                        <p className="text-text-secondary">Manage classes, monitor insights, and direct learning.</p>
                    </motion.div>

                    {/* Admin Access */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        onClick={() => navigate('/login/admin')}
                        className="bg-surface border border-border-subtle rounded-[var(--radius-xl)] p-8 shadow-level1 hover:shadow-level3 hover:-translate-y-2 transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary mb-2">System Admin</h2>
                        <p className="text-text-secondary">Control system configurations and manage user access.</p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Login;
