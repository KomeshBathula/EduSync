import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, TrendingUp, BookOpen } from 'lucide-react';
import api from '../../api/axios';
import Card from '../../components/common/Card';

const QuizReview = () => {
  const { id: quizId } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadReview = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/quiz/${quizId}/review`);
        setReview(res.data);
        setError('');
      } catch (err) {
        console.error('Failed to load review:', err);
        setError(err?.response?.data?.message || 'Failed to load quiz review. Please try again.');
        setReview(null);
      } finally {
        setLoading(false);
      }
    };

    if (quizId) loadReview();
  }, [quizId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
          <p className="text-text-secondary text-sm">Loading your quiz review...</p>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto bg-danger/10 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Unable to Load Review</h2>
          <p className="text-text-secondary text-sm mb-6">{error || 'Quiz review not found.'}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Back to Dashboard
          </button>
        </Card>
      </div>
    );
  }

  const correctCount = review.questions.filter(q => q.isCorrect).length;
  const totalQuestions = review.questions.length;
  const timeMinutes = Math.floor(review.timeTakenSeconds / 60);
  const timeSeconds = review.timeTakenSeconds % 60;

  return (
    <div className="min-h-screen bg-background">
      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-10 bg-surface border-b border-border-base shadow-sm">
        <div className="px-4 sm:px-6 md:px-8 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-primary truncate">
                {review.quizTitle}
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Completed {new Date(review.attemptedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SUMMARY CARDS ═══ */}
      <div className="px-4 sm:px-6 md:px-8 py-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {/* Score Card */}
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-primary">{review.accuracy}%</p>
            <p className="text-xs text-text-secondary mt-1">Accuracy</p>
          </Card>

          {/* Correct Count Card */}
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-success">
              {correctCount}/{totalQuestions}
            </p>
            <p className="text-xs text-text-secondary mt-1">Correct</p>
          </Card>

          {/* Time Card */}
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-secondary">
              {timeMinutes}m {timeSeconds}s
            </p>
            <p className="text-xs text-text-secondary mt-1">Time Taken</p>
          </Card>

          {/* Questions Card */}
          <Card className="p-4 text-center">
            <div className="flex justify-center mb-2">
              <BookOpen className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-accent">{totalQuestions}</p>
            <p className="text-xs text-text-secondary mt-1">Questions</p>
          </Card>
        </div>

        {/* ═══ QUESTIONS REVIEW ═══ */}
        <div className="max-w-5xl mx-auto space-y-6">
          {review.questions.map((question, idx) => (
            <Card key={idx} className="p-4 sm:p-6 border-l-4" style={{
              borderLeftColor: question.isCorrect ? '#10b981' : '#ef4444'
            }}>
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs sm:text-sm font-medium text-text-secondary bg-surface-alt px-2.5 py-1 rounded-full">
                      Q{question.position}
                    </span>
                    {question.isCorrect ? (
                      <span className="flex items-center gap-1 text-xs sm:text-sm font-medium text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/20">
                        <CheckCircle className="w-3.5 h-3.5" /> Correct
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs sm:text-sm font-medium text-danger bg-danger/10 px-2.5 py-1 rounded-full border border-danger/20">
                        <XCircle className="w-3.5 h-3.5" /> Incorrect
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-text-primary leading-relaxed">
                    {question.questionText}
                  </h3>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2 mb-4">
                {question.options.map((option, optIdx) => {
                  const isCorrectOption = optIdx === question.correctOptionIndex;
                  const isStudentSelected = optIdx === question.studentSelectedIndex;

                  let optionClass = 'bg-surface-alt text-text-primary border border-border-base';
                  if (isCorrectOption && isStudentSelected) {
                    optionClass = 'bg-success/10 text-success border-2 border-success';
                  } else if (isCorrectOption) {
                    optionClass = 'bg-success/10 text-success border-2 border-success';
                  } else if (isStudentSelected) {
                    optionClass = 'bg-danger/10 text-danger border-2 border-danger';
                  }

                  return (
                    <div
                      key={optIdx}
                      className={`p-3 rounded-lg text-sm leading-relaxed transition-all ${optionClass}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-medium flex-shrink-0">
                          {String.fromCharCode(65 + optIdx)}.
                        </span>
                        <span className="flex-1">{option}</span>
                        {isCorrectOption && (
                          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        )}
                        {isStudentSelected && !isCorrectOption && (
                          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4">
                <h4 className="text-xs sm:text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  Why is this correct?
                </h4>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {question.explanation}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* ═══ ACTION BUTTONS ═══ */}
        <div className="max-w-5xl mx-auto mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate(`/student/quiz/${quizId}`)}
            className="px-6 py-2.5 bg-surface-alt text-text-primary border border-border-base rounded-lg hover:bg-surface-hover transition-colors font-medium text-sm"
          >
            Retry Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizReview;
