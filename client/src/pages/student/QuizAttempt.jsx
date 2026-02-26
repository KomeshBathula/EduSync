import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../../components/common/Card';
import { Clock, CheckCircle, ArrowRight, BrainCircuit, Youtube, HelpCircle, ShieldAlert, AlertTriangle, Lock } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { createSecureExamController } from '../../utils/secureExamController';

const QuizAttempt = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    // Quiz state
    const [quizData, setQuizData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOpt, setSelectedOpt] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const answersRef = useRef(answers);
    answersRef.current = answers;

    // Integrity state
    const [violationCount, setViolationCount] = useState(0);
    const [violationThreshold, setViolationThreshold] = useState(3);
    const [warningType, setWarningType] = useState(null); // 'WARNING' | 'STRONG_WARNING' | null
    const [warningMessage, setWarningMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [secureReady, setSecureReady] = useState(false);
    const [forcedSubmit, setForcedSubmit] = useState(false);

    const controllerRef = useRef(null);
    const quizDataRef = useRef(null);
    quizDataRef.current = quizData;

    // ── Show toast notification ───────────────────────────────────
    const showToast = useCallback((msg) => {
        setToastMsg(msg);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 4000);
    }, []);

    // ── Report violation to backend ───────────────────────────────
    const reportViolationToServer = useCallback(async (eventType, metadata = {}) => {
        try {
            const res = await api.post(`/api/quiz/${id}/violation`, { eventType, metadata });
            const data = res.data;

            setViolationCount(data.violationCount);

            if (data.warning === 'AUTO_SUBMIT') {
                // Server forced submission
                setForcedSubmit(true);
                controllerRef.current?.deactivate();
                setResult({
                    score: data.forcedResult?.marksAssigned ?? 0,
                    max: quizDataRef.current?.questions?.length || 0,
                    accuracy: data.forcedResult?.accuracyPercentage ?? 0,
                    weakNodes: [],
                    timeTaken: 0,
                    forced: true,
                });
            } else if (data.warning === 'STRONG_WARNING') {
                setWarningType('STRONG_WARNING');
                setWarningMessage(`Violation ${data.violationCount}/${data.threshold}: One more violation will auto-submit your quiz with zero marks.`);
            } else if (data.warning === 'WARNING') {
                showToast(`⚠️ Warning: ${formatViolationType(eventType)} detected. ${data.threshold - data.violationCount} violations remaining before auto-submit.`);
            }
        } catch (err) {
            if (err.response?.status === 409) {
                // Already force-submitted
                setForcedSubmit(true);
                controllerRef.current?.deactivate();
                setResult({ score: 0, max: 0, accuracy: 0, weakNodes: [], timeTaken: 0, forced: true });
            }
        }
    }, [id, showToast]);

    // ── Format violation type for display ─────────────────────────
    const formatViolationType = (type) => {
        const labels = {
            TAB_SWITCH: 'Tab switch',
            WINDOW_BLUR: 'Window focus lost',
            COPY_ATTEMPT: 'Copy attempt',
            PASTE_ATTEMPT: 'Paste attempt',
            RIGHT_CLICK: 'Right-click',
            DEVTOOLS_ATTEMPT: 'Dev tools shortcut',
            SCREENSHOT_KEY: 'Screenshot attempt',
            FULLSCREEN_EXIT: 'Fullscreen exit',
        };
        return labels[type] || type;
    };

    // ── Fetch config + quiz ───────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                // Fetch violation threshold from server
                const configRes = await api.get('/api/quiz/integrity/config');
                const threshold = configRes.data.violationThreshold || 3;
                setViolationThreshold(threshold);

                // Fetch quiz
                const res = await api.get(`/api/quiz/${id}/attempt`);
                setQuizData(res.data);
                const totalTime = res.data.questions ? res.data.questions.length * 120 : 15 * 60;
                setTimeLeft(totalTime);

                // Initialize secure exam controller
                const controller = createSecureExamController({
                    threshold,
                    onViolation: (eventType, metadata) => {
                        reportViolationToServer(eventType, metadata);
                    },
                    onAutoSubmit: () => {},
                });

                controllerRef.current = controller;
                setSecureReady(true);
            } catch (error) {
                console.error(error);
                navigate('/student/dashboard');
            } finally {
                setLoading(false);
            }
        };
        init();

        return () => {
            controllerRef.current?.deactivate();
        };
    }, [id, navigate, reportViolationToServer]);

    // ── Activate secure mode after user clicks Start ──────────────
    const [examStarted, setExamStarted] = useState(false);

    const startExam = async () => {
        if (controllerRef.current) {
            controllerRef.current.activate();
            await controllerRef.current.requestFullscreen();
        }
        setExamStarted(true);
    };

    // ── Timer ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!examStarted || result) return;
        const timer = setInterval(() => setTimeLeft((prev) => {
            if (prev <= 1) {
                clearInterval(timer);
                handleSubmit(true, answersRef.current);
                return 0;
            }
            return prev > 0 ? prev - 1 : 0;
        }), 1000);
        return () => clearInterval(timer);
    }, [examStarted, result, quizData]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleNext = () => {
        if (!selectedOpt) return;
        const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
        const newAnswer = {
            questionId: quizData.questions[currentIdx]._id,
            selectedOptionText: selectedOpt,
            timeSpent,
        };
        const updatedAnswers = [...answers, newAnswer];
        setAnswers(updatedAnswers);
        setSelectedOpt(null);
        setQuestionStartTime(Date.now());

        if (currentIdx < quizData.questions.length - 1) {
            setCurrentIdx(currentIdx + 1);
        } else {
            handleSubmit(false, updatedAnswers);
        }
    };

    const handleSubmit = async (autoSubmit = false, finalAnswers = answers) => {
        setSubmitting(true);
        controllerRef.current?.deactivate();
        try {
            const totalTimeRaw = quizData.questions ? quizData.questions.length * 120 : 15 * 60;
            const res = await api.post(`/api/quiz/${id}/submit`, {
                timeTakenSeconds: totalTimeRaw - timeLeft,
                answers: finalAnswers,
            });
            const evalData = res.data;
            setResult({
                score: evalData.marksAssigned,
                max: quizData.questions.length,
                accuracy: evalData.accuracyPercentage,
                weakNodes: evalData.weakNodesDetected || [],
                timeTaken: totalTimeRaw - timeLeft,
            });
        } catch (error) {
            if (error.response?.status === 409) {
                // Force-submitted
                setResult({ score: 0, max: quizData.questions.length, accuracy: 0, weakNodes: [], timeTaken: 0, forced: true });
            } else {
                console.error(error);
                alert('Error submitting quiz.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ── Loading State ─────────────────────────────────────────────
    if (loading) return <div className="h-screen flex items-center justify-center text-text-primary">Loading Quiz...</div>;
    if (!quizData) return <div className="h-screen flex items-center justify-center text-danger">Failed to load quiz.</div>;

    // ── Pre-Exam Gate (must click Start to enter Secure Mode) ─────
    if (!examStarted && !result) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <Card className="max-w-lg w-full text-center space-y-6 p-8">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                        <ShieldAlert className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-heading font-bold text-text-primary">Secure Exam Mode</h2>
                    <p className="text-text-secondary text-sm leading-relaxed">
                        This quiz uses a <strong>proctored exam environment</strong>. Once started:
                    </p>
                    <ul className="text-left text-sm text-text-secondary space-y-2 mx-auto max-w-sm">
                        <li className="flex items-start gap-2"><Lock className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" /> Fullscreen will be enforced</li>
                        <li className="flex items-start gap-2"><Lock className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" /> Copy, paste, and right-click are blocked</li>
                        <li className="flex items-start gap-2"><Lock className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" /> Tab switching is monitored</li>
                        <li className="flex items-start gap-2"><Lock className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" /> {violationThreshold} violations = auto-submit with 0 marks</li>
                    </ul>
                    <div className="space-y-3 pt-2">
                        <p className="text-xs text-text-secondary">
                            <strong>{quizData.title}</strong> · {quizData.questions.length} questions · {formatTime(quizData.questions.length * 120)} time limit
                        </p>
                        <button
                            onClick={startExam}
                            className="w-full px-6 py-3 bg-primary text-text-inverse rounded-xl font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                        >
                            <ShieldAlert className="w-5 h-5" /> Enter Secure Mode & Start Quiz
                        </button>
                        <button
                            onClick={() => navigate('/student/dashboard')}
                            className="w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                        >
                            Go back to Dashboard
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    // ── Result Screen ─────────────────────────────────────────────
    if (result) {
        return (
            <div className="min-h-screen p-8 flex items-center justify-center">
                <Card className="max-w-md w-full text-center space-y-6 p-8">
                    {result.forced && (
                        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 mb-4">
                            <div className="flex items-center justify-center gap-2 text-danger font-bold text-sm mb-1">
                                <ShieldAlert className="w-5 h-5" /> Quiz Auto-Submitted
                            </div>
                            <p className="text-xs text-danger/80">
                                This quiz was automatically submitted due to integrity violations.
                                Your teacher has been notified.
                            </p>
                        </div>
                    )}
                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${result.accuracy >= 60 ? 'bg-success/20' : 'bg-danger/20'}`}>
                        {result.accuracy >= 60 ? <CheckCircle className="text-success w-10 h-10" /> : <HelpCircle className="text-danger w-10 h-10" />}
                    </div>
                    <h2 className="text-2xl font-heading font-bold text-text-primary">Quiz Evaluation Complete</h2>

                    <div className="p-4 bg-surface-alt/50 rounded-xl border border-border-base space-y-3">
                        <div className="flex justify-between items-center text-sm text-text-secondary">
                            <span>Time Taken</span>
                            <span className="font-medium text-text-primary">{formatTime(result.timeTaken)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-text-secondary">
                            <span>Accuracy</span>
                            <span className={`font-medium ${result.accuracy >= 60 ? 'text-success' : 'text-danger'}`}>{Math.round(result.accuracy)}%</span>
                        </div>
                        {violationCount > 0 && (
                            <div className="flex justify-between items-center text-sm text-text-secondary">
                                <span>Integrity Violations</span>
                                <span className="font-medium text-danger">{violationCount}</span>
                            </div>
                        )}
                        <div className="h-px bg-border-base w-full" />
                        <div className="flex justify-between items-center font-bold text-lg pt-2">
                            <span className="text-primary">Marks Assigned</span>
                            <span className="text-primary-hover bg-primary/10 px-3 py-1 rounded-lg">{(result.score || 0).toFixed(1)} Pts</span>
                        </div>
                    </div>

                    {result.weakNodes && result.weakNodes.length > 0 && (
                        <div className="text-left bg-danger/5 border border-danger/20 p-4 rounded-xl mt-4 space-y-4">
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-bold text-danger mb-2">
                                    <BrainCircuit className="w-4 h-4" /> Recommended Revisions
                                </h4>
                                <ul className="text-xs text-text-secondary list-disc pl-4 space-y-1">
                                    {Array.from(new Set(result.weakNodes)).map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                            </div>
                            <div className="border-t border-danger/20 pt-4 mt-2">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-text-secondary mb-2">
                                    <Youtube className="w-4 h-4 text-danger" /> Watch to overcome weakness
                                </h4>
                                <div className="flex flex-col gap-2">
                                    {Array.from(new Set(result.weakNodes)).slice(0, 2).map((w, i) => (
                                        <a key={i} href={`https://www.youtube.com/results?search_query=${encodeURIComponent("Learn " + w + " explanation")}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded border border-primary/20 transition-colors flex justify-between items-center">
                                            <span className="truncate pr-2">Learn {w} on Youtube</span>
                                            <ArrowRight className="w-3 h-3 flex-shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <button onClick={() => navigate('/student/dashboard')} className="w-full mt-6 px-6 py-3 bg-primary text-text-inverse rounded-xl font-semibold hover:bg-primary-hover transition-colors">Return to Dashboard</button>
                </Card>
            </div>
        );
    }

    // ── Active Quiz Screen ────────────────────────────────────────
    const currentQ = quizData.questions[currentIdx];

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen relative select-none">
            {/* Violation Toast */}
            <AnimatePresence>
                {toastVisible && (
                    <motion.div
                        initial={{ y: -80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -80, opacity: 0 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-warning/90 text-black px-6 py-3 rounded-xl shadow-xl backdrop-blur-sm border border-warning/50 flex items-center gap-3 max-w-lg"
                    >
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{toastMsg}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Strong Warning Modal */}
            <AnimatePresence>
                {warningType === 'STRONG_WARNING' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface-base border-2 border-danger rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl"
                        >
                            <div className="w-16 h-16 mx-auto rounded-full bg-danger/20 flex items-center justify-center">
                                <ShieldAlert className="w-8 h-8 text-danger" />
                            </div>
                            <h3 className="text-xl font-heading font-bold text-danger">Final Warning</h3>
                            <p className="text-sm text-text-secondary">{warningMessage}</p>
                            <button
                                onClick={() => setWarningType(null)}
                                className="w-full px-6 py-3 bg-danger text-white rounded-xl font-semibold hover:bg-danger/80 transition-colors"
                            >
                                I Understand — Continue Quiz
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-text-primary max-w-xl truncate">{quizData.title}</h1>
                    <p className="text-text-secondary text-sm">Question {currentIdx + 1} of {quizData.questions.length}</p>
                </div>
                <div className="flex items-center gap-4">
                    {violationCount > 0 && (
                        <div className="flex items-center gap-1.5 text-danger text-xs font-medium bg-danger/10 px-3 py-1.5 rounded-lg border border-danger/20">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {violationCount}/{violationThreshold}
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-primary font-mono text-xl bg-primary/10 px-4 py-2 rounded-xl backdrop-blur-md border border-primary/20">
                        <Clock className="w-5 h-5" />
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            {/* Question */}
            <motion.div
                key={currentIdx}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
            >
                <Card className="mb-6 relative overflow-hidden bg-surface-base">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
                    <h3 className="text-xl text-text-primary font-medium mb-8 leading-relaxed relative z-10">
                        {currentQ.questionText}
                    </h3>
                    <div className="space-y-4 relative z-10">
                        {currentQ.options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedOpt(opt)}
                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${selectedOpt === opt
                                    ? 'border-primary bg-primary/10 text-primary shadow-lg'
                                    : 'border-border-base bg-surface-alt text-text-secondary hover:border-primary/50 hover:bg-surface-hover'
                                    }`}
                            >
                                <div className={`w-6 h-6 rounded-full border flex flex-shrink-0 items-center justify-center text-xs font-bold transition-colors ${selectedOpt === opt ? 'border-primary bg-primary text-white' : 'border-border-base text-text-secondary'}`}>
                                    {String.fromCharCode(65 + i)}
                                </div>
                                <span>{opt}</span>
                            </button>
                        ))}
                    </div>
                </Card>

                <div className="flex justify-end mt-8">
                    <button
                        onClick={handleNext}
                        disabled={!selectedOpt || submitting}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-text-inverse rounded-xl font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Evaluating...' : currentIdx === quizData.questions.length - 1 ? 'Submit Assignment' : 'Next Question'}
                        {!submitting && <ArrowRight className="w-4 h-4" />}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default QuizAttempt;
