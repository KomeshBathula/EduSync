import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Sparkles, User } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('STUDENT');

    const handleLogin = (e) => {
        e.preventDefault();
        // Simulate login based on role selector for now
        if (role === 'STUDENT') navigate('/student/dashboard');
        if (role === 'TEACHER') navigate('/teacher/dashboard');
        if (role === 'ADMIN') navigate('/admin/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Dynamic Background Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-blob" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-blob animation-delay-2000" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md z-10 p-8"
            >
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Sparkles className="text-indigo-500 w-8 h-8" />
                        <h1 className="text-4xl font-outfit font-bold text-white tracking-tight">EduSync <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI</span></h1>
                    </div>
                    <p className="text-slate-400 text-sm">Intelligent Adaptive Learning Platform</p>
                </div>

                <form onSubmit={handleLogin} className="glass-card p-8 space-y-6">
                    <div className="space-y-4">
                        {!isLogin && (
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                                <input
                                    type="text"
                                    className="glass-input pl-12"
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required={!isLogin}
                                />
                            </div>
                        )}
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                            <input
                                type="email"
                                className="glass-input pl-12"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                            <input
                                type="password"
                                className="glass-input pl-12"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 p-1 bg-black/20 rounded-xl backdrop-blur-md">
                        {['STUDENT', 'TEACHER', 'ADMIN'].map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setRole(r)}
                                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${role === r
                                    ? 'bg-indigo-500 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    <button type="submit" className="cyber-button w-full flex items-center justify-center gap-2">
                        <span>{isLogin ? 'Access Portal' : 'Create Account'}</span>
                        <LogIn className="w-4 h-4" />
                    </button>

                    <p className="text-center text-sm text-slate-400 mt-4">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                        >
                            {isLogin ? "Sign Up" : "Log In"}
                        </button>
                    </p>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
