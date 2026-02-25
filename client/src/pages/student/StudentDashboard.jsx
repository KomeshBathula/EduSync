import React from 'react';
import GlassCard from '../../components/common/GlassCard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { BookOpen, AlertTriangle, TrendingUp, Cpu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const data = [
    { name: 'Week 1', score: 65 },
    { name: 'Week 2', score: 68 },
    { name: 'Week 3', score: 75 },
    { name: 'Week 4', score: 72 },
    { name: 'Week 5', score: 85 },
];

const StudentDashboard = () => {
    const navigate = useNavigate();
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen relative">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-3xl font-outfit font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        Welcome back, Alex
                    </h1>
                    <p className="text-slate-400">Your AI-Adaptive Learning Path</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all font-medium text-sm border border-red-500/20">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                    <div className="flex items-center gap-3 glass-card px-4 py-2 !rounded-full">
                        <BookOpen className="text-indigo-400 w-5 h-5" />
                        <span className="font-medium text-sm">Information Technology • Year 2</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col - Progress */}
                <div className="lg:col-span-2 space-y-6">
                    <GlassCard className="h-80" delay={0.1}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-outfit font-bold text-white">Learning Progression</h3>
                                <p className="text-sm text-slate-400">Total points accumulated over time</p>
                            </div>
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <TrendingUp className="text-indigo-400 w-5 h-5" />
                            </div>
                        </div>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#94A3B8' }} />
                                    <YAxis stroke="#475569" tick={{ fill: '#94A3B8' }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: '12px' }}
                                    />
                                    <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCard>

                    {/* Action Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <GlassCard delay={0.2} className="group cursor-pointer hover:bg-white/[0.05] transition-colors relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all" />
                            <Cpu className="text-purple-400 w-8 h-8 mb-4 relative z-10" />
                            <h4 className="text-lg font-bold text-white mb-2 relative z-10">Smart Revision</h4>
                            <p className="text-sm text-slate-400 relative z-10">AI generated quick recap based on your weak areas.</p>
                            <button className="mt-6 text-sm text-purple-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                                Start Revision →
                            </button>
                        </GlassCard>

                        <GlassCard delay={0.3} className="group hover:bg-white/[0.05] cursor-pointer" onClick={() => window.location.href = '/student/quiz/mock-id'}>
                            <h4 className="text-lg font-bold text-white mb-2">Available Quizzes</h4>
                            <p className="text-sm text-slate-400 mb-4">2 New assignments pending</p>

                            <div className="space-y-3">
                                <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex justify-between items-center group-hover:border-indigo-500/30 transition-colors">
                                    <span className="text-sm font-medium">Data Structures</span>
                                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">Medium</span>
                                </div>
                            </div>
                        </GlassCard>
                    </div>
                </div>

                {/* Right Col - Risk Meter & Summary */}
                <div className="space-y-6">
                    <GlassCard className="relative overflow-hidden" delay={0.4}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />

                        <div className="flex items-center gap-3 mb-6">
                            <AlertTriangle className="text-yellow-400 w-6 h-6" />
                            <h3 className="text-xl font-outfit font-bold text-white">Risk Meter</h3>
                        </div>

                        <div className="flex justify-center items-center py-6">
                            {/* Custom SVG Risk Gauge */}
                            <div className="relative w-40 h-40 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r="70"
                                        stroke="#EAB308"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray="440"
                                        strokeDashoffset="180"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute text-center">
                                    <div className="text-3xl font-bold text-yellow-500">54%</div>
                                    <div className="text-xs text-slate-400 uppercase tracking-widest mt-1">Medium</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-sm pl-2 border-l-2 border-yellow-500 text-yellow-100/80">
                                You are struggling with <strong>Binary Trees</strong>. We recommend taking the AI generated revision before attempting the next quiz.
                            </p>
                        </div>
                    </GlassCard>

                    <GlassCard delay={0.5}>
                        <h3 className="text-lg font-bold text-white mb-4">Recommended Resources</h3>
                        <ul className="space-y-4">
                            {[
                                { title: "Binary Trees Explained in 5 mins", tag: "Video", color: "red" },
                                { title: "GFG: Dynamic Programming Basics", tag: "Article", color: "green" },
                            ].map((res, i) => (
                                <li key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/10">
                                    <div className={`p-2 rounded bg-${res.color}-500/20`}>
                                        {/* Placeholder icon box */}
                                        <div className={`w-4 h-4 bg-${res.color}-500 rounded-sm`} />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-medium text-slate-200">{res.title}</h5>
                                        <p className="text-xs text-slate-400">{res.tag}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
