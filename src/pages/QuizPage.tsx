import { useState, useEffect, useCallback, useRef } from 'react';
import herbsData from '../data/herbs.json';
import formulasData from '../data/formulas.json';
import acupointsData from '../data/acupoints.json';
import type { Herb, Formula, Acupoint, DeckType } from '../types/index.ts';
import { generateQuiz, type QuizQuestion } from '../utils/quiz.ts';
import { saveQuizResult } from '../utils/storage.ts';

type Phase = 'setup' | 'quiz' | 'results';

const DECK_OPTIONS: { value: DeckType; label: string; icon: string }[] = [
  { value: 'herbs', label: 'Herbs', icon: '🌿' },
  { value: 'formulas', label: 'Formulas', icon: '📜' },
  { value: 'acupoints', label: 'Acupoints', icon: '📍' },
];

const COUNT_OPTIONS = [10, 20, 30] as const;
const TIMER_SECONDS = 60;

export default function QuizPage() {
  // Setup state
  const [deck, setDeck] = useState<DeckType>('herbs');
  const [timed, setTimed] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(20);

  // Quiz state
  const [phase, setPhase] = useState<Phase>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [missedQuestions, setMissedQuestions] = useState<QuizQuestion[]>([]);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQuestion = questions[currentIndex] ?? null;

  // Timer logic
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  // Auto-mark wrong when timer runs out
  useEffect(() => {
    if (timed && timeLeft === 0 && !answered && phase === 'quiz') {
      setAnswered(true);
      setSelectedAnswer(null);
      if (currentQuestion) {
        setMissedQuestions(prev => [...prev, currentQuestion]);
      }
    }
  }, [timeLeft, timed, answered, phase, currentQuestion]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  function handleStartQuiz() {
    const herbs = herbsData as Herb[];
    const formulas = formulasData as Formula[];
    const acupoints = acupointsData as Acupoint[];

    const q = generateQuiz(deck, herbs, formulas, acupoints, questionCount);
    setQuestions(q);
    setCurrentIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setMissedQuestions([]);
    setPhase('quiz');

    if (timed) {
      startTimer();
    }
  }

  function handleSelectAnswer(option: string) {
    if (answered) return;

    clearTimer();
    setSelectedAnswer(option);
    setAnswered(true);

    if (option === currentQuestion?.correctAnswer) {
      setScore(prev => prev + 1);
    } else if (currentQuestion) {
      setMissedQuestions(prev => [...prev, currentQuestion]);
    }
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      if (timed) startTimer();
    } else {
      // Quiz finished
      clearTimer();
      const finalScore = selectedAnswer === currentQuestion?.correctAnswer
        ? score
        : score;
      saveQuizResult({
        deck,
        score: finalScore,
        total: questions.length,
        date: new Date().toISOString(),
        missed: missedQuestions.map(q => q.cardId),
      });
      setPhase('results');
    }
  }

  function handleRetake() {
    handleStartQuiz();
  }

  function handleNewQuiz() {
    setPhase('setup');
    clearTimer();
  }

  // Circular timer SVG values
  const timerRadius = 28;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerProgress = (timeLeft / TIMER_SECONDS) * timerCircumference;

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const performanceMessage =
    percentage >= 90
      ? 'Excellent! You really know your stuff.'
      : percentage >= 70
        ? 'Good work! A few areas to review.'
        : 'Needs Review. Keep studying and try again!';

  const optionLabels = ['A', 'B', 'C', 'D'];

  // ─── SETUP PHASE ───────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <div className="px-4 py-6 space-y-8">
        <div>
          <h2 className="font-heading text-2xl font-bold text-forest dark:text-gold mb-1">
            Quiz Mode
          </h2>
          <p className="text-sm text-charcoal/60 dark:text-cream/60">
            Test your knowledge with multiple choice questions.
          </p>
        </div>

        {/* Deck selector */}
        <div className="space-y-3">
          <label className="font-heading text-sm font-semibold uppercase tracking-wider text-charcoal/70 dark:text-cream/70">
            Select Deck
          </label>
          <div className="grid grid-cols-3 gap-3">
            {DECK_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDeck(opt.value)}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all
                  ${deck === opt.value
                    ? 'border-forest dark:border-gold bg-forest/10 dark:bg-gold/10'
                    : 'border-charcoal/10 dark:border-cream/10 hover:border-forest/40 dark:hover:border-gold/40'
                  }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-sm font-semibold">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timed toggle */}
        <div className="space-y-3">
          <label className="font-heading text-sm font-semibold uppercase tracking-wider text-charcoal/70 dark:text-cream/70">
            Timer
          </label>
          <div className="flex gap-3">
            {[
              { value: false, label: 'Untimed' },
              { value: true, label: 'Timed (60s)' },
            ].map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setTimed(opt.value)}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all
                  ${timed === opt.value
                    ? 'border-forest dark:border-gold bg-forest/10 dark:bg-gold/10'
                    : 'border-charcoal/10 dark:border-cream/10 hover:border-forest/40 dark:hover:border-gold/40'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div className="space-y-3">
          <label className="font-heading text-sm font-semibold uppercase tracking-wider text-charcoal/70 dark:text-cream/70">
            Questions
          </label>
          <div className="flex gap-3">
            {COUNT_OPTIONS.map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all
                  ${questionCount === count
                    ? 'border-forest dark:border-gold bg-forest/10 dark:bg-gold/10'
                    : 'border-charcoal/10 dark:border-cream/10 hover:border-forest/40 dark:hover:border-gold/40'
                  }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStartQuiz}
          className="w-full py-4 rounded-xl bg-forest dark:bg-gold text-cream dark:text-charcoal
            font-heading font-bold text-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Start Quiz
        </button>
      </div>
    );
  }

  // ─── QUIZ PHASE ─────────────────────────────────────────────
  if (phase === 'quiz' && currentQuestion) {
    const timedOut = timed && timeLeft === 0 && answered && selectedAnswer === null;

    return (
      <div className="px-4 py-6 space-y-6">
        {/* Top bar: progress + score + timer */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50 dark:text-cream/50">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <div className="w-full bg-charcoal/10 dark:bg-cream/10 rounded-full h-1.5 mt-1">
              <div
                className="bg-forest dark:bg-gold h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Score */}
            <div className="text-right">
              <p className="text-xs text-charcoal/50 dark:text-cream/50">Score</p>
              <p className="font-heading font-bold text-forest dark:text-gold">
                {score}/{currentIndex + (answered ? 1 : 0)}
              </p>
            </div>

            {/* Timer */}
            {timed && (
              <div className="relative flex items-center justify-center">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r={timerRadius}
                    fill="none"
                    strokeWidth="4"
                    className="stroke-charcoal/10 dark:stroke-cream/10"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={timerRadius}
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={timerCircumference}
                    strokeDashoffset={timerCircumference - timerProgress}
                    className={`transition-all duration-1000 linear ${
                      timeLeft <= 10
                        ? 'stroke-red-500'
                        : timeLeft <= 20
                          ? 'stroke-yellow-500'
                          : 'stroke-forest dark:stroke-gold'
                    }`}
                  />
                </svg>
                <span
                  className={`absolute text-sm font-bold ${
                    timeLeft <= 10 ? 'text-red-500' : 'text-charcoal dark:text-cream'
                  }`}
                >
                  {timeLeft}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Question */}
        <div className="bg-white dark:bg-charcoal/50 rounded-2xl p-5 shadow-sm border border-charcoal/5 dark:border-cream/5">
          <p className="text-base leading-relaxed font-medium">{currentQuestion.question}</p>
        </div>

        {/* Timed out message */}
        {timedOut && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
            <p className="text-red-600 dark:text-red-400 font-semibold text-sm">
              Time's up! The correct answer was highlighted below.
            </p>
          </div>
        )}

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isCorrect = option === currentQuestion.correctAnswer;
            const isSelected = option === selectedAnswer;

            let optionClasses =
              'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all';

            if (!answered) {
              optionClasses +=
                ' border-charcoal/10 dark:border-cream/10 hover:border-forest/40 dark:hover:border-gold/40 active:scale-[0.98]';
            } else if (isCorrect) {
              optionClasses +=
                ' border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-400';
            } else if (isSelected && !isCorrect) {
              optionClasses +=
                ' border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-400';
            } else {
              optionClasses +=
                ' border-charcoal/5 dark:border-cream/5 opacity-50';
            }

            return (
              <button
                key={option}
                onClick={() => handleSelectAnswer(option)}
                disabled={answered}
                className={optionClasses}
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                    ${answered && isCorrect
                      ? 'bg-green-500 text-white'
                      : answered && isSelected && !isCorrect
                        ? 'bg-red-500 text-white'
                        : 'bg-charcoal/5 dark:bg-cream/5 text-charcoal/60 dark:text-cream/60'
                    }`}
                >
                  {optionLabels[idx]}
                </span>
                <span className="text-sm font-medium">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation (after answering) */}
        {answered && (
          <div className="bg-forest/5 dark:bg-gold/5 border border-forest/20 dark:border-gold/20 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-forest dark:text-gold">
              Explanation
            </p>
            <p className="text-sm leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {answered && (
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-xl bg-forest dark:bg-gold text-cream dark:text-charcoal
              font-heading font-bold text-base shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
          </button>
        )}
      </div>
    );
  }

  // ─── RESULTS PHASE ─────────────────────────────────────────
  if (phase === 'results') {
    return (
      <div className="px-4 py-6 space-y-8">
        {/* Score header */}
        <div className="text-center space-y-4">
          <h2 className="font-heading text-2xl font-bold text-forest dark:text-gold">
            Quiz Complete
          </h2>

          {/* Score circle */}
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 140 140">
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                strokeWidth="8"
                className="stroke-charcoal/10 dark:stroke-cream/10"
              />
              <circle
                cx="70"
                cy="70"
                r="60"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 60}
                strokeDashoffset={2 * Math.PI * 60 * (1 - percentage / 100)}
                className={`transition-all duration-700 ${
                  percentage >= 90
                    ? 'stroke-green-500'
                    : percentage >= 70
                      ? 'stroke-yellow-500'
                      : 'stroke-red-500'
                }`}
              />
            </svg>
            <div className="absolute text-center">
              <p className="font-heading text-3xl font-bold text-charcoal dark:text-cream">
                {percentage}%
              </p>
              <p className="text-xs text-charcoal/50 dark:text-cream/50">
                {score}/{questions.length}
              </p>
            </div>
          </div>

          {/* Performance message */}
          <p
            className={`font-heading font-semibold text-lg ${
              percentage >= 90
                ? 'text-green-600 dark:text-green-400'
                : percentage >= 70
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {performanceMessage}
          </p>
        </div>

        {/* Missed questions */}
        {missedQuestions.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-bold text-charcoal dark:text-cream">
              Missed Questions ({missedQuestions.length})
            </h3>
            <div className="space-y-3">
              {missedQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-charcoal/50 rounded-xl p-4 border border-charcoal/5 dark:border-cream/5 space-y-2"
                >
                  <p className="text-xs font-semibold text-red-500 dark:text-red-400">
                    #{idx + 1} Missed
                  </p>
                  <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md">
                      Correct: {q.correctAnswer}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal/60 dark:text-cream/60 leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleRetake}
            className="flex-1 py-4 rounded-xl border-2 border-forest dark:border-gold
              text-forest dark:text-gold font-heading font-bold text-base
              hover:bg-forest/5 dark:hover:bg-gold/5 active:scale-[0.98] transition-all"
          >
            Retake Quiz
          </button>
          <button
            onClick={handleNewQuiz}
            className="flex-1 py-4 rounded-xl bg-forest dark:bg-gold text-cream dark:text-charcoal
              font-heading font-bold text-base shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
          >
            New Quiz
          </button>
        </div>
      </div>
    );
  }

  return null;
}
