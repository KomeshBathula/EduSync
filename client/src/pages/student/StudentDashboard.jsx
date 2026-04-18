import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import PageContainer from '../../components/common/PageContainer';
import Badge from '../../components/common/Badge';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, AlertTriangle, Play, BrainCircuit, LogOut, Video, MessageSquare, ArrowRight, FileText, Sparkles, Loader2, X, Download, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import NotificationBell from '../../components/common/NotificationBell';

// --- Helper Components ---

const RiskArc = ({ score, label }) => {
    // Math for half-circle arc
    const radius = 80;
    const circumference = Math.PI * radius; // Half circle
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    let colorClass = 'text-success-base';
    let strokeColor = 'var(--color-success-base)';
    let bgColor = 'var(--color-success-light)';
    let msg = "On track";

    if (label === 'MEDIUM') {
        colorClass = 'text-warning-base';
        strokeColor = 'var(--color-warning-base)';
        bgColor = 'var(--color-warning-light)';
        msg = "Needs attention";
    } else if (label === 'HIGH') {
        colorClass = 'text-danger-base';
        strokeColor = 'var(--color-danger-base)';
        bgColor = 'var(--color-danger-light)';
        msg = "Critical risk";
    }

    return (
        <div className="relative w-full flex flex-col items-center">
            <div className="relative w-48 h-28 overflow-hidden flex justify-center">
                <svg className="w-48 h-48 transform rotate-180" viewBox="0 0 200 200">
                    {/* Background Arc */}
                    <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--color-border-subtle)" strokeWidth="16" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset="0" />
                    {/* Foreground Arc */}
                    <motion.circle 
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        cx="100" cy="100" r={radius} fill="none" stroke={strokeColor} strokeWidth="16" strokeDasharray={`${circumference} ${circumference}`} strokeLinecap="round" 
                    />
                </svg>
                <div className="absolute bottom-0 left-0 w-full flex flex-col items-center pb-2">
                    <span className={`text-4xl font-heading font-bold ${colorClass}`}>{score}%</span>
                </div>
            </div>
            <div className="text-center mt-2">
                <Badge className="uppercase tracking-widest text-[10px] font-bold px-2 py-0.5" style={{ backgroundColor: `${bgColor}20`, color: strokeColor }}>
                    {label} RISK
                </Badge>
                <p className="text-xs text-text-secondary mt-1">{msg}</p>
            </div>
        </div>
    );
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [viewingMaterial, setViewingMaterial] = useState(null);

    // Dynamic Greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await api.get('/api/student/dashboard');
                setDashboardData(res.data);
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
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-text-secondary font-medium">Initializing Workspace...</p>
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return <div className="min-h-screen flex items-center justify-center text-danger font-body text-xl">Failed to load workspace.</div>;
    }

    const { user, progressionData, availableQuizzes, riskMetrics, recommendedResources, quizHistory } = dashboardData;

    // Calculate progression narrative
    const hasProgressData = progressionData && progressionData.length >= 2;
    const firstScore = hasProgressData ? progressionData[0].score : 0;
    const latestScore = hasProgressData ? progressionData[progressionData.length - 1].score : 0;
    const scoreDiff = Math.round(latestScore - firstScore);
    const isImproving = scoreDiff > 0;

    return (
        <PageContainer>
            {/* 1. Header & Command Center Greeting */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-2 text-sm text-text-secondary mb-2 font-medium">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span>{user.contextString}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary tracking-tight">
                        {getGreeting()}, {user.name.split(' ')[0]}.
                    </h1>
                    <p className="text-text-secondary mt-2 text-lg">Ready to improve today?</p>
                </div>
                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <button onClick={handleLogout} className="p-2.5 rounded-xl border border-border-base text-text-secondary hover:bg-surface-alt hover:text-danger transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 2. Smart Focus Panel (Actionable Priority) */}
            <div className="mb-10">
                <div className="bg-primary/5 border border-primary/20 rounded-[var(--radius-xl)] p-1">
                    <div className="bg-surface rounded-[calc(var(--radius-xl)-4px)] p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-xl font-bold text-text-primary mb-2">Today's Focus: {user.topWeakness !== 'None detected yet' ? user.topWeakness : 'General Revision'}</h2>
                            <p className="text-text-secondary max-w-2xl">
                                {riskMetrics.label === 'HIGH' 
                                    ? "Your risk level is high. We strongly recommend generating a Smart Revision plan to tackle your weak areas immediately."
                                    : availableQuizzes.length > 0 
                                        ? `You have ${availableQuizzes.length} pending assignments. Knocking one out now will keep you on track.`
                                        : "You're caught up on assignments. Use the AI Doubt Solver to clarify any lingering questions from today's lectures."}
                            </p>
                        </div>
                        <div className="flex-shrink-0 w-full md:w-auto">
                            <button 
                                onClick={() => navigate('/student/smart-revision')}
                                className="w-full md:w-auto px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-all shadow-level1 hover:shadow-level2 flex items-center justify-center gap-2"
                            >
                                Generate Study Plan <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: Narrative & Tasks (Span 8) */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Progress Story */}
                    <Card className="p-6 md:p-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8 relative z-10">
                            <div>
                                <h3 className="text-xl font-bold font-heading text-text-primary mb-1">Your Progress Story</h3>
                                {hasProgressData ? (
                                    <p className="text-text-secondary text-sm">
                                        You started at <span className="font-bold text-text-primary">{firstScore}%</span> and are now at <span className="font-bold text-text-primary">{latestScore}%</span>. 
                                        {isImproving ? (
                                            <span className="text-success ml-1 inline-flex items-center gap-1"><TrendingUp className="w-3 h-3"/> That's a +{scoreDiff}% improvement.</span>
                                        ) : (
                                            <span className="text-warning ml-1"> Let's work on getting those numbers back up.</span>
                                        )}
                                    </p>
                                ) : (
                                    <p className="text-text-secondary text-sm">Complete more quizzes to see your growth story here.</p>
                                )}
                            </div>
                            <div className="flex-shrink-0 bg-surface-alt px-4 py-2 rounded-lg border border-border-subtle">
                                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Current Accuracy</span>
                                <div className="text-2xl font-bold text-text-primary">{latestScore}%</div>
                            </div>
                        </div>

                        <div className="h-56 w-full relative z-10 -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={progressionData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary-base)" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="var(--color-primary-base)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-surface-base)', borderColor: 'var(--color-border-base)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-level2)', padding: '8px 12px' }}
                                        itemStyle={{ color: 'var(--color-primary-base)', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="score" stroke="var(--color-primary-base)" strokeWidth={3} fill="url(#colorScore)" activeDot={{ r: 6, fill: 'var(--color-primary-base)', stroke: 'var(--color-surface-base)', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Task List: Quizzes & Materials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Quizzes */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-text-primary">Assignments</h3>
                                {availableQuizzes.length > 0 && <Badge color="primary">{availableQuizzes.length} Pending</Badge>}
                            </div>
                            
                            <div className="space-y-3">
                                {availableQuizzes.length === 0 ? (
                                    <div className="p-6 border border-dashed border-border-base rounded-[var(--radius-lg)] text-center bg-surface-alt/50">
                                        <CheckCircle2 className="w-8 h-8 text-success/50 mx-auto mb-2" />
                                        <p className="text-sm text-text-secondary">You are all caught up!</p>
                                    </div>
                                ) : (
                                    availableQuizzes.map((quiz, i) => (
                                        <div key={quiz._id} onClick={() => navigate(`/student/quiz/${quiz._id}`)} className="group p-4 bg-surface border border-border-base rounded-[var(--radius-lg)] hover:border-primary hover:shadow-level1 cursor-pointer transition-all flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                                                <Play className="w-4 h-4 ml-0.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-text-primary truncate">{quiz.title}</h4>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> ~15 mins</span>
                                                    <span>•</span>
                                                    <span className={quiz.baseDifficulty === 'HARD' ? 'text-danger' : quiz.baseDifficulty === 'MEDIUM' ? 'text-warning' : 'text-success'}>
                                                        {quiz.baseDifficulty || 'Mixed'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Materials */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-text-primary">Class Materials</h3>
                            </div>
                            
                            <div className="space-y-3">
                                {recommendedResources.length === 0 ? (
                                    <div className="p-6 border border-dashed border-border-base rounded-[var(--radius-lg)] text-center bg-surface-alt/50">
                                        <FileText className="w-8 h-8 text-text-secondary/50 mx-auto mb-2" />
                                        <p className="text-sm text-text-secondary">No materials uploaded yet.</p>
                                    </div>
                                ) : (
                                    recommendedResources.slice(0, 4).map((res, i) => (
                                        <div 
                                            key={i} 
                                            className="group p-3 bg-surface border border-border-base rounded-[var(--radius-lg)] hover:border-secondary hover:shadow-level1 cursor-pointer transition-all flex items-center gap-3"
                                            onClick={async () => {
                                                if (downloadingId) return;
                                                try {
                                                    setDownloadingId(res.id);
                                                    const response = await api.get(res.url, { responseType: 'blob' });
                                                    const file = new Blob([response.data], { type: response.headers['content-type'] });
                                                    const fileURL = URL.createObjectURL(file);
                                                    setViewingMaterial({ url: fileURL, title: res.title, type: res.type || response.headers['content-type'] });
                                                } catch (error) {
                                                    console.error('Failed to load material', error);
                                                    alert('Failed to open material.');
                                                } finally {
                                                    setDownloadingId(null);
                                                }
                                            }}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0 text-secondary">
                                                {downloadingId === res.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-text-primary truncate group-hover:text-secondary transition-colors">{res.title}</h4>
                                                <p className="text-xs text-text-secondary uppercase tracking-wider mt-0.5">{res.type}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Tools & Risk (Span 4) */}
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* Risk Meter Redesign */}
                    <Card className="p-6 md:p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-text-primary">Status</h3>
                            <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center border border-border-subtle">
                                <AlertTriangle className="w-4 h-4 text-text-secondary" />
                            </div>
                        </div>
                        
                        <RiskArc score={riskMetrics.score} label={riskMetrics.label} />
                        
                        {user.topWeakness !== 'None detected yet' && (
                            <div className="mt-8 pt-6 border-t border-border-subtle">
                                <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-2">Crucial Weakness</p>
                                <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl flex items-start gap-3">
                                    <BrainCircuit className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                                    <span className="text-sm font-medium text-danger-base leading-tight">{user.topWeakness}</span>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* AI Tool Launcher */}
                    <div>
                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 px-1">AI Tool Launcher</h3>
                        <div className="space-y-3">
                            <button onClick={() => navigate('/student/doubt-solver')} className="w-full text-left group p-4 bg-surface border border-border-base hover:border-primary rounded-[var(--radius-lg)] transition-all shadow-sm hover:shadow-level1 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-text-primary">Doubt Solver</h4>
                                    <p className="text-xs text-text-secondary mt-0.5">24/7 Contextual Tutor</p>
                                </div>
                            </button>

                            <button onClick={() => navigate('/student/youtube')} className="w-full text-left group p-4 bg-surface border border-border-base hover:border-danger rounded-[var(--radius-lg)] transition-all shadow-sm hover:shadow-level1 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Video className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-text-primary">YouTube AI</h4>
                                    <p className="text-xs text-text-secondary mt-0.5">Summarize & Test Videos</p>
                                </div>
                            </button>

                            <button onClick={() => navigate('/student/smart-revision')} className="w-full text-left group p-4 bg-surface border border-border-base hover:border-accent rounded-[var(--radius-lg)] transition-all shadow-sm hover:shadow-level1 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-text-primary">Smart Revision</h4>
                                    <p className="text-xs text-text-secondary mt-0.5">Generate Study Plans</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Viewer Modal (Unchanged structurally, naturally inherits new styles) */}
            <AnimatePresence>
                {viewingMaterial && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/40 backdrop-blur-sm"
                        onClick={() => { URL.revokeObjectURL(viewingMaterial.url); setViewingMaterial(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-5xl h-[85vh] bg-surface rounded-[var(--radius-xl)] shadow-level3 flex flex-col overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-border-base bg-surface-alt">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><FileText className="w-5 h-5" /></div>
                                    <h3 className="font-bold text-text-primary truncate max-w-md">{viewingMaterial.title}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { const a = document.createElement('a'); a.href = viewingMaterial.url; a.download = viewingMaterial.title; a.click(); }} className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center gap-2">
                                        <Download className="w-4 h-4" /> Download
                                    </button>
                                    <button onClick={() => { URL.revokeObjectURL(viewingMaterial.url); setViewingMaterial(null); }} className="p-2 rounded-lg text-text-secondary hover:bg-border-base transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-surface-hover/30 relative">
                                <iframe src={viewingMaterial.url} className="w-full h-full border-none" title={viewingMaterial.title} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageContainer>
    );
};

export default StudentDashboard;
