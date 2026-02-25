import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../components/common/GlassCard';
import { Clock, CheckCircle, ArrowRight, BrainCircuit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_QUIZ_DATA = {
    title: "Dynamic Programming Fundamentals",
    questions: [
        { id: 1, text: "What is the primary characteristic of problems solvable by Dynamic Programming?", options: ["Optimal Substructure", "Greedy Choice Property", "Divide and Conquer", "Backtracking"] },
        { id: 2, text: "Which approach solves subproblems from top to bottom?", options: ["Memoization", "Tabulation", "Recursion", "Iterative"] },
        { id: 3, text: "In a 0/1 Knapsack problem, what state variables are needed?", options: ["Capacity and Item Index", "Weights Only", "Values Only", "Max Capacity Limits"] }
    ]
};

const QuizAttempt = () => {
    const navigate = useNavigate();
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOpt, setSelectedOpt] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleNext = () => {
        setAnswers(prev => ({ ...prev, [MOCK_QUIZ_DATA.questions[currentIdx].id]: selectedOpt }));
        setSelectedOpt(null);
        if (currentIdx < MOCK_QUIZ_DATA.questions.length - 1) {
            setCurrentIdx(currentIdx + 1);
        } else {
            setSubmitting(true);
            setTimeout(() => {
                setResult({ score: 2.5, max: 5, weakNodes: ['Tabulation', 'Knapsack State'] });
                setSubmitting(false);
            }, 1500); // Mock processing
        }
    };

    if (result) {
        return (
            <div className="min-h-screen p-8 flex items-center justify-center">
                <GlassCard className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="text-green-400 w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-outfit font-bold text-white">Quiz Evaluation Complete</h2>

                    <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-sm text-slate-400">
                            <span>Time Taken</span>
                            <span className="font-medium text-white">{formatTime((15 * 60) - timeLeft)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-slate-400">
                            <span>Accuracy</span>
                            <span className="font-medium text-white">50%</span>
                        </div>
                        <div className="h-px bg-white/10 w-full" />
                        <div className="flex justify-between items-center font-bold text-lg pt-2">
                            <span className="text-indigo-300">Marks Assigned</span>
                            <span className="text-white bg-indigo-500/20 px-3 py-1 rounded-lg">2.5 / 5.0</span>
                        </div>
                    </div>

                    <div className="text-left bg-red-500/10 border border-red-500/20 p-4 rounded-xl mt-4">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-red-400 mb-2">
                            <BrainCircuit className="w-4 h-4" /> Recommended Revisions
                        </h4>
                        <ul className="text-xs text-slate-300 list-disc pl-4 space-y-1">
                            {result.weakNodes.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    </div>

                    <button onClick={() => navigate('/student/dashboard')} className="cyber-button w-full mt-6">Return to Dashboard</button>
                </GlassCard>
            </div>
        );
    }

    const currentQ = MOCK_QUIZ_DATA.questions[currentIdx];

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-outfit font-bold text-white">{MOCK_QUIZ_DATA.title}</h1>
                    <p className="text-slate-400 text-sm">Question {currentIdx + 1} of {MOCK_QUIZ_DATA.questions.length}</p>
                </div>
                <div className="flex items-center gap-2 text-indigo-400 font-mono text-xl bg-indigo-500/10 px-4 py-2 rounded-xl backdrop-blur-md border border-indigo-500/20">
                    <Clock className="w-5 h-5" />
                    {formatTime(timeLeft)}
                </div>
            </div>

            <motion.div
                key={currentIdx}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                <GlassCard className="mb-6 relative overflow-hidden">
                    {/* Soft glow based on question progression */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full" />

                    <h3 className="text-xl text-white font-medium mb-8 leading-relaxed relative z-10">
                        {currentQ.text}
                    </h3>

                    <div className="space-y-4 relative z-10">
                        {currentQ.options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedOpt(opt)}
                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${selectedOpt === opt
                                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-100 shadow-[0_0_20px_rgba(79,70,229,0.15)]'
                                        : 'border-white/10 bg-black/20 text-slate-300 hover:border-white/20 hover:bg-white/5'
                                    }`}
                            >
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${selectedOpt === opt ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-500 text-slate-500'
                                    }`}>
                                    {String.fromCharCode(65 + i)}
                                </div>
                                {opt}
                            </button>
                        ))}
                    </div>
                </GlassCard>

                <div className="flex justify-end mt-8">
                    <button
                        onClick={handleNext}
                        disabled={!selectedOpt}
                        className="cyber-button flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Evaluating...' : currentIdx === MOCK_QUIZ_DATA.questions.length - 1 ? 'Submit Assignment' : 'Next Question'}
                        {!submitting && <ArrowRight className="w-4 h-4" />}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default QuizAttempt;
