import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, Bot, User, Trash2, BookOpen, Lightbulb, ListChecks, AlertTriangle, Loader } from 'lucide-react';
import Card from '../../components/common/Card';
import api from '../../api/axios';

const MAX_MESSAGE_LENGTH = 1000;

const AIResponseCard = ({ data }) => {
  if (!data) return null;

  return (
    <div className="space-y-3 w-full">
      {/* Main Answer */}
      <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">{data.answer || data.content}</p>

      {/* Explanation Steps */}
      {data.explanationSteps?.length > 0 && (
        <div className="bg-surface/60 dark:bg-surface-alt/80 rounded-lg p-3 border border-border-base/50 mt-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
            <ListChecks className="w-3 h-3 flex-shrink-0" /> Step-by-Step
          </h4>
          <ol className="space-y-1.5 list-decimal list-inside">
            {data.explanationSteps.map((step, idx) => (
              <li key={idx} className="text-xs text-text-secondary leading-relaxed">{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Related Concepts */}
      {data.relatedConcepts?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {data.relatedConcepts.map((item, idx) => {
            const conceptName = typeof item === 'string' ? item : item.concept;
            const relevance = typeof item === 'object' ? item.relevance : null;
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs bg-primary/15 text-primary px-2.5 py-1.5 rounded-lg border border-primary/25 transition-colors hover:bg-primary/20"
                title={relevance || ''}
              >
                <BookOpen className="w-3 h-3 flex-shrink-0" /> {conceptName}
              </span>
            );
          })}
        </div>
      )}

      {/* Suggested Practice */}
      {data.suggestedPractice?.length > 0 && (
        <div className="bg-warning/5 dark:bg-warning/10 rounded-lg p-3 border border-warning/20 mt-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-warning mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3 flex-shrink-0" /> Practice This
          </h4>
          <ul className="space-y-1">
            {data.suggestedPractice.map((item, idx) => (
              <li key={idx} className="text-xs text-text-secondary">• {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const AIDoubtSolver = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState('');

  // Load chat history on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const res = await api.get('/api/ai/chat/history');
        
        if (res.data.success && res.data.messages?.length > 0) {
          // Convert stored messages to display format
          const formattedMessages = res.data.messages.map((msg, idx) => ({
            id: idx,
            type: msg.role === 'USER' ? 'user' : 'ai',
            text: msg.content,
            data: msg.role === 'AI' ? { answer: msg.content } : null,
            timestamp: msg.timestamp,
          }));
          setMessages(formattedMessages);
        } else {
          // Show welcome message if no history
          setMessages([
            {
              id: 1,
              type: 'ai',
              text: "Hello! I'm your AI academic tutor. Ask me anything about your subjects and I'll provide detailed explanations. Your conversation is automatically saved!",
              data: null,
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
        // Use default welcome message on error
        setMessages([
          {
            id: 1,
            type: 'ai',
            text: "Hello! I'm your AI academic tutor. Ask me anything about your subjects and I'll provide detailed explanations. Your conversation is automatically saved!",
            data: null,
          }
        ]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    // Use requestAnimationFrame for smooth scrolling
    const timer = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(timer);
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setError(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setError('');
    const userMsg = { id: Date.now(), type: 'user', text: trimmed, data: null };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post('/api/ai/chat/message', { message: trimmed });
      
      if (res.data.success && res.data.aiMessage) {
        const aiResponse = res.data.aiMessage;
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'ai',
          text: aiResponse.content,
          data: {
            answer: aiResponse.content,
            explanationSteps: res.data.metadata?.explanationSteps || [],
            relatedConcepts: res.data.metadata?.relatedConcepts || [],
            suggestedPractice: res.data.metadata?.suggestedPractice || [],
          },
          timestamp: aiResponse.timestamp,
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'ai',
          text: 'Failed to process your question. Please try again.',
          data: null,
          isError: true,
        }]);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to get a response. Please try again.';
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        text: errMsg,
        data: null,
        isError: true,
      }]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = async () => {
    try {
      await api.delete('/api/ai/chat/clear');
      setMessages([
        {
          id: Date.now(),
          type: 'ai',
          text: "Chat cleared! Your next conversation will start fresh. Ready for a new question?",
          data: null,
        }
      ]);
      setError('');
    } catch (err) {
      setError('Failed to clear chat history. Please try again.');
      console.error('Clear chat error:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ═══ HEADER ═══ */}
      <div className="flex-shrink-0 bg-surface border-b border-border-base sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6 md:px-8 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="flex-shrink-0 flex items-center justify-center w-10 h-10 text-text-secondary hover:text-text-primary hover:bg-surface-alt rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-primary flex items-center gap-2 sm:gap-3 truncate">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-success flex-shrink-0" />
                  <span className="truncate">AI Doubt Solver</span>
                </h1>
                <p className="text-xs text-text-secondary mt-1 hidden sm:block">Context-aware • 24/7 Available • Persistent Memory</p>
              </div>
            </div>
            <button
              onClick={clearChat}
              disabled={messages.length === 0}
              className="flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-text-secondary hover:text-danger bg-surface-alt hover:bg-danger/5 border border-border-base hover:border-danger/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══ CHAT CONTAINER ═══ */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoadingHistory ? (
          // Loading spinner
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              </div>
              <p className="text-text-secondary text-sm">Loading your conversation...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          // Empty state
          <div className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary/60" />
              </div>
              <p className="text-text-primary font-semibold">Start asking your doubts</p>
              <p className="text-text-secondary text-sm">Type your question below and I'll provide detailed explanations. Your chat is automatically saved!</p>
            </div>
          </div>
        ) : (
          // Messages area
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 bg-background"
            style={{
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div className="max-w-3xl mx-auto w-full space-y-4 pb-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 animate-fadeIn ${
                    msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      msg.type === 'ai'
                        ? msg.isError
                          ? 'bg-danger/20 text-danger'
                          : 'bg-success/20 text-success'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {msg.type === 'ai' ? (
                      msg.isError ? (
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                      )
                    ) : (
                      <User className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-xs sm:max-w-md md:max-w-xl flex-1 ${msg.type === 'user' ? 'text-right' : ''}`}
                  >
                    <div
                      className={`inline-block px-4 py-3 sm:px-5 sm:py-3 rounded-2xl text-sm leading-relaxed break-words transition-all ${
                        msg.type === 'ai'
                          ? msg.isError
                            ? 'bg-danger/10 text-danger rounded-bl-none border border-danger/20'
                            : 'bg-surface-alt text-text-primary rounded-bl-none border border-border-base shadow-sm'
                          : 'bg-primary text-white rounded-br-none shadow-sm'
                      }`}
                    >
                      {msg.data ? <AIResponseCard data={msg.data} /> : <p className="whitespace-pre-wrap">{msg.text}</p>}
                    </div>
                    {msg.timestamp && (
                      <p className={`text-xs text-text-secondary mt-1 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-3 animate-fadeIn">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-success/20 text-success flex items-center justify-center">
                    <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="px-4 py-3 sm:px-5 rounded-2xl rounded-bl-none bg-surface-alt text-text-primary border border-border-base shadow-sm flex items-center gap-1.5 h-10 sm:h-11">
                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }} />
                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }} />
                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} className="h-0" />
            </div>
          </div>
        )}
      </div>

      {/* ═══ INPUT AREA ═══ */}
      <div className="flex-shrink-0 bg-surface border-t border-border-base shadow-lg">
        <div className="px-4 sm:px-6 md:px-8 py-3 sm:py-4">
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className="mb-3 p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-danger">{error}</p>
              </div>
            )}
            <form onSubmit={handleSend} className="space-y-3">
              <div className="flex gap-2 sm:gap-3">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask your doubt here..."
                    maxLength={MAX_MESSAGE_LENGTH}
                    disabled={isLoadingHistory || isTyping}
                    className="w-full px-4 py-2.5 sm:py-3 text-sm bg-background border border-border-base rounded-2xl text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-success/50 focus:border-success transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping || isLoadingHistory}
                    className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-success hover:bg-success-light text-white disabled:bg-success/50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm hover:shadow-md flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-text-secondary truncate">
                  {input.length}/{MAX_MESSAGE_LENGTH}
                </p>
                {isTyping && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Loader className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">AI is thinking...</span>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ═══ ANIMATIONS ═══ */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out forwards;
        }
        
        /* Smooth scroll behavior */
        div:has(> [ref="messagesEndRef"]) {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default AIDoubtSolver;
