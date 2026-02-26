import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import PageContainer from '../../components/common/PageContainer';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Upload, Users, ShieldAlert, Zap, LogOut, ChevronDown, X, FileText, BrainCircuit, Trash2, TrendingUp, Clock, Activity, Shield, AlertTriangle, Eye, Filter } from 'lucide-react';
import api from '../../api/axios';

const TeacherDashboard = () => {
    const navigate = useNavigate();

    const [structures, setStructures] = useState([]);
    const [selectedContextId, setSelectedContextId] = useState('');
    const [analytics, setAnalytics] = useState({
        totalStudents: 0,
        activeQuizzes: 0,
        highRiskCount: 0,
        avgAccuracy: 0,
        radarData: [],
        highRiskStudents: [],
        recentQuizzes: [],
        recentMaterials: [],
        allStudents: []
    });

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadContextId, setUploadContextId] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [quizForm, setQuizForm] = useState({
        targetAudienceId: '',
        title: '',
        topic: '',
        difficulty: 'MEDIUM',
        numQuestions: 5,
        document: null
    });
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

    const [activityLog, setActivityLog] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);

    const [integrityQuizId, setIntegrityQuizId] = useState('');
    const [integritySummary, setIntegritySummary] = useState([]);
    const [integrityLoading, setIntegrityLoading] = useState(false);
    const [integrityFilter, setIntegrityFilter] = useState('all'); // all | flagged | auto-submitted
    
    // Quizzes for Integrity Monitor dropdown
    const [sectionQuizzes, setSectionQuizzes] = useState([]);
    const [sectionQuizzesLoading, setSectionQuizzesLoading] = useState(false);

    useEffect(() => {
        // Fetch public academic structures
        api.get('/api/academic/public')
            .then((res) => {
                if (Array.isArray(res.data)) {
                    setStructures([{ _id: 'all', year: 'All', branch: 'Sections', section: '(Global)' }, ...res.data]);
                    setSelectedContextId('all');
                }
            })
            .catch((err) => console.error("Failed fetching structures:", err));
    }, []);

    useEffect(() => {
        setActivityLoading(true);
        api.get('/api/activity/my?limit=10')
            .then(res => setActivityLog(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error('Failed fetching activity:', err))
            .finally(() => setActivityLoading(false));
    }, []);

    const formatRelativeTime = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const ACTION_META = {
        QUIZ_CREATE: { label: 'Created Quiz', color: 'text-primary', bg: 'bg-primary-light/10' },
        QUIZ_DELETE: { label: 'Deleted Quiz', color: 'text-danger', bg: 'bg-danger/10' },
        MATERIAL_UPLOAD: { label: 'Uploaded Material', color: 'text-success', bg: 'bg-success/10' },
        MATERIAL_DELETE: { label: 'Deleted Material', color: 'text-danger', bg: 'bg-danger/10' },
        USER_CREATE: { label: 'Created User', color: 'text-primary', bg: 'bg-primary-light/10' },
        USER_UPDATE: { label: 'Updated User', color: 'text-warning', bg: 'bg-warning/10' },
        USER_DELETE: { label: 'Deleted User', color: 'text-danger', bg: 'bg-danger/10' },
        STRUCTURE_CREATE: { label: 'Created Structure', color: 'text-primary', bg: 'bg-primary-light/10' },
        STRUCTURE_UPDATE: { label: 'Updated Structure', color: 'text-warning', bg: 'bg-warning/10' },
        STRUCTURE_DELETE: { label: 'Deleted Structure', color: 'text-danger', bg: 'bg-danger/10' },
    };

    useEffect(() => {
        if (!selectedContextId) return;

        api.get(`/api/academic/${selectedContextId}/analytics`)
            .then((res) => {
                if (res.data && !res.data.message) {
                    setAnalytics(res.data);
                }
            })
            .catch((err) => console.error("Failed fetching analytics:", err));
    }, [selectedContextId]);

    // Fetch quizzes for Integrity Monitor dropdown when section changes
    useEffect(() => {
        if (!selectedContextId || selectedContextId === 'all') {
            setSectionQuizzes([]);
            setIntegrityQuizId('');
            return;
        }

        setSectionQuizzesLoading(true);
        api.get(`/api/quiz/section/${selectedContextId}`)
            .then((res) => {
                if (res.data?.success && Array.isArray(res.data.quizzes)) {
                    setSectionQuizzes(res.data.quizzes);
                } else {
                    setSectionQuizzes([]);
                }
            })
            .catch((err) => {
                console.error("Failed fetching section quizzes:", err);
                setSectionQuizzes([]);
            })
            .finally(() => setSectionQuizzesLoading(false));
    }, [selectedContextId]);

    const handleContextChange = (e) => {
        setSelectedContextId(e.target.value);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadFile) return alert("Please select a file to upload.");
        if (!uploadContextId) return alert("Please select a target section.");

        setIsUploading(true);
        const formData = new FormData();
        formData.append('document', uploadFile);
        formData.append('title', uploadTitle);
        formData.append('academicContextId', uploadContextId);

        try {
            await api.post('/api/materials/upload', formData);
            alert("Notes uploaded successfully!");
            setIsUploadModalOpen(false);
            setUploadTitle('');
            setUploadFile(null);
            setUploadContextId('');

            if (selectedContextId) {
                const refreshRes = await api.get(`/api/academic/${selectedContextId}/analytics`);
                if (refreshRes.data) {
                    setAnalytics(refreshRes.data);
                }
            }
        } catch (error) {
            console.error(error);
            alert(error?.response?.data?.message || "Error uploading file.");
        } finally {
            setIsUploading(false);
        }
    };

    const fetchIntegritySummary = async (quizId) => {
        if (!quizId) { setIntegritySummary([]); return; }
        setIntegrityLoading(true);
        try {
            const res = await api.get(`/api/quiz/${quizId}/integrity/summary`);
            setIntegritySummary(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed fetching integrity summary:', err);
            setIntegritySummary([]);
        } finally {
            setIntegrityLoading(false);
        }
    };

    const handleIntegrityQuizChange = (quizId) => {
        setIntegrityQuizId(quizId);
        setIntegrityFilter('all');
        fetchIntegritySummary(quizId);
    };

    const filteredIntegrity = integritySummary.filter(row => {
        if (integrityFilter === 'flagged') return row.totalViolations >= 2;
        if (integrityFilter === 'auto-submitted') return row.autoSubmitted;
        return true;
    });

    const VIOLATION_LABELS = {
        TAB_SWITCH: 'Tab Switch',
        WINDOW_BLUR: 'Window Blur',
        COPY_ATTEMPT: 'Copy',
        PASTE_ATTEMPT: 'Paste',
        RIGHT_CLICK: 'Right Click',
        DEVTOOLS_ATTEMPT: 'Dev Tools',
        SCREENSHOT_KEY: 'Screenshot',
        FULLSCREEN_EXIT: 'Fullscreen Exit',
        MULTIPLE_VIOLATIONS: 'Multiple',
    };

    const handleDeleteQuiz = async (quizId) => {
        if (!window.confirm('Are you sure you want to delete this AI Quiz and all associated student results?')) return;
        try {
            await api.delete(`/api/quiz/${quizId}`);
            setAnalytics(prev => ({ ...prev, recentQuizzes: prev.recentQuizzes.filter(q => q._id !== quizId) }));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteMaterial = async (materialId) => {
        if (!window.confirm('Are you sure you want to delete these class notes? Students will lose access immediately.')) return;
        try {
            await api.delete(`/api/materials/${materialId}`);
            setAnalytics(prev => ({ ...prev, recentMaterials: prev.recentMaterials.filter(m => m._id !== materialId) }));
        } catch (error) {
            console.error(error);
        }
    };

    const handleQuizSubmit = async (e) => {
        e.preventDefault();
        if (!quizForm.targetAudienceId) return alert("Select a target class section.");
        if (!quizForm.title.trim()) return alert("Enter a quiz title.");
        if (!quizForm.topic.trim() && !quizForm.document) return alert("Provide either a topic name or upload a PDF file.");

        setIsGeneratingQuiz(true);
        const formData = new FormData();
        formData.append('targetAudienceId', quizForm.targetAudienceId);
        formData.append('title', quizForm.title.trim());
        formData.append('topic', quizForm.topic.trim());
        formData.append('difficulty', quizForm.difficulty);
        formData.append('numQuestions', quizForm.numQuestions);
        if (quizForm.document) {
            formData.append('document', quizForm.document);
        }

        try {
            await api.post('/api/quiz/generate', formData);
            alert("AI Quiz Generated successfully!");
            setIsQuizModalOpen(false);
            setQuizForm({ targetAudienceId: '', title: '', topic: '', difficulty: 'MEDIUM', numQuestions: 5, document: null });
            // Refresh analytics to show the newly added quiz natively!
            if (selectedContextId) {
                const refreshRes = await api.get(`/api/academic/${selectedContextId}/analytics`);
                if (refreshRes.data) {
                    setAnalytics(refreshRes.data);
                }
            }

        } catch (error) {
            console.error(error);
            alert(error?.response?.data?.message || "Error generating quiz.");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    return (
        <PageContainer>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-heading font-bold tracking-tight text-text-primary mb-2">Command Center</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <p className="text-text-secondary">Class AI Insights & Content Management</p>

                        {/* Selected Structure Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedContextId}
                                onChange={handleContextChange}
                                className="appearance-none bg-primary-light/10 border border-primary/20 text-primary font-semibold rounded-[var(--radius-sm)] pl-3 pr-8 py-1.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer text-sm"
                            >
                                {structures.length === 0 && <option value="" disabled>No Data Available</option>}
                                {structures.map(s => (
                                    <option key={s._id} value={s._id} className="bg-surface text-text-primary">
                                        Year {s.year} • {s.branch} • Sec {s.section}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-primary absolute right-2 top-2 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" onClick={() => setIsQuizModalOpen(true)} className="flex items-center gap-2 text-sm !border-primary/30 text-primary hover:text-primary-light hover:bg-primary/5">
                        <BrainCircuit className="w-4 h-4" />
                        Generate AI Quiz
                    </Button>
                    <Button variant="secondary" onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 text-sm">
                        <Upload className="w-4 h-4" />
                        Upload Notes
                    </Button>
                    <Button variant="danger" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }} className="flex items-center gap-2 text-sm">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { title: 'Total Students', value: analytics.totalStudents, icon: <Users />, color: 'var(--color-primary-base)', bgClass: 'bg-primary-light/10' },
                    { title: 'Active Quizzes', value: analytics.activeQuizzes, icon: <Zap />, color: 'var(--color-warning-base)', bgClass: 'bg-warning/10' },
                    { title: 'High Risk Alert', value: analytics.highRiskCount, icon: <ShieldAlert />, color: 'var(--color-danger-base)', bgClass: 'bg-danger/10', alert: analytics.highRiskCount > 0 },
                    { title: 'Avg. Accuracy', value: `${analytics.avgAccuracy}%`, icon: <TrendingUp />, color: 'var(--color-success-base)', bgClass: 'bg-success/10' },
                ].map((stat, i) => (
                    <Card key={i} className={`p-6 flex flex-col justify-between group hover:shadow-level2 transition-all ${stat.alert ? 'border-danger flex-row items-center justify-start gap-4' : 'h-32'}`}>
                        {stat.alert ? (
                            <>
                                <div className={`p-3 rounded-xl ${stat.bgClass} text-danger shrink-0`}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <h3 className="text-text-secondary text-sm font-medium">{stat.title}</h3>
                                    <div className="text-3xl font-heading font-bold text-danger mt-1">{stat.value}</div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between items-start w-full">
                                    <h3 className="text-text-secondary text-sm font-medium">{stat.title}</h3>
                                    <div className={`p-2 rounded-lg ${stat.bgClass}`} style={{ color: stat.color }}>
                                        {React.cloneElement(stat.icon, { className: 'w-4 h-4' })}
                                    </div>
                                </div>
                                <div className="text-3xl font-heading font-bold text-text-primary mt-2">{stat.value}</div>
                            </>
                        )}
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Left Column: Radar */}
                <Card className="p-6 h-96 flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-xl font-heading font-bold text-text-primary">Class Mastery Radar</h3>
                        <p className="text-sm text-text-secondary">Identify structural weak spots across the selected section</p>
                    </div>
                    <div className="flex-1 min-h-0">
                        {analytics.radarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={analytics.radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                                    <PolarGrid stroke="var(--color-border-subtle)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                    <Radar name="Class Avg" dataKey="A" stroke="var(--color-primary-base)" fill="var(--color-primary-base)" fillOpacity={0.4} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-surface-base)', borderColor: 'var(--color-border-base)', borderRadius: 'var(--radius-md)' }}
                                        itemStyle={{ color: 'var(--color-primary-base)', fontWeight: 'bold' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-text-secondary">No quiz data yet. Create quizzes to see mastery radar.</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Right Column: High Risk Students */}
                <div className="space-y-6">
                    <Card className="p-6 h-auto">
                        <div className="flex items-center gap-2 mb-6">
                            <ShieldAlert className="w-5 h-5 text-danger" />
                            <h3 className="text-lg font-heading font-bold text-text-primary">Students Needing Support</h3>
                        </div>
                        {!analytics.highRiskStudents || analytics.highRiskStudents.length === 0 ? (
                            <div className="p-4 bg-surface-alt border border-border-subtle rounded-[var(--radius-sm)] flex items-center justify-center">
                                <p className="text-sm text-success font-medium">All students are on track!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {analytics.highRiskStudents.slice(0, 5).map((s, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-border-base bg-surface hover:border-danger/50 hover:shadow-level1 transition-all">
                                        <div>
                                            <span className="text-sm font-semibold text-text-primary block">{s.name}</span>
                                            {s.failedTopic && s.failedTopic !== 'N/A' && (
                                                <span className="text-xs text-text-secondary">Needs help with: <span className="text-warning font-medium">{s.failedTopic}</span></span>
                                            )}
                                        </div>
                                        <Badge color="danger">Risk: {s.riskVal}%</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Teaching Focus Areas + Recent Content — full width below the grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Teaching Focus Areas */}
                {analytics.teachingInsights && (
                    <Card className="p-6 lg:col-span-1">
                        <div className="flex items-center gap-2 mb-2">
                            <BrainCircuit className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-heading font-bold text-text-primary">Teaching Focus Areas</h3>
                        </div>
                        <p className="text-xs text-text-secondary mb-5 leading-relaxed">{analytics.teachingInsights.summary}</p>

                        <div className="space-y-4">
                            {analytics.teachingInsights.focusAreas?.map((area, i) => (
                                <div key={i} className="p-4 rounded-[var(--radius-md)] border border-border-base bg-surface-alt">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold text-text-primary">{area.topic}</span>
                                        <Badge color={area.studentsStruggling >= 3 ? 'danger' : area.studentsStruggling >= 2 ? 'warning' : 'primary'} className="text-xs">
                                            {area.studentsStruggling} {area.studentsStruggling === 1 ? 'student' : 'students'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-text-secondary leading-relaxed">{area.suggestion}</p>
                                </div>
                            ))}
                        </div>

                        {analytics.teachingInsights.classHealth && (
                            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                                analytics.teachingInsights.classHealth === 'excellent' ? 'bg-success/5 border border-success/20' :
                                analytics.teachingInsights.classHealth === 'good' ? 'bg-primary/5 border border-primary/20' :
                                'bg-warning/5 border border-warning/20'
                            }`}>
                                <TrendingUp className={`w-4 h-4 ${
                                    analytics.teachingInsights.classHealth === 'excellent' ? 'text-success' :
                                    analytics.teachingInsights.classHealth === 'good' ? 'text-primary' : 'text-warning'
                                }`} />
                                <span className={`text-xs font-medium ${
                                    analytics.teachingInsights.classHealth === 'excellent' ? 'text-success' :
                                    analytics.teachingInsights.classHealth === 'good' ? 'text-primary' : 'text-warning'
                                }`}>
                                    Class Health: {analytics.teachingInsights.classHealth === 'excellent' ? 'Excellent' : analytics.teachingInsights.classHealth === 'good' ? 'Good' : 'Needs Attention'}
                                </span>
                            </div>
                        )}
                    </Card>
                )}

                <Card className="p-6 lg:col-span-1 flex flex-col">
                    <h3 className="text-lg font-heading font-bold text-text-primary mb-4">Recent Quizzes</h3>
                    <div className="flex-1 flex flex-col justify-start">
                        {!analytics.recentQuizzes || analytics.recentQuizzes.length === 0 ? (
                            <p className="text-sm text-text-secondary bg-surface-alt p-3 rounded-[var(--radius-sm)] border border-border-subtle">No quizzes yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {analytics.recentQuizzes.slice(0, 3).map((q) => (
                                    <div key={q._id} className="flex items-start justify-between bg-surface-alt border border-border-base rounded-[var(--radius-md)] p-3 group hover:border-border-hover transition-colors">
                                        <div className="pr-2">
                                            <p className="text-sm text-text-primary font-semibold line-clamp-1">{q.topic}</p>
                                            <p className="text-xs text-text-secondary mt-1">{q.difficulty} • {q.questions?.length || 0} Qs</p>
                                        </div>
                                        <button onClick={() => handleDeleteQuiz(q._id)} className="text-text-muted hover:text-danger hover:bg-danger/10 p-1.5 rounded-md transition-colors shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-6 lg:col-span-1 flex flex-col">
                    <h3 className="text-lg font-heading font-bold text-text-primary mb-4">Recent Materials</h3>
                    <div className="flex-1 flex flex-col justify-start">
                        {!analytics.recentMaterials || analytics.recentMaterials.length === 0 ? (
                            <p className="text-sm text-text-secondary bg-surface-alt p-3 rounded-[var(--radius-sm)] border border-border-subtle">No materials uploaded.</p>
                        ) : (
                            <div className="space-y-3">
                                {analytics.recentMaterials.slice(0, 3).map((m) => (
                                    <div key={m._id} className="flex items-start justify-between bg-surface-alt border border-border-base rounded-[var(--radius-md)] p-3 group hover:border-border-hover transition-colors">
                                        <div className="pr-2">
                                            <p className="text-sm text-text-primary font-semibold line-clamp-1">{m.title}</p>
                                            <p className="text-xs text-text-secondary mt-1">{new Date(m.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => handleDeleteMaterial(m._id)} className="text-text-muted hover:text-danger hover:bg-danger/10 p-1.5 rounded-md transition-colors shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Comprehensive Student Analytics Table */}
            <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b border-border-base flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-light/10 text-primary">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-heading font-bold text-text-primary">Comprehensive Student Analytics</h3>
                        <p className="text-sm text-text-secondary">Detailed individual performance metrics for this section</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-surface-alt border-b border-border-base">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Roll No.</th>
                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Student Name</th>
                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider text-center">Avg Quiz Accuracy</th>
                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Top Weakness</th>
                                <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider text-center">Risk Level</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle bg-surface">
                            {!analytics.allStudents || analytics.allStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-text-secondary italic">No students found for this section.</td>
                                </tr>
                            ) : (
                                analytics.allStudents.map((student, i) => (
                                    <tr key={student._id || i} className="hover:bg-surface-alt/50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-medium text-text-secondary">{student.rollNumber || `N/A`}</td>
                                        <td className="px-6 py-4 font-medium text-text-primary">{student.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge color={student.avgAccuracy >= 80 ? 'success' : student.avgAccuracy >= 50 ? 'warning' : 'danger'}>
                                                {student.avgAccuracy}%
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-primary font-medium">
                                            {student.weakness}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge color={student.riskLevel === 'HIGH' ? 'danger' : student.riskLevel === 'MEDIUM' ? 'warning' : 'success'} className="px-3">
                                                {student.riskLevel}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Activity Log */}
            <Card className="p-0 overflow-hidden mt-8">
                <div className="p-6 border-b border-border-base flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10 text-warning">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-heading font-bold text-text-primary">Recent Activity</h3>
                        <p className="text-sm text-text-secondary">Your latest actions across the platform</p>
                    </div>
                </div>
                <div className="p-6">
                    {activityLoading ? (
                        <p className="text-sm text-text-secondary text-center py-6">Loading activity...</p>
                    ) : activityLog.length === 0 ? (
                        <p className="text-sm text-text-secondary text-center py-6 bg-surface-alt rounded-[var(--radius-sm)] border border-border-subtle">No recent activity recorded.</p>
                    ) : (
                        <div className="space-y-3">
                            {activityLog.map((item, i) => {
                                const meta = ACTION_META[item.actionType] || { label: item.actionType, color: 'text-text-secondary', bg: 'bg-surface-alt' };
                                return (
                                    <div key={item._id || i} className="flex items-start gap-4 p-3 rounded-[var(--radius-md)] border border-border-base bg-surface hover:border-border-hover transition-all">
                                        <div className={`p-2 rounded-lg shrink-0 ${meta.bg} ${meta.color}`}>
                                            <Activity className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                                            </div>
                                            <p className="text-sm text-text-primary line-clamp-1">{item.description || 'No description'}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-text-muted shrink-0">
                                            <Clock className="w-3 h-3" />
                                            <span className="text-xs">{formatRelativeTime(item.createdAt)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>

            {/* Exam Integrity Monitor */}
            <Card className="p-0 overflow-hidden mt-8">
                <div className="p-6 border-b border-border-base flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-danger/10 text-danger">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-heading font-bold text-text-primary">Exam Integrity Monitor</h3>
                            <p className="text-sm text-text-secondary">Violation tracking &amp; behavioral flags per quiz</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative">
                            <select
                                disabled={selectedContextId === 'all' || sectionQuizzesLoading || sectionQuizzes.length === 0}
                                value={integrityQuizId}
                                onChange={e => handleIntegrityQuizChange(e.target.value)}
                                className="appearance-none bg-surface-alt border border-border-base rounded-[var(--radius-md)] pl-3 pr-8 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {sectionQuizzesLoading ? 'Loading quizzes...' : sectionQuizzes.length === 0 ? 'No quizzes available' : 'Select a Quiz'}
                                </option>
                                {sectionQuizzes.map(q => (
                                    <option key={q._id} value={q._id}>{q.title}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-text-muted absolute right-2 top-2.5 pointer-events-none" />
                        </div>
                        {integrityQuizId && (
                            <div className="flex items-center gap-1 bg-surface-alt border border-border-base rounded-[var(--radius-md)] overflow-hidden">
                                {[['all', 'All'], ['flagged', 'Flagged'], ['auto-submitted', 'Auto-Sub']].map(([val, label]) => (
                                    <button
                                        key={val}
                                        onClick={() => setIntegrityFilter(val)}
                                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                                            integrityFilter === val
                                                ? 'bg-primary text-white'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {!integrityQuizId ? (
                    <div className="p-8 text-center">
                        <Eye className="w-8 h-8 text-text-muted mx-auto mb-3" />
                        <p className="text-sm text-text-secondary">Select a quiz above to view integrity data.</p>
                    </div>
                ) : integrityLoading ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-text-secondary">Loading integrity data...</p>
                    </div>
                ) : filteredIntegrity.length === 0 ? (
                    <div className="p-8 text-center">
                        <Shield className="w-8 h-8 text-success mx-auto mb-3" />
                        <p className="text-sm text-success font-medium">
                            {integrityFilter === 'all'
                                ? 'No integrity violations recorded for this quiz.'
                                : `No ${integrityFilter === 'flagged' ? 'flagged students' : 'auto-submitted exams'} found.`}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-surface-alt border-b border-border-base">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Roll No.</th>
                                    <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Student</th>
                                    <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider text-center">Violations</th>
                                    <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">Types</th>
                                    <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-text-secondary uppercase text-xs tracking-wider">First Violation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle bg-surface">
                                {filteredIntegrity.map((row, i) => (
                                    <tr key={row._id || i} className={`hover:bg-surface-alt/50 transition-colors ${row.autoSubmitted ? 'bg-danger/5' : ''}`}>
                                        <td className="px-6 py-4 font-mono font-medium text-text-secondary">{row.student?.rollNumber || 'N/A'}</td>
                                        <td className="px-6 py-4 font-medium text-text-primary">{row.student?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge color={row.totalViolations >= 3 ? 'danger' : row.totalViolations >= 2 ? 'warning' : 'primary'}>
                                                {row.totalViolations}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(row.violationTypes || []).map(type => (
                                                    <span key={type} className="inline-block px-2 py-0.5 text-xs rounded-full bg-warning/10 text-warning font-medium">
                                                        {VIOLATION_LABELS[type] || type}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {row.autoSubmitted ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-danger/10 text-danger">
                                                    <AlertTriangle className="w-3 h-3" /> Auto-Submitted
                                                </span>
                                            ) : (
                                                <span className="text-xs text-text-secondary">Active</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-text-secondary text-xs">
                                            {row.firstViolation ? new Date(row.firstViolation).toLocaleString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Summary footer */}
                {integrityQuizId && !integrityLoading && integritySummary.length > 0 && (
                    <div className="p-4 border-t border-border-base bg-surface-alt flex flex-wrap items-center gap-6 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <strong className="text-text-primary">{integritySummary.length}</strong> students with violations
                        </span>
                        <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                            <strong className="text-danger">{integritySummary.filter(r => r.autoSubmitted).length}</strong> auto-submitted
                        </span>
                        <span className="flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-warning" />
                            <strong className="text-warning">{integritySummary.filter(r => r.totalViolations >= 2).length}</strong> flagged (2+ violations)
                        </span>
                    </div>
                )}
            </Card>

            {/* Upload Notes Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md">
                        <Card className="p-6 border-primary/30 shadow-level3">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold font-heading text-text-primary flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" /> Upload Class Notes
                                </h3>
                                <button onClick={() => setIsUploadModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUploadSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Target Section</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={uploadContextId}
                                            onChange={e => setUploadContextId(e.target.value)}
                                            className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
                                        >
                                            <option value="" disabled>Select a Section</option>
                                            {structures.filter(s => s._id !== 'all').map(s => (
                                                <option key={s._id} value={s._id}>
                                                    Year {s.year} • {s.branch} • Sec {s.section}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-primary absolute right-4 top-3.5 pointer-events-none" />
                                    </div>
                                    <p className="text-xs text-text-muted mt-1.5">Only students mapped to this section can access these notes.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Document Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={uploadTitle}
                                        onChange={e => setUploadTitle(e.target.value)}
                                        placeholder="e.g. Chapter 4: Dynamic Programming"
                                        className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Upload File (PDF, DOC, IMG)</label>
                                    <input
                                        type="file"
                                        required
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        onChange={e => setUploadFile(e.target.files[0])}
                                        className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-sm)] file:border-0 file:text-sm file:font-bold file:bg-primary-light/10 file:text-primary hover:file:bg-primary-light/20 transition-all cursor-pointer"
                                    />
                                </div>
                                <div className="pt-2">
                                    <Button disabled={isUploading} type="submit" variant="primary" className="w-full flex items-center justify-center gap-2">
                                        <Upload className="w-4 h-4" /> {isUploading ? 'Uploading...' : 'Publish to Class'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            )}

            {/* Groq AI Quiz Generator Modal */}
            {isQuizModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <Card className="p-6 border-primary/50 shadow-level3">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold font-heading text-text-primary flex items-center gap-2">
                                    <BrainCircuit className="w-5 h-5 text-primary" /> AI Quiz Generator
                                </h3>
                                <button onClick={() => setIsQuizModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleQuizSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Quiz Title <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={quizForm.title}
                                        onChange={e => setQuizForm({ ...quizForm, title: e.target.value })}
                                        placeholder="e.g. Data Structures Mid-term Quiz"
                                        className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Target Section <span className="text-danger">*</span></label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={quizForm.targetAudienceId}
                                            onChange={e => setQuizForm({ ...quizForm, targetAudienceId: e.target.value })}
                                            className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
                                        >
                                            <option value="" disabled>Select Target Class</option>
                                            {structures.filter(s => s._id !== 'all').map(s => (
                                                <option key={s._id} value={s._id}>
                                                    Year {s.year} • {s.branch} • Sec {s.section}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-primary absolute right-4 top-3.5 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Difficulty</label>
                                        <div className="relative">
                                            <select
                                                value={quizForm.difficulty}
                                                onChange={e => setQuizForm({ ...quizForm, difficulty: e.target.value })}
                                                className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
                                            >
                                                <option value="EASY">Easy</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HARD">Hard</option>
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-primary absolute right-4 top-3.5 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Questions</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={quizForm.numQuestions}
                                            onChange={e => setQuizForm({ ...quizForm, numQuestions: e.target.value })}
                                            className="w-full bg-surface-alt border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Source Section — Topic OR PDF */}
                                <div className="p-4 rounded-[var(--radius-md)] border border-border-base bg-surface-alt/50 space-y-4">
                                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Quiz Source — provide at least one</p>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Topic Name</label>
                                        <input
                                            type="text"
                                            value={quizForm.topic}
                                            onChange={e => setQuizForm({ ...quizForm, topic: e.target.value })}
                                            placeholder="e.g. Heaps & Priority Queues"
                                            className="w-full bg-surface border border-border-base rounded-[var(--radius-md)] px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 border-t border-border-subtle"></div>
                                        <span className="text-xs text-text-muted font-medium">OR</span>
                                        <div className="flex-1 border-t border-border-subtle"></div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Upload PDF</label>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={e => setQuizForm({ ...quizForm, document: e.target.files[0] || null })}
                                            className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-[var(--radius-sm)] file:border-0 file:text-sm file:font-semibold file:bg-primary-light/10 file:text-primary hover:file:bg-primary-light/20 transition-all cursor-pointer"
                                        />
                                    </div>
                                    {quizForm.document && quizForm.topic.trim() && (
                                        <p className="text-xs text-warning font-medium flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> PDF uploaded — quiz will be generated from PDF content, not the topic.
                                        </p>
                                    )}
                                    {!quizForm.document && !quizForm.topic.trim() && (
                                        <p className="text-xs text-danger font-medium">Please enter a topic or upload a PDF to continue.</p>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-border-subtle mt-2">
                                    <Button
                                        disabled={isGeneratingQuiz || (!quizForm.title.trim()) || (!quizForm.topic.trim() && !quizForm.document)}
                                        type="submit"
                                        variant="primary"
                                        className="w-full py-3 flex items-center justify-center gap-2"
                                    >
                                        <BrainCircuit className="w-5 h-5" /> {isGeneratingQuiz ? 'AI is processing...' : 'Generate Quiz'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            )}
        </PageContainer>
    );
};

export default TeacherDashboard;
