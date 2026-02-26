import React, { useState, useEffect } from 'react';
import GlassCard from '../../components/common/GlassCard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { BookOpen, AlertTriangle, TrendingUp, Cpu, LogOut, Video, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/api/student/dashboard', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setDashboardData(data);
                } else {
                    console.error("Failed to fetch dashboard data");
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) {
        return <div className="h-screen flex items-center justify-center text-white font-outfit text-xl">Loading AI Insights...</div>;
    }

    if (!dashboardData) {
        return <div className="h-screen flex items-center justify-center text-red-400 font-outfit text-xl">Failed to load dashboard.</div>;
    }

    const { user, progressionData, availableQuizzes, riskMetrics, recommendedResources, quizHistory } = dashboardData;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen relative">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-3xl font-outfit font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        Welcome back, {user.name}
                    </h1>
                    <p className="text-slate-400">Your AI-Adaptive Learning Path</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all font-medium text-sm border border-red-500/20">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                    <div className="flex items-center gap-3 glass-card px-4 py-2 !rounded-full">
                        <BookOpen className="text-indigo-400 w-5 h-5" />
                        <span className="font-medium text-sm">{user.contextString}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <GlassCard delay={0.1} onClick={() => navigate('/student/youtube')} className="group cursor-pointer hover:bg-red-500/10 transition-colors border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/20 rounded-xl">
                            <Video className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">YouTube AI</h3>
                            <p className="text-xs text-slate-400">Summarize & Learn via Video</p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard delay={0.2} onClick={() => navigate('/student/doubt-solver')} className="group cursor-pointer hover:bg-emerald-500/10 transition-colors border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <MessageSquare className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">AI Doubt Solver</h3>
                            <p className="text-xs text-slate-400">24/7 Contextual Chatbot</p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard delay={0.3} onClick={() => navigate('/student/smart-revision')} className="col-span-2 group cursor-pointer hover:bg-purple-500/10 transition-colors border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl">
                                <Cpu className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Smart Revision Generator</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-purple-400">Target Weakness: {user.topWeakness}</p>
                            </div>
                        </div>
                        <button className="px-5 py-2 bg-purple-500 text-white font-bold rounded-lg text-sm hover:bg-purple-600 transition-colors">Launch →</button>
                    </div>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col - Progress */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="h-80" delay={0.4}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-outfit font-bold text-white">Learning Progression</h3>
                                <p className="text-sm text-slate-400">Quiz Accuracy Trends</p>
                            </div>
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <TrendingUp className="text-indigo-400 w-5 h-5" />
                            </div>
                        </div>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={progressionData}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#94A3B8' }} />
                                    <YAxis stroke="#475569" tick={{ fill: '#94A3B8' }} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>

                    <GlassCard delay={0.5}>
                        <h4 className="text-lg font-bold text-white mb-2">Available Quizzes</h4>
                        <p className="text-sm text-slate-400 mb-4">{availableQuizzes.length || 0} New assignments pending</p>

                        <div className="space-y-3">
                            {availableQuizzes.length === 0 ? (
                                <p className="text-slate-500 italic text-sm">No new quizzes assigned.</p>
                            ) : (
                                availableQuizzes.map((quiz, i) => (
                                    <div
                                        key={quiz._id || i}
                                        onClick={() => navigate(`/student/quiz/${quiz._id}`)}
                                        className="p-3 rounded-lg bg-black/20 border border-white/5 flex justify-between items-center hover:border-indigo-500/30 transition-colors cursor-pointer"
                                    >
                                        <span className="text-sm font-medium text-slate-200">{quiz.title}</span>
                                        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">{quiz.baseDifficulty || 'Mixed'}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>

                    <GlassCard delay={0.55}>
                        <h4 className="text-lg font-bold text-white mb-2">Recent Quiz Results</h4>
                        <p className="text-sm text-slate-400 mb-4">Your performance on previous assessments</p>

                        <div className="space-y-3">
                            {!quizHistory || quizHistory.length === 0 ? (
                                <p className="text-slate-500 italic text-sm">You haven't attempted any quizzes yet.</p>
                            ) : (
                                quizHistory.map((qr, i) => (
                                    <div
                                        key={qr.id || i}
                                        className="p-3 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-2 hover:border-green-500/30 transition-colors"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-slate-200">{qr.title}</span>
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${qr.score >= 80 ? 'bg-green-500/20 text-green-400' : qr.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {Math.round(qr.score)}% Score
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">Attempted: {new Date(qr.date).toLocaleDateString()}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Right Col - Risk Meter & Summary */}
                <div className="space-y-6">
                    <GlassCard className="relative overflow-hidden" delay={0.6}>
                        {riskMetrics.label === 'HIGH' && <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />}
                        {riskMetrics.label === 'MEDIUM' && <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />}
                        {riskMetrics.label === 'LOW' && <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />}

                        <div className="flex items-center gap-3 mb-6">
                            <AlertTriangle className={`w-6 h-6 ${riskMetrics.label === 'HIGH' ? 'text-red-500' : riskMetrics.label === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'}`} />
                            <h3 className="text-xl font-outfit font-bold text-white">Risk Meter</h3>
                        </div>

                        <div className="flex justify-center items-center py-6">
                            <div className="relative w-40 h-40 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        stroke={riskMetrics.label === 'HIGH' ? '#EF4444' : riskMetrics.label === 'MEDIUM' ? '#EAB308' : '#22C55E'}
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray="440"
                                        strokeDashoffset={440 - (440 * riskMetrics.score) / 100}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute text-center">
                                    <div className={`text-3xl font-bold ${riskMetrics.label === 'HIGH' ? 'text-red-500' : riskMetrics.label === 'MEDIUM' ? 'text-yellow-500' : 'text-green-500'}`}>{riskMetrics.score}%</div>
                                    <div className="text-xs text-slate-400 uppercase tracking-widest mt-1">{riskMetrics.label}</div>
                                </div>
                            </div>
                        </div>

                        {user.topWeakness !== 'None detected yet' && (
                            <div className={`mt-4 p-4 rounded-xl ${riskMetrics.label === 'HIGH' ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                                <p className={`text-sm pl-2 border-l-2 ${riskMetrics.label === 'HIGH' ? 'border-red-500 text-red-100/80' : 'border-yellow-500 text-yellow-100/80'}`}>
                                    You are struggling with <strong>{user.topWeakness}</strong>. We recommend targeting this area immediately.
                                </p>
                            </div>
                        )}
                    </GlassCard>

                    <GlassCard delay={0.7}>
                        <h3 className="text-lg font-bold text-white mb-4">Class Materials</h3>
                        <ul className="space-y-4">
                            {recommendedResources.length === 0 ? (
                                <p className="text-slate-500 italic text-sm">No notes have been uploaded to your section yet.</p>
                            ) : (
                                recommendedResources.map((res, i) => (
                                    <li key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/10" onClick={() => window.open(`${window.location.origin}${res.url}`, '_blank')}>
                                        <div className="flex gap-3 items-center">
                                            <div className="p-2 rounded bg-indigo-500/20">
                                                <div className="w-4 h-4 bg-indigo-500 rounded-sm" />
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-medium text-slate-200">{res.title}</h5>
                                                <p className="text-xs text-slate-400 font-bold uppercase">{res.type}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">View</span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
