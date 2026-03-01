import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, LineChart, ArrowLeft } from 'lucide-react';
import api from '../../api/axios';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

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
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 relative">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px]"></div>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md z-10">
                <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors mb-6 font-medium text-sm">
                    <ArrowLeft className="w-4 h-4" /> Back to Portals
                </button>

                <Card className="p-8 border-t-4 border-t-secondary shadow-level3">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-secondary/10 text-secondary mb-4">
                            <LineChart className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-heading font-extrabold text-text-primary tracking-tight">Faculty Access</h1>
                        <p className="text-text-secondary text-sm mt-3 font-medium">Manage your classes and monitor insights</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <Input icon={Mail} type="email" placeholder="Faculty Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <Input icon={Lock} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

                        <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 mt-2 shadow-lg hover:shadow-xl transition-all h-12 text-base font-bold bg-secondary hover:bg-secondary-hover text-white">
                            <span>{loading ? 'Authenticating...' : 'Authenticate'}</span>
                            <LogIn className="w-5 h-5" />
                        </Button>

                        {errorMessage && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-sm font-bold text-danger bg-danger/10 py-3 rounded-lg border border-danger/20">
                                {errorMessage}
                            </motion.div>
                        )}
                    </form>
                </Card>
            </motion.div>
        </div>
    );
};

export default TeacherLogin;
