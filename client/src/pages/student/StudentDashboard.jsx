import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import PageContainer from '../../components/common/PageContainer';
import SectionHeader from '../../components/common/SectionHeader';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { BookOpen, AlertTriangle, TrendingUp, Cpu, LogOut, Video, MessageSquare, ArrowRight, FileText, Sparkles, Loader2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import NotificationBell from '../../components/common/NotificationBell';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recommendations, setRecommendations] = useState(null);
    const [recsLoading, setRecsLoading] = useState(false);

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

    const handleGetRecommendations = async () => {
        setRecsLoading(true);
        try {
            const res = await api.get('/api/student/recommendations');
            setRecommendations(res.data);
        } catch (error) {
            console.error('Failed to get recommendations:', error);
        } finally {
            setRecsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-text-secondary font-body text-xl">Loading Interface...</div>;
    }

    if (!dashboardData) {
        return <div className="min-h-screen flex items-center justify-center text-danger font-body text-xl">Failed to load dashboard data.</div>;
    }

    const { user, progressionData, availableQuizzes, riskMetrics, recommendedResources, quizHistory } = dashboardData;

    return (
        <PageContainer>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-heading font-bold tracking-tight text-text-primary mb-1">
                        Welcome back, {user.name}
                    </h1>
                    <p className="text-text-secondary">Your Adaptive Learning Path</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge color="primary" className="px-3 py-1.5 flex items-center gap-2 bg-surface">
                        <BookOpen className="w-4 h-4" />
                        <span className="font-medium text-sm">{user.contextString}</span>
                    </Badge>
                    <NotificationBell />
                    <Button variant="danger" onClick={handleLogout} className="px-4 py-2 text-sm flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </Button>
                </div>
            </div>

            {/* Quick Actions Grid - Asymmetrical Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                <Card level={2} onClick={() => navigate('/student/youtube')} className="md:col-span-3 cursor-pointer group hover:border-danger hover:shadow-level3">
                    <div className="p-6 flex flex-col h-full justify-between gap-4">
                        <div className="w-12 h-12 bg-danger-light/10 text-danger rounded-xl flex items-center justify-center group-hover:bg-danger-light/20 transition-colors">
                            <Video className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">YouTube AI</h3>
                            <p className="text-sm text-text-secondary">Summarize & Learn via Video</p>
                        </div>
                    </div>
                </Card>

                <Card level={2} onClick={() => navigate('/student/doubt-solver')} className="md:col-span-3 cursor-pointer group hover:border-success hover:shadow-level3">
                    <div className="p-6 flex flex-col h-full justify-between gap-4">
                        <div className="w-12 h-12 bg-success-light/10 text-success rounded-xl flex items-center justify-center group-hover:bg-success-light/20 transition-colors">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary">AI Doubt Solver</h3>
                            <p className="text-sm text-text-secondary">24/7 Contextual Chatbot</p>
                        </div>
                    </div>
                </Card>

                <Card level={2} onClick={() => navigate('/student/smart-revision')} className="md:col-span-6 cursor-pointer group hover:border-primary hover:shadow-level3 bg-primary text-text-inverse">
                    <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 h-full">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-surface/20 rounded-xl flex items-center justify-center">
                                <Cpu className="w-6 h-6 text-surface" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Smart Revision Generator</h3>
                                <p className="text-sm text-primary-light font-medium uppercase tracking-widest mt-1">Target Weakness: {user.topWeakness}</p>
                            </div>
                        </div>
                        <div className="w-10 h-10 bg-surface text-primary rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col - Progress & Activity */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="p-6 h-96 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-heading font-bold text-text-primary">Progression Analytics</h3>
                                <p className="text-sm text-text-secondary">Quiz Accuracy Trends</p>
                            </div>
                            <div className="p-2 bg-primary-light/10 text-primary rounded-lg border border-primary/20">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={progressionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-primary-base)" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="var(--color-primary-base)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-surface-base)', borderColor: 'var(--color-border-base)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                                    />
                                    <Area type="monotone" dataKey="score" stroke="var(--color-primary-base)" strokeWidth={3} fill="url(#colorScore)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6">
                            <h4 className="text-lg font-bold text-text-primary mb-1">Available Quizzes</h4>
                            <p className="text-sm text-text-secondary mb-6">{availableQuizzes.length || 0} New assignments pending</p>

                            <div className="space-y-3">
                                {availableQuizzes.length === 0 ? (
                                    <p className="text-text-secondary text-sm bg-surface-alt p-4 rounded-[var(--radius-sm)] border border-border-subtle">No new quizzes assigned.</p>
                                ) : (
                                    availableQuizzes.map((quiz, i) => (
                                        <div
                                            key={quiz._id || i}
                                            onClick={() => navigate(`/student/quiz/${quiz._id}`)}
                                            className="p-4 rounded-[var(--radius-md)] bg-surface border border-border-base flex justify-between items-center hover:border-primary hover:shadow-level1 transition-all cursor-pointer group"
                                        >
                                            <span className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors">{quiz.title}</span>
                                            <Badge color="primary">{quiz.baseDifficulty || 'Mixed'}</Badge>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h4 className="text-lg font-bold text-text-primary mb-1">Quiz Timeline</h4>
                            <p className="text-sm text-text-secondary mb-6">Recent assessment results</p>

                            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border-base before:to-transparent">
                                {!quizHistory || quizHistory.length === 0 ? (
                                    <p className="text-text-secondary text-sm bg-surface-alt p-4 rounded-[var(--radius-sm)] border border-border-subtle relative z-10">You haven't attempted any quizzes yet.</p>
                                ) : (
                                    quizHistory.map((qr, i) => {
                                        const isHigh = qr.score >= 80;
                                        const isMed = qr.score >= 50;
                                        const dotBg = isHigh ? 'bg-success-light/20' : isMed ? 'bg-warning-light/20' : 'bg-danger-light/20';
                                        const innerDot = isHigh ? 'bg-success' : isMed ? 'bg-warning' : 'bg-danger';
                                        const colorStr = isHigh ? 'success' : isMed ? 'warning' : 'danger';

                                        return (
                                            <div key={qr.id || i} className="relative z-10 flex items-center gap-4">
                                                <div className={`w-8 h-8 flex-shrink-0 rounded-full ${dotBg} flex items-center justify-center border-2 border-surface`}>
                                                    <div className={`w-2.5 h-2.5 rounded-full ${innerDot}`}></div>
                                                </div>
                                                <div className="flex-1 p-3 rounded-[var(--radius-md)] bg-surface border border-border-base">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-semibold text-text-primary">{qr.title}</span>
                                                        <span className="text-xs text-text-secondary">{new Date(qr.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <Badge color={colorStr}>{Math.round(qr.score)}% Score</Badge>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Right Col - Risk Meter & Documents */}
                <div className="space-y-8">
                    <Card className="p-6 flex flex-col items-center">
                        <div className="w-full flex items-center gap-3 mb-8">
                            <div className={`p-2 rounded-lg ${riskMetrics.label === 'HIGH' ? 'bg-danger/10 text-danger' : riskMetrics.label === 'MEDIUM' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-heading font-bold text-text-primary">Academic Risk</h3>
                        </div>

                        <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                            <svg className="w-full h-full transform -rotate-90 drop-shadow-sm">
                                <circle cx="96" cy="96" r="84" stroke="var(--color-border-subtle)" strokeWidth="16" fill="none" />
                                <motion.circle
                                    initial={{ strokeDashoffset: 528 }}
                                    animate={{ strokeDashoffset: 528 - (528 * riskMetrics.score) / 100 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    cx="96"
                                    cy="96"
                                    r="84"
                                    stroke={riskMetrics.label === 'HIGH' ? 'var(--color-danger-base)' : riskMetrics.label === 'MEDIUM' ? 'var(--color-warning-base)' : 'var(--color-success-base)'}
                                    strokeWidth="16"
                                    fill="none"
                                    strokeDasharray="528"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center text-center">
                                <div className={`text-4xl font-mono font-bold tracking-tighter ${riskMetrics.label === 'HIGH' ? 'text-danger' : riskMetrics.label === 'MEDIUM' ? 'text-warning' : 'text-success'}`}>{riskMetrics.score}%</div>
                                <div className="text-xs font-bold text-text-secondary uppercase tracking-widest mt-1">{riskMetrics.label}</div>
                            </div>
                        </div>

                        {user.topWeakness !== 'None detected yet' && (
                            <div className="w-full flex flex-col items-center justify-center p-4 rounded-[var(--radius-sm)] bg-surface-alt border border-border-base text-center">
                                <span className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">Primary Weakness</span>
                                <Badge color="danger" className="text-sm px-3 py-1">{user.topWeakness}</Badge>
                            </div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-surface-alt border border-border-base text-text-secondary">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary">Course Materials</h3>
                        </div>

                        <ul className="space-y-3">
                            {recommendedResources.length === 0 ? (
                                <p className="text-text-secondary text-sm bg-surface-alt p-4 rounded-[var(--radius-sm)] border border-border-subtle">No materials uploaded yet.</p>
                            ) : (
                                recommendedResources.map((res, i) => (
                                    <li
                                        key={i}
                                        className="flex flex-col p-4 rounded-[var(--radius-md)] bg-surface border border-border-base hover:border-primary hover:shadow-level1 transition-all cursor-pointer group"
                                        onClick={() => {
                                            const token = localStorage.getItem('token');
                                            window.open(`${import.meta.env.VITE_API_URL || ''}${res.url}${token ? `?token=${token}` : ''}`, '_blank');
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <h5 className="text-sm font-semibold text-text-primary leading-tight group-hover:text-primary transition-colors">{res.title}</h5>
                                            <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                                        </div>
                                        <div className="flex items-center text-xs text-text-secondary gap-2">
                                            <span className="uppercase font-mono">{res.type}</span>
                                            <span>•</span>
                                            <span>AI Recommended</span>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </Card>

                    {/* AI Adaptive Recommendations */}
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-primary-light/10 text-primary border border-primary/20">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary">AI Study Plan</h3>
                        </div>

                        {!recommendations && !recsLoading && (
                            <button
                                onClick={handleGetRecommendations}
                                className="w-full py-3 bg-primary hover:bg-primary-light text-text-inverse font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Sparkles className="w-4 h-4" /> Get Personalized Recommendations
                            </button>
                        )}

                        {recsLoading && (
                            <div className="flex flex-col items-center py-6">
                                <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                                <p className="text-xs text-text-secondary">Analyzing your learning profile...</p>
                            </div>
                        )}

                        {recommendations && (
                            <div className="space-y-4">
                                {recommendations.priorityTopics?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Priority Topics</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {recommendations.priorityTopics.map((t, i) => (
                                                <Badge key={i} color="danger" className="text-xs">{t}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {recommendations.studyPlan?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Study Plan</h4>
                                        <ul className="space-y-2">
                                            {recommendations.studyPlan.map((step, i) => (
                                                <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                                    {step}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {recommendations.youtubeSearchTerms?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Recommended Searches</h4>
                                        <div className="space-y-1.5">
                                            {recommendations.youtubeSearchTerms.map((term, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:text-primary-light transition-colors" onClick={() => navigate('/student/youtube')}>
                                                    <Search className="w-3 h-3" />
                                                    <span className="underline underline-offset-2">{term}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {recommendations.motivationalNote && (
                                    <div className="p-3 rounded-lg bg-success/5 border border-success/20 mt-2">
                                        <p className="text-xs text-success font-medium">{recommendations.motivationalNote}</p>
                                    </div>
                                )}

                                <button onClick={handleGetRecommendations} className="w-full mt-2 py-2 text-sm text-primary font-medium hover:bg-primary/5 rounded-lg border border-primary/20 transition-all flex items-center justify-center gap-2">
                                    <Sparkles className="w-3 h-3" /> Refresh
                                </button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
};

export default StudentDashboard;
