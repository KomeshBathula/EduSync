import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, User, Sparkles, GraduationCap } from 'lucide-react';
import api from '../../api/axios';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const StudentLogin = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [contexts, setContexts] = useState([]);
    const [academicContextId, setAcademicContextId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const role = 'STUDENT';

    useEffect(() => {
        api.get('/api/academic/public')
            .then((res) => {
                if (Array.isArray(res.data)) setContexts(res.data);
            })
            .catch(console.error);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setLoading(true);
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const payload = isLogin ? { email, password, role } : { name, email, password, role, academicContextId };
            const res = await api.post(endpoint, payload);
            const data = res.data;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            navigate('/student/dashboard');
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background md:bg-surface-alt py-12 px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-4xl grid md:grid-cols-2 bg-surface rounded-[var(--radius-xl)] shadow-level3 overflow-hidden border border-border-subtle">
                <div className="bg-surface-alt p-12 text-text-primary flex flex-col justify-center relative overflow-hidden hidden md:flex border-r border-border-subtle">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-secondary/10 opacity-50 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-primary/10 opacity-50 blur-2xl"></div>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 text-secondary mb-6 relative z-10">
                        <GraduationCap className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-heading font-extrabold mb-4 relative z-10 tracking-tight">Welcome back, Scholar</h2>
                    <p className="text-text-secondary text-lg font-body relative z-10 leading-relaxed font-medium">Let's continue your learning journey. Log in to access your modules, personalized quizzes, and AI doubt solver.</p>
                </div>

                <div className="p-8 sm:p-12 flex flex-col justify-center bg-surface">
                    <div className="mb-8">
                        <button onClick={() => navigate('/login')} className="text-sm text-text-secondary hover:text-primary mb-6 transition-colors font-medium">← Back to Role Selection</button>
                        <h1 className="text-3xl font-heading font-bold text-text-primary tracking-tight">Student Portal</h1>
                        <p className="text-text-secondary mt-2">Sign in to access your adaptive learning dashboard.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {!isLogin && (
                            <Input icon={User} type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
                        )}
                        <Input icon={Mail} type="email" placeholder="Student Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <Input icon={Lock} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

                        {!isLogin && (
                            <div className="relative group">
                                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary w-5 h-5 transition-colors group-focus-within:text-primary z-10" />
                                <select
                                    className="w-full bg-surface border border-border-base rounded-[var(--radius-md)] pl-12 pr-4 py-3 text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--color-focus-ring)] transition-all duration-300 appearance-none"
                                    value={academicContextId}
                                    onChange={(e) => setAcademicContextId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled hidden>Select Context...</option>
                                    {contexts.map(c => (
                                        <option key={c._id} value={c._id}>Year {c.year} - {c.branch} - Sec {c.section}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 mt-6">
                            <span>{loading ? 'Please wait...' : isLogin ? 'Access Portal' : 'Register Account'}</span>
                            <LogIn className="w-4 h-4" />
                        </Button>

                        {errorMessage && <div className="text-center text-sm font-medium text-danger">{errorMessage}</div>}

                        <p className="text-center text-sm text-text-secondary mt-6">
                            {isLogin ? "New student? " : "Already registered? "}
                            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-bold hover:text-primary-hover transition-colors">
                                {isLogin ? "Sign Up" : "Log In"}
                            </button>
                        </p>
                    </form>
                </div>
            </motion.div>

            {/* Decorative Orbs */}
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] right-[5%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-[120px]"></div>
                <div className="absolute bottom-[10%] left-[5%] w-[30%] h-[30%] rounded-full bg-secondary/5 blur-[120px]"></div>
            </div>
        </div>
    );
};

export default StudentLogin;
