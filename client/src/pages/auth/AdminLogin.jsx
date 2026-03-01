import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, ShieldCheck } from 'lucide-react';
import api from '../../api/axios';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const role = 'ADMIN';

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setLoading(true);
        try {
            const res = await api.post('/api/auth/login', { email, password, role });
            const data = res.data;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            navigate('/admin/dashboard');
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-alt py-12 px-4 relative overflow-hidden">
            {/* Structured/Geometrical Background Elements */}
            <div className="absolute top-0 w-full h-1 bg-accent"></div>
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-border-base -z-10"></div>
            <div className="absolute top-0 left-1/2 w-[1px] h-full bg-border-base -z-10"></div>

            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
                <div className="bg-surface rounded-none border-2 border-border-base shadow-level3 p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-surface-alt border border-border-base flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="w-8 h-8 text-accent" />
                        </div>
                        <h1 className="text-xl font-heading font-bold text-text-primary uppercase tracking-widest">Admin Control</h1>
                        <p className="text-text-secondary text-xs mt-2 uppercase tracking-wide">System & User Management</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">System Email</label>
                                <Input type="email" placeholder="admin@domain.edu" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-none font-mono text-sm border-border-base" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Access Key</label>
                                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-none font-mono text-sm border-border-base" />
                            </div>
                        </div>

                        <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-none bg-text-primary text-text-inverse hover:bg-text-secondary transition-colors">
                            <span className="font-bold uppercase tracking-wider text-sm">{loading ? 'Initializing...' : 'Initialize Session'}</span>
                            <LogIn className="w-4 h-4" />
                        </Button>

                        {errorMessage && <div className="text-center text-sm font-medium text-danger bg-danger-light/10 p-2 border border-danger/20">{errorMessage}</div>}

                        <div className="mt-8 pt-6 border-t border-border-subtle text-center">
                            <button type="button" onClick={() => navigate('/login')} className="text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent transition-colors">
                                Return to Gate
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLogin;
