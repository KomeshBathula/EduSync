import React from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Upload, Users, ShieldAlert, Zap, LogOut } from 'lucide-react';

const radarData = [
    { subject: 'Arrays', A: 120, B: 110, fullMark: 150 },
    { subject: 'Trees', A: 48, B: 130, fullMark: 150 }, // Weakness
    { subject: 'Sorting', A: 86, B: 130, fullMark: 150 },
    { subject: 'Graphs', A: 65, B: 100, fullMark: 150 }, // Weakness
    { subject: 'DP', A: 35, B: 90, fullMark: 150 }, // Weakness
    { subject: 'HashMaps', A: 140, B: 85, fullMark: 150 },
];

const TeacherDashboard = () => {
    const navigate = useNavigate();
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-outfit font-bold tracking-tight text-white mb-2">Command Center</h1>
                    <p className="text-slate-400">Class AI Insights & Quiz Generation</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="cyber-button flex items-center gap-2 !py-2 !text-sm">
                        <Upload className="w-4 h-4" />
                        <span>Upload Notes</span>
                    </button>
                    <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all font-medium text-sm border border-red-500/20">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { title: 'Total Students', value: '142', icon: <Users />, color: 'text-blue-400' },
                    { title: 'Active Quizzes', value: '8', icon: <Zap />, color: 'text-indigo-400' },
                    { title: 'High Risk Alert', value: '12', icon: <ShieldAlert />, color: 'text-red-400', alert: true },
                    { title: 'Avg. Accuracy', value: '68%', icon: <Users />, color: 'text-green-400' },
                ].map((stat, i) => (
                    <GlassCard key={i} delay={i * 0.1} className={stat.alert ? 'border-red-500/50 bg-red-500/5 relative overflow-hidden' : ''}>
                        {stat.alert && <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/20 blur-xl rounded-full" />}
                        <div className="flex gap-3 items-center mb-4 text-slate-400 h-6">
                            <span className={stat.color}>{stat.icon}</span>
                            <span className="font-medium text-sm">{stat.title}</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{stat.value}</div>
                    </GlassCard>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard delay={0.4} className="h-96">
                    <div className="mb-6">
                        <h3 className="text-xl font-outfit font-bold text-white">Class Mastery Radar</h3>
                        <p className="text-sm text-slate-400">Identify structural weak spots across Section B</p>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                <Radar name="Class Avg" dataKey="A" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.4} />
                                <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1E293B', borderRadius: '12px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                <GlassCard delay={0.5} className="h-96 flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-xl font-outfit font-bold text-white text-red-100 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                            High Risk Students (Intervention Required)
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {[1, 2, 3, 4, 5].map((_, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-red-500/5 border border-red-500/20 rounded-lg hover:bg-red-500/10 cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold font-outfit">S{i}</div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-white">John Doe</h4>
                                        <p className="text-xs text-slate-400">Failed DP Quiz</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-red-400 font-bold tracking-widest uppercase">Risk: 82</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default TeacherDashboard;
