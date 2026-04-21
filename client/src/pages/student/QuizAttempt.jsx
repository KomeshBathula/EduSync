import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../../components/common/Card';
import { Clock, CheckCircle, ArrowRight, BrainCircuit, HelpCircle, ShieldAlert, AlertTriangle, Lock } from 'lucide-react';
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
    const [strictMode, setStrictMode] = useState(false);

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

    // ── Handle strict mode force-submit (immediate termination) ─────
    const handleForceSubmit = useCallback(async (violationType, metadata = {}) => {
        if (forcedSubmit) return; // Already terminated

        setForcedSubmit(true);
        controllerRef.current?.deactivate();

        try {
            const res = await api.post(`/api/quiz/${id}/force-submit`, {
                violationType,
                answers: answersRef.current,
            });

            setResult({
                score: res.data.marksAssigned ?? 0,
                max: quizDataRef.current?.questions?.length || 0,
                accuracy: res.data.accuracyPercentage ?? 0,
                weakNodes: [],
                timeTaken: 0,
                forced: true,
                terminationReason: res.data.terminationReason,
            });

            showToast('🚨 Quiz terminated due to security violation');
        } catch (err) {
            console.error('Force submit error:', err);
            if (err.response?.status === 409) {
                // Already force-submitted
                setResult({
                    score: 0,
                    max: 0,
                    accuracy: 0,
                    weakNodes: [],
                    timeTaken: 0,
                    forced: true,
                    terminationReason: 'Security violation detected',
                });
            }
        }
    }, [id, answersRef, quizDataRef, forcedSubmit, showToast]);

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
                const isStrictMode = configRes.data.strictMode || false;
                setViolationThreshold(threshold);
                setStrictMode(isStrictMode);

                // Fetch quiz
                const res = await api.get(`/api/quiz/${id}/attempt`);
                setQuizData(res.data);
                const totalTime = res.data.questions ? res.data.questions.length * 120 : 15 * 60;
                setTimeLeft(totalTime);

                // Initialize secure exam controller
                const controller = createSecureExamController({
                    threshold,
                    strictMode: isStrictMode,
                    onViolation: (eventType, metadata) => {
                        reportViolationToServer(eventType, metadata);
                    },
                    onForceSubmit: (eventType, metadata) => {
                        handleForceSubmit(eventType, metadata);
                    },
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
    }, [id, navigate, reportViolationToServer, handleForceSubmit]);

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
                        <div className={`${strictMode ? 'bg-danger/10 border border-danger/30' : 'bg-warning/10 border border-warning/30'} rounded-xl p-4 mb-4`}>
                            <div className={`flex items-center justify-center gap-2 ${strictMode ? 'text-danger' : 'text-warning'} font-bold text-sm mb-1`}>
                                <ShieldAlert className="w-5 h-5" /> 
                                {strictMode ? '🚨 Quiz Terminated' : 'Auto-Submitted'}
                            </div>
                            <p className={`text-xs ${strictMode ? 'text-danger/80' : 'text-warning/80'}`}>
                                {strictMode 
                                    ? 'Your quiz was terminated due to a security violation. No second chances in strict lockdown mode.'
                                    : 'This quiz was automatically submitted due to integrity violations. Your teacher has been notified.'
                                }
                            </p>
                            {result.terminationReason && (
                                <p className={`text-xs mt-2 ${strictMode ? 'text-danger/70' : 'text-warning/70'}`}>
                                    <strong>Reason:</strong> {result.terminationReason}
                                </p>
                            )}
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
                        </div>
                    )}

                    <button onClick={() => navigate(`/student/quiz/${id}/review`)} className="w-full mt-6 px-6 py-3 bg-primary text-text-inverse rounded-xl font-semibold hover:bg-primary-hover transition-colors">View Detailed Review</button>
                </Card>
            </div>
        );
    }

    // ── Active Quiz Screen ────────────────────────────────────────
    const currentQ = quizData.questions[currentIdx];

    return (
        <div className="min-h-screen bg-background flex flex-col relative select-none overflow-hidden pb-24 md:pb-8">
            {/* Violation Toast */}
            <AnimatePresence>
                {toastVisible && (
                    <motion.div
                        initial={{ y: -80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -80, opacity: 0 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-warning/90 text-black px-4 py-3 rounded-xl shadow-xl backdrop-blur-sm border border-warning/50 flex items-center gap-3 w-[90%] max-w-md"
                    >
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium leading-tight">{toastMsg}</span>
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
                        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-surface border-2 border-danger rounded-2xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl"
                        >
                            <div className="w-16 h-16 mx-auto rounded-full bg-danger/20 flex items-center justify-center mb-4">
                                <ShieldAlert className="w-8 h-8 text-danger" />
                            </div>
                            <h3 className="text-xl font-heading font-bold text-danger mb-2">Final Warning</h3>
                            <p className="text-sm text-text-secondary mb-6 leading-relaxed">{warningMessage}</p>
                            <button
                                onClick={() => setWarningType(null)}
                                className="w-full px-6 py-4 bg-danger text-white rounded-xl font-bold hover:bg-danger/90 active:scale-[0.98] transition-all"
                            >
                                I Understand — Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticky Mobile/Desktop Header */}
            <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border-subtle p-4 md:px-8 md:py-6 shadow-sm">
                <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg md:text-2xl font-heading font-bold text-text-primary truncate">{quizData.title}</h1>
                        <p className="text-text-secondary text-xs md:text-sm font-medium mt-0.5">Question {currentIdx + 1} of {quizData.questions.length}</p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        {violationCount > 0 && (
                            <div className="flex items-center gap-1 text-danger text-xs font-bold bg-danger/10 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-danger/20">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{violationCount}/{violationThreshold}</span>
                            </div>
                        )}
                        <div className={`flex items-center gap-1.5 md:gap-2 font-mono text-sm md:text-xl px-3 py-1.5 md:px-4 md:py-2 rounded-xl backdrop-blur-md border transition-colors ${timeLeft < 60 ? 'bg-danger/10 text-danger border-danger/20 animate-pulse' : 'bg-primary/10 text-primary border-primary/20'}`}>
                            <Clock className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="font-bold">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Question Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        key={currentIdx}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="relative z-10 pb-20 md:pb-0" // Add padding bottom for mobile sticky button
                    >
                        <div className="mb-6 relative overflow-hidden bg-surface rounded-[var(--radius-xl)] border border-border-base p-5 md:p-8 shadow-sm">
                            <h3 className="text-lg md:text-xl text-text-primary font-bold mb-6 md:mb-8 leading-relaxed relative z-10">
                                {currentQ.questionText}
                            </h3>
                            <div className="flex flex-col gap-3 md:gap-4 relative z-10">
                                {currentQ.options.map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedOpt(opt)}
                                        className={`w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all flex items-start gap-4 min-h-[64px] ${selectedOpt === opt
                                            ? 'border-primary bg-primary/5 text-primary shadow-[0_4px_12px_rgba(var(--color-primary-base-rgb),0.15)] transform scale-[1.01]'
                                            : 'border-border-base bg-surface-alt text-text-secondary hover:border-primary/40 hover:bg-surface active:scale-[0.99]'
                                            }`}
                                    >
                                        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex flex-shrink-0 items-center justify-center text-sm md:text-base font-bold transition-colors mt-0.5 ${selectedOpt === opt ? 'border-primary bg-primary text-white' : 'border-border-subtle text-text-muted bg-surface'}`}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className={`text-sm md:text-base leading-relaxed ${selectedOpt === opt ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>{opt}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Desktop Next Button */}
                        <div className="hidden md:flex justify-end mt-8">
                            <button
                                onClick={handleNext}
                                disabled={!selectedOpt || submitting}
                                className={`px-8 py-4 rounded-xl flex items-center gap-3 font-bold text-lg transition-all shadow-level2 ${!selectedOpt || submitting ? 'bg-surface-alt text-text-muted cursor-not-allowed border border-border-base' : 'bg-primary text-white hover:bg-primary-hover hover:scale-[1.02]'}`}
                            >
                                <span>{submitting ? 'Processing...' : (currentIdx === quizData.questions.length - 1 ? 'Submit Assessment' : 'Confirm & Next')}</span>
                                {!submitting && (currentIdx === quizData.questions.length - 1 ? <CheckCircle className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />)}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Mobile Sticky Next Button */}
            <div className="md:hidden fixed bottom-0 left-0 w-full p-4 bg-background/90 backdrop-blur-md border-t border-border-subtle z-40 pb-safe">
                <button
                    onClick={handleNext}
                    disabled={!selectedOpt || submitting}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-base transition-all shadow-lg active:scale-[0.98] ${!selectedOpt || submitting ? 'bg-surface-alt text-text-muted cursor-not-allowed border border-border-base' : 'bg-primary text-white'}`}
                >
                    <span>{submitting ? 'Processing...' : (currentIdx === quizData.questions.length - 1 ? 'Submit Assessment' : 'Confirm & Next')}</span>
                    {!submitting && (currentIdx === quizData.questions.length - 1 ? <CheckCircle className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />)}
                </button>
            </div>
        </div>
    );
};

export default QuizAttempt;
