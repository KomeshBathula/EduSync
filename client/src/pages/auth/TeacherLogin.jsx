import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LineChart, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../api/axios';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ThemeToggle from '../../components/common/ThemeToggle';

const TeacherLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const role = 'TEACHER';

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setLoading(true);
        try {
            const res = await api.post('/api/auth/login', { email, password, role });
            const data = res.data;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            navigate('/teacher/dashboard');
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-background md:bg-surface-alt py-12 px-4 sm:px-6 lg:px-8 relative">
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-4xl grid md:grid-cols-2 bg-surface rounded-[var(--radius-xl)] shadow-level3 overflow-hidden border border-border-subtle"
            >
                <div className="bg-surface-alt p-12 text-text-primary hidden md:flex md:flex-col md:justify-center relative overflow-hidden border-r border-border-subtle">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-secondary/10 opacity-50 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-primary/10 opacity-50 blur-2xl"></div>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 text-secondary mb-6 relative z-10">
                        <LineChart className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-heading font-extrabold mb-4 relative z-10 tracking-tight">Welcome back, Faculty</h2>
                    <p className="text-text-secondary text-lg font-body relative z-10 leading-relaxed font-medium">
                        Sign in to manage assessments, monitor class analytics, and guide your students with confidence.
                    </p>
                </div>

                <div className="p-8 sm:p-12 flex flex-col justify-center bg-surface">
                    <div className="mb-8">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm text-text-secondary hover:text-primary mb-6 transition-colors font-medium"
                        >
                            ← Back to Role Selection
                        </button>
                        <h1 className="text-3xl font-heading font-bold text-text-primary tracking-tight">Faculty Portal</h1>
                        <p className="text-text-secondary mt-2">Sign in to access your teaching dashboard.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <Input
                            icon={Mail}
                            type="email"
                            placeholder="Faculty Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Input
                            icon={Lock}
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 mt-6">
                            <span>{loading ? 'Please wait...' : 'Access Portal'}</span>
                            <LogIn className="w-4 h-4" />
                        </Button>

                        {errorMessage && <div className="text-center text-sm font-medium text-danger">{errorMessage}</div>}
                    </form>
                </div>
            </motion.div>

            <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] right-[5%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-[120px]"></div>
                <div className="absolute bottom-[10%] left-[5%] w-[30%] h-[30%] rounded-full bg-secondary/5 blur-[120px]"></div>
            </div>
        </div>
    );
};

export default TeacherLogin;
