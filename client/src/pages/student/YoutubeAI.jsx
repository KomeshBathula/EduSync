import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Video, Search, Play, FileText, CheckCircle2,
  ChevronDown, ChevronUp, Copy, BookOpen, HelpCircle, Globe, Loader2, AlertTriangle,
  Brain, Layers
} from 'lucide-react';
import Card from '../../components/common/Card';
import api from '../../api/axios';

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Spanish'];
const NOTE_SIZES = ['Small', 'Medium', 'Detailed'];

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false, iconColor = 'text-text-secondary' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-border-base rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-surface-alt/50 hover:bg-surface-alt transition-colors"
      >
        <span className="flex items-center gap-2 font-bold text-text-primary text-sm">
          <Icon className={`w-4 h-4 ${iconColor}`} /> {title}
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
      </button>
      {isOpen && <div className="p-4 bg-surface-base">{children}</div>}
    </div>
  );
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors">
      <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const YoutubeAI = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('English');
  const [noteSize, setNoteSize] = useState('Medium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Post-reading quiz state
  const [quizData, setQuizData] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  
  // Quiz config state
  const [showQuizConfig, setShowQuizConfig] = useState(false);
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState('MEDIUM');

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!url) return;
    setIsProcessing(true);
    setError('');
    setResult(null);
    setQuizData(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    try {
      const res = await api.post('/api/ai/youtube-summary', { url, language, noteSize });
      setResult(res.data);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to summarize video. Please try again.';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!result) {
      setError('No summary available. Please summarize a video first.');
      return;
    }
    
    // Validate summary exists and has content
    if (!result.summary || result.summary.trim().length === 0) {
      setError('Summary is empty. Please try summarizing the video again.');
      return;
    }

    if (result.summary.trim().length < 50) {
      setError('Summary is too short to generate a meaningful quiz. Try a longer video or use detailed notes.');
      return;
    }

    setQuizLoading(true);
    setQuizData(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setError(''); // Clear any previous errors
    
    try {
      const res = await api.post('/api/ai/youtube-quiz', {
        summaryContent: result.summary,
        questionCount: quizQuestionCount,
        difficulty: quizDifficulty,
      });
      
      if (res.data?.error) {
        setError(res.data.error);
        return;
      }
      
      if (!res.data?.questions || res.data.questions.length === 0) {
        setError('Quiz generation failed. No questions were generated. Please try again.');
        return;
      }
      
      setQuizData(res.data);
      setShowQuizConfig(false);
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to generate quiz. Please try again.';
      const debugInfo = err?.response?.data?.debug;
      setError(debugInfo ? `${errorMsg} (Debug: ${JSON.stringify(debugInfo)})` : errorMsg);
      console.error('Quiz generation error:', err?.response?.data || err);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
  };

  const getQuizScore = () => {
    if (!quizData?.questions) return { correct: 0, total: 0 };
    let correct = 0;
    quizData.questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctOptionIndex) correct++;
    });
    return { correct, total: quizData.questions.length };
  };

  const buildYoutubeEmbedUrl = (videoId) => {
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const getAllTextForCopy = () => {
    if (!result) return '';
    let text = `# ${result.title}\n\n`;
    text += `## Summary\n${result.summary}\n\n`;
    if (result.keyConcepts?.length) {
      text += `## Key Concepts\n`;
      result.keyConcepts.forEach(c => {
        text += `- **${c.concept || c}**: ${c.explanation || ''}\n`;
      });
      text += '\n';
    }
    if (result.detailedNotes?.length) {
      text += `## Detailed Notes\n`;
      result.detailedNotes.forEach(n => {
        text += `### ${n.topic || 'Note'}\n${n.content || n}\n\n`;
      });
    }
    if (result.practiceQuestions?.length) {
      text += `## Practice Questions\n`;
      result.practiceQuestions.forEach((q, i) => {
        text += `${i + 1}. ${q.question || q}\n`;
        if (q.hint) text += `   Hint: ${q.hint}\n`;
      });
    }
    return text;
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 min-h-screen" style={{ fontFamily: "'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Telugu', 'Noto Sans Tamil', sans-serif" }}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-text-primary mb-2 flex items-center gap-3">
          <Video className="w-8 h-8 text-danger" /> YouTube AI Summarizer
        </h1>
        <p className="text-text-secondary">Paste any educational YouTube link — AI extracts transcript, concepts, and practice questions.</p>
      </div>

      {/* Input Form */}
      <Card className="mb-6 border border-danger/20">
        <form onSubmit={handleProcess} className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-background border border-border-base rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-danger/50 pl-12"
                maxLength={200}
              />
              <Search className="w-5 h-5 text-text-secondary absolute left-4 top-3.5" />
            </div>

            {/* Language Selector */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="appearance-none bg-background border border-border-base rounded-xl px-4 py-3 pr-10 text-text-primary focus:outline-none focus:border-danger/50 text-sm cursor-pointer min-w-[140px]"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <Globe className="w-4 h-4 text-text-secondary absolute right-3 top-3.5 pointer-events-none" />
            </div>

            {/* Note Size Selector */}
            <div className="relative">
              <select
                value={noteSize}
                onChange={(e) => setNoteSize(e.target.value)}
                className="appearance-none bg-background border border-border-base rounded-xl px-4 py-3 pr-10 text-text-primary focus:outline-none focus:border-danger/50 text-sm cursor-pointer min-w-[130px]"
              >
                {NOTE_SIZES.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <Layers className="w-4 h-4 text-text-secondary absolute right-3 top-3.5 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="px-6 py-3 bg-[#FF0000] hover:bg-[#CC0000] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg min-w-[140px]"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : (
                <><Play className="w-4 h-4" /> Summarize</>
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border border-danger/30 bg-danger/5">
          <div className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isProcessing && (
        <Card className="border border-danger/20">
          <div className="p-12 flex flex-col items-center justify-center">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-t-danger border-r-danger border-b-transparent border-l-transparent rounded-full animate-spin" />
              <Video className="w-8 h-8 text-danger absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2">Analyzing Video...</h2>
            <p className="text-sm text-text-secondary text-center">Fetching transcript, extracting concepts, and generating structured notes.</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {result && !isProcessing && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Video Preview + Title */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border border-border-base overflow-hidden">
              {result.videoId ? (
                <div className="aspect-video">
                  <iframe
                    src={buildYoutubeEmbedUrl(result.videoId)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video preview"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-surface-alt flex items-center justify-center">
                  <Play className="w-16 h-16 text-text-secondary" />
                </div>
              )}
              <div className="p-4">
                <h2 className="text-lg font-bold text-text-primary mb-2">{result.title}</h2>
                <span className="text-xs font-bold uppercase tracking-widest text-danger bg-danger/10 px-3 py-1 rounded-full">
                  AI Analyzed
                </span>
              </div>
            </Card>

            {/* Summary */}
            <Card className="lg:col-span-2 border border-border-base">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <FileText className="w-5 h-5 text-text-secondary" /> AI Summary
                  </h3>
                  <CopyButton text={getAllTextForCopy()} />
                </div>
                <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">{result.summary}</p>
              </div>
            </Card>
          </div>

          {/* Collapsible Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Concepts */}
            {result.keyConcepts?.length > 0 && (
              <CollapsibleSection title="Key Concepts" icon={BookOpen} defaultOpen iconColor="text-primary">
                <ul className="space-y-3">
                  {result.keyConcepts.map((item, idx) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-text-primary text-sm">{item.concept || item}</span>
                        {item.explanation && <p className="text-xs text-text-secondary mt-1">{item.explanation}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {/* Practice Questions */}
            {result.practiceQuestions?.length > 0 && (
              <CollapsibleSection title="Practice Questions" icon={HelpCircle} defaultOpen iconColor="text-warning">
                <ol className="space-y-3 list-decimal list-inside">
                  {result.practiceQuestions.map((item, idx) => (
                    <li key={idx} className="text-sm text-text-primary">
                      <span className="font-medium">{item.question || item}</span>
                      {item.hint && <p className="text-xs text-text-secondary mt-1 ml-5 italic">Hint: {item.hint}</p>}
                    </li>
                  ))}
                </ol>
              </CollapsibleSection>
            )}
          </div>

          {/* Detailed Notes */}
          {result.detailedNotes?.length > 0 && (
            <CollapsibleSection title="Detailed Notes" icon={FileText} defaultOpen iconColor="text-success">
              <div className="space-y-4">
                {result.detailedNotes.map((note, idx) => (
                  <div key={idx} className="border-l-2 border-success/30 pl-4">
                    <h4 className="font-semibold text-text-primary text-sm mb-1">{note.topic || `Section ${idx + 1}`}</h4>
                    <p className="text-sm text-text-secondary leading-relaxed">{note.content || note}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Post-Reading Quiz Section */}
          <Card className="border border-warning/20 bg-warning/5">
            <div className="p-5">
              {!quizData && !quizLoading && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                      <Brain className="w-5 h-5 text-warning" /> Test Your Understanding
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">Customize and take a quiz based on this video to reinforce your learning.</p>
                  </div>
                  
                  {/* Warning if summary is too short */}
                  {result?.summary && result.summary.trim().length < 50 && (
                    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <p className="text-xs text-text-secondary">
                        The summary is too short to generate a meaningful quiz. Try using a longer video or select "Detailed" note size.
                      </p>
                    </div>
                  )}
                  
                  {!showQuizConfig ? (
                    <button
                      onClick={() => setShowQuizConfig(true)}
                      disabled={!result?.summary || result.summary.trim().length < 50}
                      className={`px-5 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 text-sm ${
                        result?.summary && result.summary.trim().length >= 50
                          ? 'bg-warning hover:bg-warning/80 text-white cursor-pointer'
                          : 'bg-surface-alt text-text-secondary cursor-not-allowed opacity-50'
                      }`}
                    >
                      <Brain className="w-4 h-4" /> Generate Quiz
                    </button>
                  ) : (
                    <div className="bg-surface rounded-xl border border-warning/20 p-5 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-text-primary mb-3">Number of Questions:</label>
                        <div className="flex gap-3">
                          {[5, 10, 15].map(count => (
                            <button
                              key={count}
                              onClick={() => setQuizQuestionCount(count)}
                              className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-sm transition-all ${
                                quizQuestionCount === count
                                  ? 'bg-warning text-white border-warning'
                                  : 'bg-surface-alt text-text-secondary border border-border-base hover:border-warning/50'
                              }`}
                            >
                              {count} Qs
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-text-primary mb-3">Difficulty Level:</label>
                        <div className="flex gap-3">
                          {['EASY', 'MEDIUM', 'HARD'].map(level => (
                            <button
                              key={level}
                              onClick={() => setQuizDifficulty(level)}
                              className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-sm transition-all ${
                                quizDifficulty === level
                                  ? 'bg-warning text-white border-warning'
                                  : 'bg-surface-alt text-text-secondary border border-border-base hover:border-warning/50'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleGenerateQuiz}
                          className="flex-1 px-5 py-2.5 bg-warning hover:bg-warning/80 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Brain className="w-4 h-4" /> Generate Quiz
                        </button>
                        <button
                          onClick={() => setShowQuizConfig(false)}
                          className="flex-1 px-5 py-2.5 bg-surface-alt hover:bg-surface-alt/80 text-text-secondary font-bold rounded-xl transition-all text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {quizLoading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-warning animate-spin mb-3" />
                  <p className="text-sm text-text-secondary">Generating comprehension quiz...</p>
                </div>
              )}

              {quizData?.questions?.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                      <Brain className="w-5 h-5 text-warning" /> Comprehension Quiz
                    </h3>
                    {quizData.riskLevel && (
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                        quizData.riskLevel === 'HIGH' ? 'bg-danger/10 text-danger border border-danger/20' :
                        quizData.riskLevel === 'MEDIUM' ? 'bg-warning/10 text-warning border border-warning/20' :
                        'bg-success/10 text-success border border-success/20'
                      }`}>
                        Difficulty: {quizData.riskLevel === 'HIGH' ? 'Basic' : quizData.riskLevel === 'MEDIUM' ? 'Moderate' : 'Challenging'}
                      </span>
                    )}
                  </div>

                  {quizData.questions.map((q, qIdx) => {
                    const userAnswer = quizAnswers[qIdx];
                    const isAnswered = userAnswer !== undefined;
                    const isCorrect = userAnswer === q.correctOptionIndex;

                    return (
                      <div key={qIdx} className="bg-surface rounded-xl border border-border-base p-4">
                        <p className="text-sm font-semibold text-text-primary mb-3">
                          {qIdx + 1}. {q.questionText}
                        </p>
                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => {
                            let optionStyle = 'border-border-base bg-surface-alt text-text-secondary hover:border-warning/50';
                            if (quizSubmitted) {
                              if (optIdx === q.correctOptionIndex) {
                                optionStyle = 'border-success bg-success/10 text-success';
                              } else if (optIdx === userAnswer && !isCorrect) {
                                optionStyle = 'border-danger bg-danger/10 text-danger';
                              }
                            } else if (optIdx === userAnswer) {
                              optionStyle = 'border-warning bg-warning/10 text-warning';
                            }

                            return (
                              <button
                                key={optIdx}
                                onClick={() => {
                                  if (!quizSubmitted) {
                                    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
                                  }
                                }}
                                disabled={quizSubmitted}
                                className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-center gap-3 ${optionStyle}`}
                              >
                                <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  optIdx === userAnswer ? 'border-current bg-current/20' : 'border-border-base'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {quizSubmitted && q.explanation && (
                          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-xs text-text-secondary">
                              <span className="font-bold text-primary">Explanation:</span> {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!quizSubmitted ? (
                    <button
                      onClick={handleQuizSubmit}
                      disabled={Object.keys(quizAnswers).length < quizData.questions.length}
                      className="w-full py-3 bg-warning hover:bg-warning/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Submit Quiz
                    </button>
                  ) : (
                    <div className={`p-4 rounded-xl text-center ${
                      getQuizScore().correct >= getQuizScore().total * 0.7 ? 'bg-success/10 border border-success/20' : 'bg-danger/10 border border-danger/20'
                    }`}>
                      <p className="text-lg font-bold text-text-primary">
                        Score: {getQuizScore().correct} / {getQuizScore().total}
                      </p>
                      <p className="text-sm text-text-secondary mt-1">
                        {getQuizScore().correct >= getQuizScore().total * 0.7
                          ? 'Great understanding! Keep it up!'
                          : 'Review the explanations above to strengthen your understanding.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default YoutubeAI;
