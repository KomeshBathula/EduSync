import React from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { Database, ShieldCheck, Settings, LogOut } from 'lucide-react';

const AdminDashboard = () => {
    const navigate = useNavigate();
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-outfit font-bold tracking-tight text-white mb-2 flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-green-400" />
                        System Administration
                    </h1>
                    <p className="text-slate-400">Manage academic hierarchy and holistic system data</p>
                </div>
                <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all font-medium text-sm border border-red-500/20">
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <GlassCard delay={0.1}>
                    <div className="flex justify-between items-center bg-black/20 p-4 border border-white/5 rounded-xl">
                        <div>
                            <p className="text-sm text-slate-400">Server Status</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="font-semibold text-white">Online (Healthy)</span>
                            </div>
                        </div>
                        <Database className="w-6 h-6 text-slate-500" />
                    </div>
                </GlassCard>
            </div>

            <GlassCard delay={0.2} className="w-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold font-outfit">Academic Hierarchy Configurations</h3>
                    <button className="cyber-button !py-2 !px-4 !text-sm flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Add Branch
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-slate-400 text-sm">
                                <th className="py-3 px-4 font-medium uppercase tracking-wider">Year</th>
                                <th className="py-3 px-4 font-medium uppercase tracking-wider">Branch</th>
                                <th className="py-3 px-4 font-medium uppercase tracking-wider">Section</th>
                                <th className="py-3 px-4 font-medium uppercase tracking-wider">Student Count</th>
                                <th className="py-3 px-4 font-medium uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {[
                                { y: '2', b: 'Information Technology', s: 'A', c: 62 },
                                { y: '2', b: 'Information Technology', s: 'B', c: 54 },
                                { y: '3', b: 'Computer Science', s: 'A', c: 71 },
                            ].map((row, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-3 px-4 font-medium text-slate-300">Year {row.y}</td>
                                    <td className="py-3 px-4 text-emerald-300 font-medium">{row.b}</td>
                                    <td className="py-3 px-4">Sec {row.s}</td>
                                    <td className="py-3 px-4 font-mono text-slate-400">{row.c}</td>
                                    <td className="py-3 px-4 text-right">
                                        <button className="text-slate-500 hover:text-white transition-colors text-sm font-medium">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};

export default AdminDashboard;
