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
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <BrainCircuit className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-3xl font-heading font-bold text-text-primary tracking-tight">Intelligence Hub</h1>
                    </div>
                    <p className="text-text-secondary text-lg leading-relaxed">
                        Monitor class performance, deploy AI-driven assessments, and identify students needing support.
                    </p>
                </div>
                
                {/* Actions & Context Selector */}
                <div className="flex flex-col items-end gap-4">
                    <div className="flex items-center gap-3 bg-surface-alt p-1.5 rounded-xl border border-border-base">
                        <span className="text-sm font-medium text-text-secondary pl-3">Context:</span>
                        <div className="relative">
                            <select
                                value={selectedContextId}
                                onChange={handleContextChange}
                                className="appearance-none bg-surface border-none text-text-primary font-medium rounded-lg pl-3 pr-8 py-1.5 focus:ring-0 cursor-pointer text-sm min-w-[140px]"
                            >
                                {structures.length === 0 && <option value="" disabled>No Data</option>}
                                {structures.map(s => (
                                    <option key={s._id} value={s._id}>
                                        {s.year === 'All' ? 'Global View' : `Yr ${s.year} • ${s.branch} • Sec ${s.section}`}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-text-muted absolute right-2 top-2 pointer-events-none" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setIsQuizModalOpen(true)} className="flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4" /> New AI Quiz
                        </Button>
                        <Button variant="secondary" onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Upload Material
                        </Button>
                        <Button variant="ghost" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }} className="text-danger hover:bg-danger/10">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Smart Summary Bar */}
            <div className="bg-surface border border-border-base rounded-2xl p-6 mb-8 flex flex-col md:flex-row gap-8 items-center justify-between shadow-sm">
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">Class Narrative</h3>
                    <p className="text-text-primary text-lg leading-relaxed">
                        {analytics.teachingInsights?.summary || "Select a class to generate AI teaching insights. The platform will analyze recent quiz performances and highlight key areas for intervention."}
                    </p>
                </div>
                <div className="flex gap-6 border-l border-border-base pl-8 shrink-0">
                    <div>
                        <div className="text-sm text-text-secondary mb-1">Avg Accuracy</div>
                        <div className="text-3xl font-heading font-bold text-success">{analytics.avgAccuracy}%</div>
                    </div>
                    <div>
                        <div className="text-sm text-text-secondary mb-1">High Risk</div>
                        <div className="text-3xl font-heading font-bold text-danger">{analytics.highRiskCount}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Left Column: Focus Areas & High Risk (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Priority Interventions */}
                    <Card className="p-0 overflow-hidden">
                        <div className="p-5 border-b border-border-base flex justify-between items-center bg-surface-alt/30">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-warning" />
                                <h3 className="font-heading font-bold text-text-primary text-lg">Priority Interventions</h3>
                            </div>
                            <Badge color="warning">{analytics.teachingInsights?.focusAreas?.length || 0} Focus Areas</Badge>
                        </div>
                        <div className="p-5 divide-y divide-border-subtle">
                            {!analytics.teachingInsights?.focusAreas?.length ? (
                                <p className="text-text-secondary text-sm py-4 text-center">No immediate focus areas identified.</p>
                            ) : (
                                analytics.teachingInsights.focusAreas.map((area, i) => (
                                    <div key={i} className="py-4 first:pt-0 last:pb-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-text-primary">{area.topic}</h4>
                                            <Badge color="danger" className="text-xs">{area.studentsStruggling} struggling</Badge>
                                        </div>
                                        <p className="text-sm text-text-secondary leading-relaxed">{area.suggestion}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Students Needing Support */}
                    <Card className="p-0 overflow-hidden">
                        <div className="p-5 border-b border-border-base bg-surface-alt/30">
                            <h3 className="font-heading font-bold text-text-primary text-lg">Students Needing Support</h3>
                        </div>
                        <div className="p-0">
                            {!analytics.highRiskStudents?.length ? (
                                <p className="text-success text-sm p-5 text-center font-medium">All students are currently on track.</p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-surface-alt border-b border-border-base">
                                        <tr>
                                            <th className="px-5 py-3 font-medium text-text-secondary">Student</th>
                                            <th className="px-5 py-3 font-medium text-text-secondary">Weakest Topic</th>
                                            <th className="px-5 py-3 font-medium text-text-secondary text-right">Risk Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle">
                                        {analytics.highRiskStudents.slice(0, 5).map((s, i) => (
                                            <tr key={i} className="hover:bg-surface-alt/30 transition-colors">
                                                <td className="px-5 py-3 font-medium text-text-primary">{s.name}</td>
                                                <td className="px-5 py-3 text-text-secondary">{s.failedTopic !== 'N/A' ? s.failedTopic : 'Multiple Areas'}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <Badge color="danger">{s.riskVal}%</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </Card>

                    {/* Class Mastery Radar */}
                    <Card className="p-6">
                        <h3 className="font-heading font-bold text-text-primary text-lg mb-6">Subject Mastery Distribution</h3>
                        <div className="h-80 w-full">
                            {analytics.radarData?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={analytics.radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                                        <PolarGrid stroke="var(--color-border-subtle)" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                        <Radar name="Class Avg" dataKey="A" stroke="var(--color-primary-base)" fill="var(--color-primary-base)" fillOpacity={0.2} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-base)', borderColor: 'var(--color-border-base)', borderRadius: '8px' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-text-secondary text-sm">Not enough data to map mastery.</div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right Column: Quizzes, Materials, Activity (1/3) */}
                <div className="space-y-8">
                    {/* Recent Materials */}
                    <Card className="p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-heading font-bold text-text-primary">Course Materials</h3>
                            <button onClick={() => setIsUploadModalOpen(true)} className="text-primary hover:text-primary-light transition-colors"><Upload className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-3">
                            {!analytics.recentMaterials?.length ? (
                                <p className="text-sm text-text-secondary">No materials uploaded.</p>
                            ) : (
                                analytics.recentMaterials.slice(0, 4).map((m) => (
                                    <div key={m._id} className="group flex justify-between items-start p-3 bg-surface-alt rounded-xl border border-border-base hover:border-primary/30 transition-all">
                                        <div>
                                            <p className="text-sm font-medium text-text-primary line-clamp-1">{m.title}</p>
                                            <p className="text-xs text-text-muted mt-1">{new Date(m.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => handleDeleteMaterial(m._id)} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Recent Quizzes */}
                    <Card className="p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-heading font-bold text-text-primary">Active Assessments</h3>
                            <button onClick={() => setIsQuizModalOpen(true)} className="text-primary hover:text-primary-light transition-colors"><BrainCircuit className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-3">
                            {!analytics.recentQuizzes?.length ? (
                                <p className="text-sm text-text-secondary">No quizzes available.</p>
                            ) : (
                                analytics.recentQuizzes.slice(0, 4).map((q) => (
                                    <div key={q._id} className="group flex justify-between items-start p-3 bg-surface-alt rounded-xl border border-border-base hover:border-primary/30 transition-all">
                                        <div>
                                            <p className="text-sm font-medium text-text-primary line-clamp-1">{q.title}</p>
                                            <p className="text-xs text-text-muted mt-1 capitalize">{q.baseDifficulty.toLowerCase()} • {q.questions?.length || 0} Qs</p>
                                        </div>
                                        <button onClick={() => handleDeleteQuiz(q._id)} className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="p-5">
                        <h3 className="font-heading font-bold text-text-primary mb-4">Action Log</h3>
                        <div className="space-y-4">
                            {activityLoading ? (
                                <p className="text-sm text-text-secondary">Loading...</p>
                            ) : !activityLog.length ? (
                                <p className="text-sm text-text-secondary">No recent activity.</p>
                            ) : (
                                activityLog.slice(0, 5).map((item, i) => {
                                    const meta = ACTION_META[item.actionType] || { label: item.actionType, color: 'text-text-secondary', bg: 'bg-surface-alt' };
                                    return (
                                        <div key={item._id || i} className="flex gap-3">
                                            <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${meta.bg} ${meta.color}`}>
                                                <Activity className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-text-primary leading-snug">{item.description}</p>
                                                <p className="text-xs text-text-muted mt-0.5">{formatRelativeTime(item.createdAt)}</p>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Exam Integrity Monitor */}
            <Card className="p-0 overflow-hidden mb-8">
                <div className="p-6 border-b border-border-base flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-alt/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-danger/10 rounded-lg">
                            <Shield className="w-5 h-5 text-danger" />
                        </div>
                        <div>
                            <h3 className="text-lg font-heading font-bold text-text-primary">Exam Integrity Monitor</h3>
                            <p className="text-sm text-text-secondary">Track proctoring flags and behavioral violations</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                disabled={selectedContextId === 'all' || sectionQuizzesLoading || sectionQuizzes.length === 0}
                                value={integrityQuizId}
                                onChange={e => handleIntegrityQuizChange(e.target.value)}
                                className="appearance-none bg-surface border border-border-base rounded-lg pl-3 pr-8 py-2 text-sm text-text-primary focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer disabled:opacity-50"
                            >
                                <option value="">{sectionQuizzesLoading ? 'Loading...' : sectionQuizzes.length === 0 ? 'No Quizzes' : 'Select Assessment'}</option>
                                {sectionQuizzes.map(q => <option key={q._id} value={q._id}>{q.title}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 text-text-muted absolute right-2 top-2.5 pointer-events-none" />
                        </div>
                        
                        {integrityQuizId && (
                            <div className="flex bg-surface border border-border-base rounded-lg overflow-hidden p-0.5">
                                {[['all', 'All'], ['flagged', 'Flagged'], ['auto-submitted', 'Auto-Sub']].map(([val, label]) => (
                                    <button
                                        key={val}
                                        onClick={() => setIntegrityFilter(val)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${integrityFilter === val ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {!integrityQuizId ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <Shield className="w-12 h-12 text-text-muted/30 mb-4" />
                        <p className="text-text-secondary">Select an assessment to review integrity logs.</p>
                    </div>
                ) : integrityLoading ? (
                    <div className="p-12 text-center text-text-secondary">Loading proctoring data...</div>
                ) : !filteredIntegrity.length ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <Shield className="w-12 h-12 text-success/30 mb-4" />
                        <p className="text-success font-medium">No violations found matching the current filter.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface border-b border-border-base">
                                <tr>
                                    <th className="px-6 py-4 font-medium text-text-secondary">Student</th>
                                    <th className="px-6 py-4 font-medium text-text-secondary text-center">Violations</th>
                                    <th className="px-6 py-4 font-medium text-text-secondary">Types</th>
                                    <th className="px-6 py-4 font-medium text-text-secondary text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                                {filteredIntegrity.map((row, i) => (
                                    <tr key={i} className="hover:bg-surface-alt/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-text-primary">{row.student?.name || 'Unknown'}</p>
                                            <p className="text-xs text-text-muted font-mono mt-0.5">{row.student?.rollNumber}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge color={row.totalViolations >= 3 ? 'danger' : row.totalViolations >= 2 ? 'warning' : 'primary'}>{row.totalViolations}</Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {(row.violationTypes || []).map(type => (
                                                    <span key={type} className="px-2 py-0.5 text-xs rounded-md bg-warning/10 text-warning border border-warning/20">
                                                        {VIOLATION_LABELS[type] || type}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {row.autoSubmitted ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger bg-danger/10 px-2.5 py-1 rounded-md">
                                                    <AlertTriangle className="w-3.5 h-3.5" /> Terminated
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-md">Active</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Modals Retained Below */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md">
                        <Card className="p-6 shadow-xl border border-border-base">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" /> Upload Resource
                                </h3>
                                <button onClick={() => setIsUploadModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUploadSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Target Section</label>
                                    <div className="relative">
                                        <select required value={uploadContextId} onChange={e => setUploadContextId(e.target.value)} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary focus:border-primary transition-all appearance-none">
                                            <option value="" disabled>Select a Section</option>
                                            {structures.filter(s => s._id !== 'all').map(s => (
                                                <option key={s._id} value={s._id}>Year {s.year} • {s.branch} • Sec {s.section}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-text-muted absolute right-4 top-3.5 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Document Title</label>
                                    <input type="text" required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="e.g. Chapter 4: Dynamic Programming" className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary focus:border-primary transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Upload File</label>
                                    <input type="file" required accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => setUploadFile(e.target.files[0])} className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" />
                                </div>
                                <div className="pt-2">
                                    <Button disabled={isUploading} type="submit" variant="primary" className="w-full py-2.5">
                                        {isUploading ? 'Uploading...' : 'Publish to Class'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            )}

            {isQuizModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-base/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <Card className="p-6 shadow-xl border border-border-base">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
                                    <BrainCircuit className="w-5 h-5 text-primary" /> AI Assessment Builder
                                </h3>
                                <button onClick={() => setIsQuizModalOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleQuizSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Assessment Title</label>
                                    <input type="text" required value={quizForm.title} onChange={e => setQuizForm({ ...quizForm, title: e.target.value })} placeholder="e.g. Mid-term Diagnostic" className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Target Audience</label>
                                    <div className="relative">
                                        <select required value={quizForm.targetAudienceId} onChange={e => setQuizForm({ ...quizForm, targetAudienceId: e.target.value })} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all appearance-none">
                                            <option value="" disabled>Select Target Class</option>
                                            {structures.filter(s => s._id !== 'all').map(s => (
                                                <option key={s._id} value={s._id}>Year {s.year} • {s.branch} • Sec {s.section}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-text-muted absolute right-4 top-3.5 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Difficulty</label>
                                        <div className="relative">
                                            <select value={quizForm.difficulty} onChange={e => setQuizForm({ ...quizForm, difficulty: e.target.value })} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all appearance-none">
                                                <option value="EASY">Easy</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HARD">Hard</option>
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-text-muted absolute right-4 top-3.5 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Question Count</label>
                                        <input type="number" min="1" max="30" value={quizForm.numQuestions} onChange={e => setQuizForm({ ...quizForm, numQuestions: e.target.value })} className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all" />
                                    </div>
                                </div>

                                <div className="p-5 rounded-xl border border-border-base bg-surface-alt/50 space-y-4">
                                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Knowledge Source</p>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Topic Prompt</label>
                                        <input type="text" value={quizForm.topic} onChange={e => setQuizForm({ ...quizForm, topic: e.target.value })} placeholder="e.g. Distributed Systems Architecture" className="w-full bg-surface border border-border-base rounded-lg px-4 py-2.5 text-text-primary focus:ring-1 focus:ring-primary transition-all" />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 border-t border-border-subtle"></div>
                                        <span className="text-xs text-text-muted font-medium">OR</span>
                                        <div className="flex-1 border-t border-border-subtle"></div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Upload Reference PDF</label>
                                        <input type="file" accept=".pdf" onChange={e => setQuizForm({ ...quizForm, document: e.target.files[0] || null })} className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button disabled={isGeneratingQuiz || (!quizForm.title.trim()) || (!quizForm.topic.trim() && !quizForm.document)} type="submit" variant="primary" className="w-full py-2.5">
                                        {isGeneratingQuiz ? 'Synthesizing...' : 'Generate Assessment'}
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
