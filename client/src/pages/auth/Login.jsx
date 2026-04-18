import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, BookOpen, Shield, ArrowRight, Github, Linkedin, Users, X, Sparkles } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Check if the current URL is /login/admin
    const isAdminMode = location.pathname === '/login/admin';

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background">
            
            {/* Left Side: Branding & Story (60%) */}
            <div className="hidden md:flex md:w-[55%] lg:w-[60%] bg-surface-alt flex-col justify-between p-12 lg:p-20 relative border-r border-border-subtle overflow-hidden">
                {/* Decorative background grid pattern (subtle) */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02]" 
                     style={{ backgroundImage: 'linear-gradient(#1E3A8A 1px, transparent 1px), linear-gradient(90deg, #1E3A8A 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <BookOpen className="text-white w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-heading font-bold tracking-tight text-text-primary">EduSync<span className="text-primary ml-0.5">AI</span></h1>
                    </div>

                    <div className="max-w-xl">
                        <motion.h2 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                            className="text-4xl lg:text-5xl font-heading font-bold text-text-primary leading-tight mb-6"
                        >
                            The intelligent layer <br />
                            for <span className="text-primary relative inline-block">
                                adaptive learning
                                <span className="absolute bottom-0 left-0 w-full h-2 bg-primary/20 -z-10 transform translate-y-1 rounded-sm"></span>
                            </span>
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-lg text-text-secondary leading-relaxed mb-12 max-w-lg"
                        >
                            EduSync connects student performance, AI-driven risk analysis, and automated tutoring into one cohesive academic ecosystem.
                        </motion.p>

                        {/* Prominent Founders Callout */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
                            className="mt-16 inline-block"
                        >
                            <Link 
                                to="/founders"
                                className="group flex items-center gap-4 p-1 pr-6 bg-surface border border-border-base rounded-2xl shadow-sm hover:shadow-level-2 hover:border-primary/50 transition-all"
                            >
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-0.5">The Visionaries</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-text-primary">Meet our Founders</span>
                                        <Sparkles className="w-4 h-4 text-accent-base" />
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-text-secondary group-hover:text-primary group-hover:translate-x-1 transition-all ml-2" />
                            </Link>
                        </motion.div>
                    </div>
                </div>

                <div className="z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-8 text-sm text-text-secondary font-medium">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success-base"></div>
                            <span>System Operational</span>
                        </div>
                        <div>v2.0 Architecture</div>
                    </div>
                </div>
            </div>

            {/* Right Side: Portals (40%) */}
            <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 relative bg-surface">
                
                {/* Mobile Header (visible only on small screens) */}
                <div className="md:hidden flex items-center justify-between mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                            <BookOpen className="text-white w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-heading font-bold text-text-primary">EduSync<span className="text-primary ml-0.5">AI</span></h1>
                    </div>
                    <Link to="/founders" className="p-2 bg-surface-alt rounded-lg text-primary border border-border-subtle">
                        <Users className="w-5 h-5" />
                    </Link>
                </div>

                <div className="w-full max-w-md mx-auto">
                    <h3 className="text-2xl font-bold font-heading text-text-primary mb-2">
                        {isAdminMode ? 'Restricted Access' : 'Access Portal'}
                    </h3>
                    <p className="text-sm text-text-secondary mb-10">
                        {isAdminMode 
                            ? 'Administrator identity verification required to proceed.' 
                            : 'Select your designated role to enter the workspace.'}
                    </p>

                    <div className="space-y-4">
                        {!isAdminMode ? (
                            <>
                                {/* Student Portal */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                                    onClick={() => navigate('/login/student')}
                                    className="group flex items-center p-5 bg-background border border-border-base rounded-[var(--radius-lg)] cursor-pointer transition-all hover:border-primary hover:shadow-level-2 hover:bg-surface-alt"
                                >
                                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                                        <GraduationCap className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors">Student Portal</h4>
                                        <p className="text-xs text-text-secondary mt-0.5">Access adaptive tests & AI tutors</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-text-secondary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                                </motion.div>

                                {/* Faculty Portal */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                                    onClick={() => navigate('/login/teacher')}
                                    className="group flex items-center p-5 bg-background border border-border-base rounded-[var(--radius-lg)] cursor-pointer transition-all hover:border-secondary-base hover:shadow-level-2 hover:bg-surface-alt"
                                >
                                    <div className="w-12 h-12 rounded-full bg-secondary-base/10 text-secondary-base flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-base font-bold text-text-primary group-hover:text-secondary-base transition-colors">Faculty Portal</h4>
                                        <p className="text-xs text-text-secondary mt-0.5">Manage classes & monitor risk</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-text-secondary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-secondary-base" />
                                </motion.div>
                            </>
                        ) : (
                            /* Admin Portal - Only shown when in admin mode */
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                onClick={() => navigate('/login/admin')}
                                className="group flex items-center p-6 bg-surface-alt border-2 border-primary rounded-[var(--radius-lg)] cursor-pointer transition-all shadow-level-2"
                            >
                                <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                                    <Shield className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-lg font-bold text-text-primary">System Administrator</h4>
                                    <p className="text-sm text-text-secondary mt-0.5">Full architecture control enabled</p>
                                </div>
                                <ArrowRight className="w-6 h-6 text-primary" />
                            </motion.div>
                        )}
                    </div>

                    <div className="mt-12 pt-8 border-t border-border-subtle text-center">
                        <p className="text-xs text-text-secondary mb-4">Protected by EduSync SecurAuth™</p>
                        {isAdminMode && (
                            <button 
                                onClick={() => navigate('/login')}
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                Return to standard portal
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
