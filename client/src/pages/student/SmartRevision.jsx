import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Cpu, Brain, Calendar, BookOpen, Clock,
  ChevronDown, ChevronUp, Globe, Loader2, AlertTriangle,
  Target, Printer, RefreshCw
} from 'lucide-react';
import Card from '../../components/common/Card';
import api from '../../api/axios';

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Spanish'];

const DAY_COLORS = [
  { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary', accent: 'bg-primary' },
  { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success', accent: 'bg-success' },
  { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning', accent: 'bg-warning' },
  { bg: 'bg-danger/10', border: 'border-danger/20', text: 'text-danger', accent: 'bg-danger' },
  { bg: 'bg-secondary/10', border: 'border-secondary/20', text: 'text-secondary', accent: 'bg-secondary' },
  { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary', accent: 'bg-primary' },
  { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success', accent: 'bg-success' },
];

const DayCard = ({ day, colorScheme }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={`border ${colorScheme.border} hover:shadow-lg transition-all duration-300 overflow-hidden`}>
      <div className="p-4 sm:p-5">
        {/* Day Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${colorScheme.bg} flex items-center justify-center`}>
              <span className={`text-lg font-bold ${colorScheme.text}`}>{day.day}</span>
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-sm">Day {day.day}</h3>
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="w-3 h-3" /> {day.timeAllocation}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-lg ${colorScheme.bg} hover:opacity-80 transition-all`}
          >
            {isExpanded ? <ChevronUp className={`w-4 h-4 ${colorScheme.text}`} /> : <ChevronDown className={`w-4 h-4 ${colorScheme.text}`} />}
          </button>
        </div>

        {/* Focus Topics */}
        <div className="flex flex-wrap gap-2 mb-3">
          {day.focusTopics?.map((topic, idx) => (
            <span key={idx} className={`inline-flex items-center gap-1 text-xs ${colorScheme.bg} ${colorScheme.text} px-2 py-1 rounded-lg border ${colorScheme.border} font-medium`}>
              <Target className="w-3 h-3" /> {topic}
            </span>
          ))}
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="space-y-3 mt-3 pt-3 border-t border-border-base animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Subtopics */}
            {day.subtopics?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-2 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Subtopics
                </h4>
                <ul className="space-y-1">
                  {day.subtopics.map((sub, idx) => (
                    <li key={idx} className="text-xs text-text-secondary flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 ${colorScheme.accent} rounded-full shrink-0 mt-1.5`} />
                      {sub}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Practice */}
            {day.recommendedPractice?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-2 flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Practice
                </h4>
                <ul className="space-y-1">
                  {day.recommendedPractice.map((practice, idx) => (
                    <li key={idx} className="text-xs text-text-secondary flex items-start gap-2">
                      <span className="text-success">✓</span> {practice}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

const SmartRevision = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  const generatePlan = async () => {
    setIsGenerating(true);
    setError('');
    setPlan(null);
    try {
      const res = await api.get(`/api/ai/smart-revision?language=${encodeURIComponent(language)}`);
      const data = res.data;

      // Validate structured response safely before rendering
      if (data && data.days && Array.isArray(data.days) && data.days.length > 0) {
        setPlan(data);
      } else {
        setError('Unable to generate revision plan. Please try again.');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to generate revision plan. Please try again.';
      setError(msg);
    } finally {
      setIsGenerating(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    generatePlan();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 min-h-screen print:p-2 print:max-w-full"
      style={{ fontFamily: "'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Telugu', 'Noto Sans Tamil', sans-serif" }}
    >
      <div className="print:hidden">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight text-text-primary mb-1 flex items-center gap-3">
            <Cpu className="w-8 h-8 text-primary" /> Smart Revision Engine
          </h1>
          <p className="text-text-secondary text-sm">Personalized 7-day revision plan based on your weak areas and quiz performance.</p>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          {/* Language Selector */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none bg-background border border-border-base rounded-xl px-3 py-2 pr-9 text-sm text-text-primary focus:outline-none focus:border-primary cursor-pointer"
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <Globe className="w-4 h-4 text-text-secondary absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={!plan}
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary border border-border-base rounded-xl transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Print
          </button>

          {/* Regenerate */}
          <button
            onClick={generatePlan}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border border-danger/30 bg-danger/5">
          <div className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isGenerating && (
        <Card className="h-64 flex flex-col items-center justify-center border border-primary/20">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 border-4 border-t-transparent border-r-transparent border-b-secondary border-l-secondary rounded-full animate-spin [animation-direction:reverse] opacity-70" />
            <Brain className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-2">Synthesizing Revision Plan...</h2>
          <p className="text-sm text-text-secondary text-center">Analyzing your quiz performance, weak areas, and risk profile.</p>
        </Card>
      )}

      {/* Results */}
      {plan && !isGenerating && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Overview */}
          <Card className="border border-primary/20 bg-primary/5">
            <div className="p-5">
              <h2 className="font-bold text-text-primary mb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" /> Plan Overview
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">{plan.overview}</p>
              {plan.metadata && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                    plan.metadata.riskLevel === 'HIGH' ? 'bg-danger/10 text-danger border border-danger/20' :
                    plan.metadata.riskLevel === 'MEDIUM' ? 'bg-warning/10 text-warning border border-warning/20' :
                    'bg-success/10 text-success border border-success/20'
                  }`}>
                    Risk: {plan.metadata.riskLevel}
                  </span>
                  {plan.metadata.weakTopicsUsed?.map((topic, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Day Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-2">
            {plan.days.map((day, idx) => (
              <DayCard key={idx} day={day} colorScheme={DAY_COLORS[idx % DAY_COLORS.length]} />
            ))}
          </div>

          {/* Revision Strategy */}
          {plan.revisionStrategy && (
            <Card className="border border-success/20 bg-success/5">
              <div className="p-5">
                <h2 className="font-bold text-text-primary mb-2 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-success" /> Revision Strategy
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed">{plan.revisionStrategy}</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isGenerating && !plan && hasLoaded && !error && (
        <Card className="h-48 flex flex-col items-center justify-center border border-border-base">
          <Brain className="w-12 h-12 text-text-secondary mb-3 opacity-50" />
          <p className="text-text-secondary text-sm">No revision plan generated yet. Click "Generate" to start.</p>
        </Card>
      )}
    </div>
  );
};

export default SmartRevision;
