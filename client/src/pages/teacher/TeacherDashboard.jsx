import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../components/common/GlassCard';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Upload, Users, ShieldAlert, Zap, LogOut, ChevronDown, X, FileText, BrainCircuit, Trash2 } from 'lucide-react';

const defaultRadarData = [
    { subject: 'Arrays', A: 150, fullMark: 150 },
    { subject: 'Trees', A: 150, fullMark: 150 },
    { subject: 'Sorting', A: 150, fullMark: 150 },
    { subject: 'Graphs', A: 150, fullMark: 150 },
    { subject: 'DP', A: 150, fullMark: 150 },
    { subject: 'HashMaps', A: 150, fullMark: 150 },
];

const TeacherDashboard = () => {
    const navigate = useNavigate();

    const [structures, setStructures] = useState([]);
    const [selectedContextId, setSelectedContextId] = useState('');
    const [analytics, setAnalytics] = useState({
        totalStudents: 0,
        activeQuizzes: 0,
        highRiskCount: 0,
        avgAccuracy: 0,
        radarData: defaultRadarData,
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
        topic: '',
        difficulty: 'MEDIUM',
        numQuestions: 5,
        contextText: '',
        document: null
    });
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

    useEffect(() => {
        // Fetch public academic structures
        fetch('/api/academic/public')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setStructures([{ _id: 'all', year: 'All', branch: 'Sections', section: '(Global)' }, ...data]);
                    setSelectedContextId('all'); // Select all by default
                }
            })
            .catch(err => console.error("Failed fetching structures:", err));
    }, []);

    useEffect(() => {
        if (!selectedContextId) return;

        const token = localStorage.getItem('token');
        fetch(`/api/academic/${selectedContextId}/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data && !data.message) {
                    setAnalytics(data);
                }
            })
            .catch(err => console.error("Failed fetching analytics:", err));
    }, [selectedContextId]);

    const handleContextChange = (e) => {
        setSelectedContextId(e.target.value);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadFile) return alert("Please select a file to upload.");
        if (!uploadContextId) return alert("Please select a target section.");

        setIsUploading(true);
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('document', uploadFile);
        formData.append('title', uploadTitle);
        formData.append('academicContextId', uploadContextId);

        try {
            const res = await fetch('/api/materials/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                alert("Notes uploaded successfully!");
                setIsUploadModalOpen(false);
                setUploadTitle('');
                setUploadFile(null);
                setUploadContextId('');

                if (selectedContextId) {
                    const token = localStorage.getItem('token');
                    const refreshRes = await fetch(`/api/academic/${selectedContextId}/analytics`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (refreshRes.ok) {
                        const refreshedData = await refreshRes.json();
                        setAnalytics(refreshedData);
                    }
                }
            } else {
                const data = await res.json();
                alert(data.message || "Failed to upload notes.");
            }
        } catch (error) {
            console.error(error);
            alert("Error uploading file.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteQuiz = async (quizId) => {
        if (!window.confirm('Are you sure you want to delete this AI Quiz and all associated student results?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/quiz/${quizId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setAnalytics(prev => ({ ...prev, recentQuizzes: prev.recentQuizzes.filter(q => q._id !== quizId) }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteMaterial = async (materialId) => {
        if (!window.confirm('Are you sure you want to delete these class notes? Students will lose access immediately.')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/materials/${materialId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setAnalytics(prev => ({ ...prev, recentMaterials: prev.recentMaterials.filter(m => m._id !== materialId) }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleQuizSubmit = async (e) => {
        e.preventDefault();
        if (!quizForm.targetAudienceId) return alert("Select a target class section.");
        if (!quizForm.topic) return alert("Enter a topic name.");

        setIsGeneratingQuiz(true);
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('targetAudienceId', quizForm.targetAudienceId);
        formData.append('topic', quizForm.topic);
        formData.append('difficulty', quizForm.difficulty);
        formData.append('numQuestions', quizForm.numQuestions);
        formData.append('contextText', quizForm.contextText);
        if (quizForm.document) {
            formData.append('document', quizForm.document);
        }

        try {
            const res = await fetch('/api/quiz/generate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                alert("AI Quiz Generated successfully!");
                setIsQuizModalOpen(false);
                setQuizForm({ targetAudienceId: '', topic: '', difficulty: 'MEDIUM', numQuestions: 5, contextText: '', document: null });
            } else {
                const data = await res.json();
                alert(data.message || "Failed to generate quiz.");
            }
            // Refresh analytics to show the newly added quiz natively!
            if (selectedContextId) {
                const refreshRes = await fetch(`/api/academic/${selectedContextId}/analytics`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (refreshRes.ok) {
                    const refreshedData = await refreshRes.json();
                    setAnalytics(refreshedData);
                }
            }

        } catch (error) {
            console.error(error);
            alert("Error generating quiz.");
        } finally {
            setIsGeneratingQuiz(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-outfit font-bold tracking-tight text-white mb-2">Command Center</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400">Class AI Insights & Quiz Generation</p>

                        {/* Selected Structure Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedContextId}
                                onChange={handleContextChange}
                                className="appearance-none bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-semibold rounded-lg pl-3 pr-8 py-1 focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                            >
                                {structures.length === 0 && <option value="" disabled>No Data Available</option>}
                                {structures.map(s => (
                                    <option key={s._id} value={s._id} className="bg-slate-900 text-slate-300">
                                        Year {s.year} • {s.branch} • Sec {s.section}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-indigo-400 absolute right-2 top-1.5 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsQuizModalOpen(true)} className="cyber-button flex items-center gap-2 !py-2 !text-sm border-purple-500/30 text-purple-300 hover:text-purple-200">
                        <BrainCircuit className="w-4 h-4" />
                        <span>Generate AI Quiz</span>
                    </button>
                    <button onClick={() => setIsUploadModalOpen(true)} className="cyber-button flex items-center gap-2 !py-2 !text-sm">
                        <Upload className="w-4 h-4" />
                        <span>Upload Notes</span>
                    </button>
                    <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all font-medium text-sm border border-red-500/20">
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { title: 'Total Students', value: analytics.totalStudents, icon: <Users />, color: 'text-blue-400' },
                    { title: 'Active Quizzes', value: analytics.activeQuizzes, icon: <Zap />, color: 'text-indigo-400' },
                    { title: 'High Risk Alert', value: analytics.highRiskCount, icon: <ShieldAlert />, color: 'text-red-400', alert: analytics.highRiskCount > 0 },
                    { title: 'Avg. Accuracy', value: `${analytics.avgAccuracy}%`, icon: <Users />, color: 'text-green-400' },
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
                        <p className="text-sm text-slate-400">Identify structural weak spots across the selected section</p>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.radarData}>
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
                        {analytics.highRiskStudents.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-slate-500 italic text-sm">No high-risk students detected in this section.</p>
                            </div>
                        ) : (
                            analytics.highRiskStudents.map((student, i) => (
                                <div key={student._id || i} className="flex justify-between items-center p-3 bg-red-500/5 border border-red-500/20 rounded-lg hover:bg-red-500/10 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold font-outfit">S{i + 1}</div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-white">{student.name}</h4>
                                            <p className="text-xs text-slate-400">Weakness: {student.failedTopic}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-red-400 font-bold tracking-widest uppercase">Risk: {student.riskVal}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* List of Generated Quizzes */}
                <GlassCard delay={0.6}>
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-outfit font-bold text-white flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5 text-purple-400" />
                                Recent AI Quizzes
                            </h3>
                            <p className="text-sm text-slate-400">Manage recently generated learning assessments</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {analytics.recentQuizzes && analytics.recentQuizzes.length === 0 ? (
                            <div className="py-6 flex items-center justify-center">
                                <p className="text-slate-500 italic text-sm">No quizzes have been generated for this section yet.</p>
                            </div>
                        ) : (
                            analytics.recentQuizzes && analytics.recentQuizzes.map((quiz, i) => (
                                <div key={quiz._id || i} className="flex justify-between items-center p-4 bg-black/20 border border-white/5 rounded-xl hover:border-purple-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <Zap className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-white">{quiz.title}</h4>
                                            <p className="text-xs text-slate-400">Created: {new Date(quiz.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-3 py-1 bg-opacity-20 rounded-full font-bold uppercase tracking-widest ${quiz.baseDifficulty === 'HARD' ? 'bg-red-500/20 text-red-400' : quiz.baseDifficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {quiz.baseDifficulty || 'MIXED'}
                                        </span>
                                        <button onClick={() => handleDeleteQuiz(quiz._id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Quiz">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </GlassCard>

                {/* List of Uploaded Class Notes */}
                <GlassCard delay={0.7}>
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-outfit font-bold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-400" />
                                Recent Class Notes
                            </h3>
                            <p className="text-sm text-slate-400">Manage uploaded materials and PDFs</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {analytics.recentMaterials && analytics.recentMaterials.length === 0 ? (
                            <div className="py-6 flex items-center justify-center">
                                <p className="text-slate-500 italic text-sm">No notes have been uploaded for this section yet.</p>
                            </div>
                        ) : (
                            analytics.recentMaterials && analytics.recentMaterials.map((mat, i) => (
                                <div key={mat._id || i} className="flex justify-between items-center p-4 bg-black/20 border border-white/5 rounded-xl hover:border-indigo-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-white truncate max-w-[200px]">{mat.title}</h4>
                                            <p className="text-xs text-slate-400 font-bold uppercase">{mat.mimetype.split('/')[1]}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => window.open(`${window.location.origin}${mat.fileUrl}`, '_blank')} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-medium rounded hover:bg-indigo-500/30 transition-colors">
                                            View
                                        </button>
                                        <button onClick={() => handleDeleteMaterial(mat._id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Material">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* Comprehensive Student Analytics Table */}
            <GlassCard delay={0.8}>
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-outfit font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            Comprehensive Student Analytics
                        </h3>
                        <p className="text-sm text-slate-400">Detailed individual performance metrics for this section</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="text-xs uppercase bg-white/5 text-slate-300">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-xl">Roll No.</th>
                                <th className="px-6 py-4">Student Name</th>
                                <th className="px-6 py-4 text-center">Avg Quiz Accuracy</th>
                                <th className="px-6 py-4">Top Weakness</th>
                                <th className="px-6 py-4 text-center rounded-tr-xl">Risk Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!analytics.allStudents || analytics.allStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500 italic">No students found for this section.</td>
                                </tr>
                            ) : (
                                analytics.allStudents.map((student, i) => (
                                    <tr key={student._id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-300">{student.rollNumber || `N/A`}</td>
                                        <td className="px-6 py-4 text-white">{student.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded font-bold text-xs ${student.avgAccuracy >= 80 ? 'bg-green-500/20 text-green-400' : student.avgAccuracy >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {student.avgAccuracy}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-indigo-300 font-medium">
                                            {student.weakness}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase tracking-widest ${student.riskLevel === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : student.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                                                {student.riskLevel}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Upload Notes Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-md">
                        <GlassCard className="p-6 border border-indigo-500/30">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-400" /> Upload Class Notes
                                </h3>
                                <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleUploadSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Target Section</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={uploadContextId}
                                            onChange={e => setUploadContextId(e.target.value)}
                                            className="glass-input !pl-4 w-full appearance-none"
                                        >
                                            <option value="" disabled>Select a Section</option>
                                            {structures.filter(s => s._id !== 'all').map(s => (
                                                <option key={s._id} value={s._id} className="bg-slate-900 text-slate-300">
                                                    Year {s.year} • {s.branch} • Sec {s.section}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-indigo-400 absolute right-3 top-3 pointer-events-none" />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Only students mapped to this section can access these notes.</p>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Document Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={uploadTitle}
                                        onChange={e => setUploadTitle(e.target.value)}
                                        placeholder="e.g. Chapter 4: Dynamic Programming"
                                        className="glass-input !pl-4 w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Upload File (PDF, DOC, IMG)</label>
                                    <input
                                        type="file"
                                        required
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                        onChange={e => setUploadFile(e.target.files[0])}
                                        className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 transition-all cursor-pointer"
                                    />
                                </div>
                                <div className="pt-4">
                                    <button disabled={isUploading} type="submit" className="cyber-button w-full flex items-center justify-center gap-2">
                                        <Upload className="w-4 h-4" /> {isUploading ? 'Uploading...' : 'Publish to Class'}
                                    </button>
                                </div>
                            </form>
                        </GlassCard>
                    </div>
                </div>
            )}

            {/* Groq AI Quiz Generator Modal */}
            {isQuizModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <GlassCard className="p-6 border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
                                    <BrainCircuit className="w-5 h-5 text-purple-400" /> Groq AI Quiz Generator
                                </h3>
                                <button onClick={() => setIsQuizModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleQuizSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Target Section</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={quizForm.targetAudienceId}
                                            onChange={e => setQuizForm({ ...quizForm, targetAudienceId: e.target.value })}
                                            className="glass-input !pl-4 w-full appearance-none bg-black/50"
                                        >
                                            <option value="" disabled>Select Target Class</option>
                                            {structures.filter(s => s._id !== 'all').map(s => (
                                                <option key={s._id} value={s._id} className="bg-slate-900 text-slate-300">
                                                    Year {s.year} • {s.branch} • Sec {s.section}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-purple-400 absolute right-3 top-3 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Topic Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={quizForm.topic}
                                            onChange={e => setQuizForm({ ...quizForm, topic: e.target.value })}
                                            placeholder="e.g. Heaps & Priorities"
                                            className="glass-input !pl-4 w-full bg-black/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Difficulty</label>
                                        <select
                                            value={quizForm.difficulty}
                                            onChange={e => setQuizForm({ ...quizForm, difficulty: e.target.value })}
                                            className="glass-input !pl-4 w-full appearance-none bg-black/50"
                                        >
                                            <option value="EASY">Easy</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HARD">Hard</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Number of Questions</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={quizForm.numQuestions}
                                        onChange={e => setQuizForm({ ...quizForm, numQuestions: e.target.value })}
                                        className="glass-input !pl-4 w-full bg-black/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Optional Source Context (Text)</label>
                                    <textarea
                                        rows="3"
                                        value={quizForm.contextText}
                                        onChange={e => setQuizForm({ ...quizForm, contextText: e.target.value })}
                                        placeholder="Paste specific paragraphs, notes, or code to restrict the AIs knowledge base."
                                        className="glass-input !pl-4 w-full bg-black/50 custom-scrollbar resize-none"
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">... OR Upload Source Material (PDF, DOC)</label>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt"
                                        onChange={e => setQuizForm({ ...quizForm, document: e.target.files[0] })}
                                        className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20 transition-all cursor-pointer"
                                    />
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <button disabled={isGeneratingQuiz} type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(147,51,234,0.3)] flex items-center justify-center gap-2">
                                        <BrainCircuit className="w-5 h-5" /> {isGeneratingQuiz ? 'Groq AI is processing...' : 'Generate Target Quiz'}
                                    </button>
                                </div>
                            </form>
                        </GlassCard>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
