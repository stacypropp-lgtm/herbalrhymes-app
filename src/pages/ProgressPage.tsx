import { useState, useEffect, useMemo } from 'react';
import { getStats, getAllProgress, getDeckStats, getQuizHistory } from '../utils/storage.ts';
import { getMasteryLevel } from '../utils/sm2.ts';
import type { CardProgress, DeckType } from '../types/index.ts';
import herbsData from '../data/herbs.json';
import formulasData from '../data/formulas.json';
import acupointsData from '../data/acupoints.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DECK_CONFIG: { deck: DeckType; label: string; total: number; data: { id: string; pinyin?: string; name?: string }[] }[] = [
  { deck: 'herbs', label: 'Herbs', total: herbsData.length, data: herbsData as any },
  { deck: 'formulas', label: 'Formulas', total: formulasData.length, data: formulasData as any },
  { deck: 'acupoints', label: 'Acupoints', total: acupointsData.length, data: acupointsData as any },
];

function getCardName(cardId: string, deck: DeckType): string {
  const cfg = DECK_CONFIG.find(d => d.deck === deck);
  if (!cfg) return cardId;
  const card = cfg.data.find((c: any) => c.id === cardId);
  if (!card) return cardId;
  return (card as any).pinyin ?? (card as any).name ?? cardId;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getLast14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

// ---------------------------------------------------------------------------
// Circular Progress Ring
// ---------------------------------------------------------------------------

function ProgressRing({ percent, size = 80, stroke = 6 }: { percent: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-gray-200 dark:text-gray-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-forest dark:text-green-400 transition-all duration-700"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status Bar (new / learning / reviewing / mastered)
// ---------------------------------------------------------------------------

function StatusBar({ stats, total }: { stats: { new: number; learning: number; reviewing: number; mastered: number }; total: number }) {
  if (total === 0) return null;
  const segments = [
    { count: stats.mastered, color: 'bg-green-500' },
    { count: stats.reviewing, color: 'bg-blue-500' },
    { count: stats.learning, color: 'bg-orange-400' },
    { count: stats.new, color: 'bg-gray-300 dark:bg-gray-600' },
  ];

  return (
    <div className="w-full h-2.5 rounded-full flex overflow-hidden mt-2">
      {segments.map((seg, i) => {
        const pct = (seg.count / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={i}
            className={`${seg.color} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Today's Summary
// ---------------------------------------------------------------------------

function TodaySummary({ stats }: { stats: ReturnType<typeof getStats> }) {
  return (
    <section className="bg-white dark:bg-charcoal-light rounded-2xl shadow-sm p-5">
      <h2 className="font-heading text-lg font-bold text-charcoal dark:text-cream mb-4">Today's Summary</h2>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-3xl font-bold text-forest dark:text-green-400">{stats.cardsStudiedToday}</p>
          <p className="text-xs text-charcoal/60 dark:text-cream/60 mt-1">Reviewed Today</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gold">
            <span className="mr-1">🔥</span>{stats.streak}
          </p>
          <p className="text-xs text-charcoal/60 dark:text-cream/60 mt-1">Day Streak</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-charcoal dark:text-cream">{stats.totalReviewed}</p>
          <p className="text-xs text-charcoal/60 dark:text-cream/60 mt-1">All Time</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Deck Progress Cards
// ---------------------------------------------------------------------------

function DeckProgressCard({ deck, label, total }: { deck: DeckType; label: string; total: number }) {
  const deckStats = getDeckStats(deck, total);
  const masteryPct = total > 0 ? Math.round((deckStats.mastered / total) * 100) : 0;

  return (
    <div className="bg-white dark:bg-charcoal-light rounded-2xl shadow-sm p-4 flex flex-col items-center">
      <h3 className="font-heading text-sm font-bold text-charcoal dark:text-cream mb-3">{label}</h3>
      <div className="relative">
        <ProgressRing percent={masteryPct} />
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-forest dark:text-green-400 rotate-0">
          {masteryPct}%
        </span>
      </div>
      <StatusBar stats={deckStats} total={total} />
      <div className="flex justify-between w-full mt-3 text-[10px] text-charcoal/50 dark:text-cream/50">
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" />Mastered</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" />Reviewing</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-orange-400" />Learning</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />New</span>
      </div>
      <p className="mt-3 text-xs text-gold font-semibold">{deckStats.dueToday} due today</p>
    </div>
  );
}

function DeckProgressSection() {
  return (
    <section>
      <h2 className="font-heading text-lg font-bold text-charcoal dark:text-cream mb-3">Deck Progress</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DECK_CONFIG.map(cfg => (
          <DeckProgressCard key={cfg.deck} deck={cfg.deck} label={cfg.label} total={cfg.total} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Progress Over Time (SVG bar chart — last 14 days)
// ---------------------------------------------------------------------------

function ProgressChart({ dailyHistory }: { dailyHistory: Record<string, number> }) {
  const days = getLast14Days();
  const counts = days.map(d => dailyHistory[d] || 0);
  const maxCount = Math.max(...counts, 1);

  const chartW = 100; // viewBox %
  const chartH = 60;
  const barGap = 1;
  const barW = (chartW - barGap * (days.length - 1)) / days.length;

  return (
    <section className="bg-white dark:bg-charcoal-light rounded-2xl shadow-sm p-5">
      <h2 className="font-heading text-lg font-bold text-charcoal dark:text-cream mb-4">Progress Over Time</h2>
      <svg viewBox={`0 0 ${chartW} ${chartH + 14}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Y-axis guide lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const y = chartH - frac * chartH;
          return (
            <g key={frac}>
              <line x1={0} y1={y} x2={chartW} y2={y} stroke="currentColor" strokeWidth={0.15} className="text-gray-200 dark:text-gray-700" />
              {frac > 0 && (
                <text x={-0.5} y={y + 1} fontSize={2.5} fill="currentColor" textAnchor="end" className="text-charcoal/40 dark:text-cream/40">
                  {Math.round(maxCount * frac)}
                </text>
              )}
            </g>
          );
        })}

        {/* Bars */}
        {counts.map((count, i) => {
          const barH = (count / maxCount) * chartH;
          const x = i * (barW + barGap);
          const y = chartH - barH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 0.3)}
                rx={0.6}
                className="fill-forest dark:fill-green-500"
                opacity={count === 0 ? 0.15 : 1}
              />
              {/* X-axis label */}
              <text
                x={x + barW / 2}
                y={chartH + 5}
                fontSize={2}
                fill="currentColor"
                textAnchor="middle"
                className="text-charcoal/40 dark:text-cream/40"
              >
                {formatDate(days[i]).replace(' ', '\n')}
              </text>
            </g>
          );
        })}
      </svg>
      {maxCount <= 1 && counts.every(c => c === 0) && (
        <p className="text-center text-sm text-charcoal/40 dark:text-cream/40 mt-2">No study data yet — start reviewing cards!</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Weak Areas
// ---------------------------------------------------------------------------

function WeakAreas({ allProgress }: { allProgress: Record<string, CardProgress> }) {
  const weakCards = useMemo(() => {
    const cards = Object.values(allProgress).filter(
      p => p.easeFactor < 2.0 || (p.interval < 3 && p.repetitions > 0)
    );
    // Group by deck
    const grouped: Record<DeckType, CardProgress[]> = { herbs: [], formulas: [], acupoints: [] };
    for (const c of cards) {
      grouped[c.deck].push(c);
    }
    return grouped;
  }, [allProgress]);

  const hasWeak = Object.values(weakCards).some(arr => arr.length > 0);

  if (!hasWeak) {
    return (
      <section className="bg-white dark:bg-charcoal-light rounded-2xl shadow-sm p-5">
        <h2 className="font-heading text-lg font-bold text-charcoal dark:text-cream mb-2">Weak Areas</h2>
        <p className="text-sm text-charcoal/50 dark:text-cream/50">No weak areas detected — keep it up!</p>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-charcoal-light rounded-2xl shadow-sm p-5">
      <h2 className="font-heading text-lg font-bold text-charcoal dark:text-cream mb-1">Weak Areas</h2>
      <p className="text-xs text-gold mb-4">These cards need more review</p>
      {(Object.entries(weakCards) as [DeckType, CardProgress[]][]).map(([deck, cards]) => {
        if (cards.length === 0) return null;
        const label = DECK_CONFIG.find(d => d.deck === deck)!.label;
        return (
          <div key={deck} className="mb-3 last:mb-0">
            <h3 className="text-sm font-semibold text-forest dark:text-green-400 mb-1">{label}</h3>
            <div className="flex flex-wrap gap-1.5">
              {cards.map(c => (
                <span
                  key={c.cardId}
                  className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                >
                  {getCardName(c.cardId, deck)}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Quiz History
// ---------------------------------------------------------------------------

function QuizHistorySection() {
  const history = getQuizHistory().slice(-10).reverse();

  if (history.length === 0) {
    return (
      <section className="bg-white dark:bg-charcoal-light rounded-2xl shadow-sm p-5">
        <h2 className="font-heading text-lg font-bold text-charcoal dark:text-cream mb-2">Quiz History</h2>
        <p className="text-sm text-charcoal/50 dark:text-cream/50">No quizzes taken yet — test your knowledge!</p>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-charcoal-light rounded-2xl shadow-sm p-5">
      <h2 className="font-heading text-lg font-bold text-charcoal dark:text-cream mb-4">Quiz History</h2>
      <div className="space-y-2">
        {history.map((q, i) => {
          const pct = q.total > 0 ? Math.round((q.score / q.total) * 100) : 0;
          const colorClass =
            pct >= 80
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
              : pct >= 60
              ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
              : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
          const deckLabel = DECK_CONFIG.find(d => d.deck === q.deck)?.label ?? q.deck;

          return (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl px-3 py-2 bg-cream/50 dark:bg-charcoal/30"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-charcoal dark:text-cream">{deckLabel}</span>
                <span className="text-[10px] text-charcoal/50 dark:text-cream/50">{formatDate(q.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-charcoal/60 dark:text-cream/60">
                  {q.score}/{q.total}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorClass}`}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProgressPage() {
  const [stats, setStats] = useState(() => getStats());
  const [allProgress, setAllProgress] = useState(() => getAllProgress());

  // Refresh when page gains focus (e.g., returning from a study session)
  useEffect(() => {
    const refresh = () => {
      setStats(getStats());
      setAllProgress(getAllProgress());
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  return (
    <div className="px-4 py-5 space-y-5">
      <TodaySummary stats={stats} />
      <DeckProgressSection />
      <ProgressChart dailyHistory={stats.dailyHistory} />
      <WeakAreas allProgress={allProgress} />
      <QuizHistorySection />
    </div>
  );
}
