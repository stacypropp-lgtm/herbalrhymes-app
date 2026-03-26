import { useState, useMemo, useCallback } from 'react';
import herbsData from '../data/herbs.json';
import formulasData from '../data/formulas.json';
import acupointsData from '../data/acupoints.json';
import type { Herb, Formula, Acupoint, DeckType, Rating } from '../types/index.ts';
import { getCardProgress, getAllProgress, getDeckStats } from '../utils/storage.ts';
import { isDue, getInitialProgress } from '../utils/sm2.ts';
import { useProgress } from '../hooks/useProgress.ts';

/* ---------- helpers ---------- */

const herbs = herbsData as Herb[];
const formulas = formulasData as Formula[];
const acupoints = acupointsData as Acupoint[];

type CardItem =
  | { deck: 'herbs'; data: Herb }
  | { deck: 'formulas'; data: Formula }
  | { deck: 'acupoints'; data: Acupoint };

const DECK_META: Record<DeckType, { label: string; count: number; icon: string }> = {
  herbs: { label: 'Herbs', count: herbs.length, icon: '\u{1F33F}' },
  formulas: { label: 'Formulas', count: formulas.length, icon: '\u{1F9EA}' },
  acupoints: { label: 'Acupoints', count: acupoints.length, icon: '\u{1F4CD}' },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(deck: DeckType, filterCategories?: Set<string>): CardItem[] {
  const allProgress = getAllProgress();

  const items: { card: CardItem; isNew: boolean }[] = [];

  let herbsFiltered = herbs;
  let formulasFiltered = formulas;
  let acupointsFiltered = acupoints;

  if (filterCategories && filterCategories.size > 0) {
    if (deck === 'herbs') {
      herbsFiltered = herbs.filter(h => filterCategories.has(h.category));
    } else if (deck === 'acupoints') {
      acupointsFiltered = acupoints.filter(p => filterCategories.has(p.channel));
    }
  }

  const source =
    deck === 'herbs'
      ? herbsFiltered.map((h) => ({ deck: 'herbs' as const, data: h }))
      : deck === 'formulas'
        ? formulasFiltered.map((f) => ({ deck: 'formulas' as const, data: f }))
        : acupointsFiltered.map((a) => ({ deck: 'acupoints' as const, data: a }));

  for (const card of source) {
    const id = card.data.id;
    const progress = allProgress[id] ?? getInitialProgress(id, deck);
    if (isDue(progress)) {
      items.push({ card, isNew: progress.repetitions === 0 });
    }
  }

  // Limit new cards to 20 per session, keep all review cards
  const reviewCards = items.filter((i) => !i.isNew).map((i) => i.card);
  const newCards = items.filter((i) => i.isNew).map((i) => i.card);
  const limitedNew = newCards.slice(0, 20);

  return shuffle([...reviewCards, ...limitedNew]);
}

// Category helpers for Study page
function getStudyHerbCategories(): string[] {
  const cats = new Set<string>();
  herbs.forEach(h => cats.add(h.category));
  return Array.from(cats).sort();
}

function getStudyAcupointChannels(): { code: string; name: string }[] {
  const channels = new Map<string, string>();
  acupoints.forEach(p => {
    if (p.channel && p.channelName && !channels.has(p.channel)) {
      channels.set(p.channel, p.channelName);
    }
  });
  return Array.from(channels.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------- sub-components ---------- */

function MasteryBar({ stats }: { stats: ReturnType<typeof getDeckStats> }) {
  const total = stats.new + stats.learning + stats.reviewing + stats.mastered;
  if (total === 0) return null;

  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div className="w-full mt-3">
      <div className="flex h-2 rounded-full overflow-hidden bg-charcoal/10 dark:bg-white/10">
        {stats.new > 0 && (
          <div className="bg-blue-400" style={{ width: `${pct(stats.new)}%` }} />
        )}
        {stats.learning > 0 && (
          <div className="bg-orange-400" style={{ width: `${pct(stats.learning)}%` }} />
        )}
        {stats.reviewing > 0 && (
          <div className="bg-gold" style={{ width: `${pct(stats.reviewing)}%` }} />
        )}
        {stats.mastered > 0 && (
          <div className="bg-forest" style={{ width: `${pct(stats.mastered)}%` }} />
        )}
      </div>
      <div className="flex justify-between text-[10px] mt-1.5 text-charcoal/60 dark:text-cream/50">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
          New {stats.new}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
          Learning {stats.learning}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-gold" />
          Review {stats.reviewing}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-forest" />
          Mastered {stats.mastered}
        </span>
      </div>
    </div>
  );
}

function HerbBack({ herb }: { herb: Herb }) {
  const indicationLines = herb.indications
    .split(/\s*·\s*/)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="space-y-3 text-sm overflow-y-auto max-h-[55vh] pr-1">
      <h3 className="font-heading text-lg text-forest dark:text-gold font-semibold">
        {herb.pinyin}
      </h3>
      <p className="text-xs text-charcoal/60 dark:text-cream/50 italic">{herb.latin}</p>

      <div className="grid grid-cols-3 gap-2 text-center bg-charcoal/5 dark:bg-white/5 rounded-lg p-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40">
            Temp
          </p>
          <p className="font-medium text-charcoal dark:text-cream">{herb.temperature}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40">
            Taste
          </p>
          <p className="font-medium text-charcoal dark:text-cream">{herb.taste}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40">
            Channels
          </p>
          <p className="font-medium text-charcoal dark:text-cream">
            {herb.channels.join(', ')}
          </p>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40 mb-1">
          Top Indications
        </p>
        <ul className="list-disc list-inside space-y-0.5 text-charcoal dark:text-cream">
          {indicationLines.map((line, i) => (
            <li key={i}>{line.replace(/^\d+\)\s*/, '')}</li>
          ))}
        </ul>
      </div>

      {herb.contraindication && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
          <p className="text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400 mb-0.5">
            Key Contraindication
          </p>
          <p className="text-charcoal dark:text-cream text-xs">{herb.contraindication}</p>
        </div>
      )}

      {herb.boardPearl && (
        <div className="bg-gold/10 dark:bg-gold/20 rounded-lg p-2">
          <p className="text-[10px] uppercase tracking-wider text-gold mb-0.5">
            Board Pearl
          </p>
          <p className="text-charcoal dark:text-cream text-xs">{herb.boardPearl}</p>
        </div>
      )}
    </div>
  );
}

function FormulaBack({ formula }: { formula: Formula }) {
  return (
    <div className="space-y-3 text-sm overflow-y-auto max-h-[55vh] pr-1">
      <h3 className="font-heading text-lg text-forest dark:text-gold font-semibold">
        {formula.pinyin}
      </h3>
      <p className="text-xs text-charcoal/60 dark:text-cream/50 italic">
        {formula.english_name}
      </p>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40 mb-1">
          Composition
        </p>
        <div className="space-y-1">
          {formula.composition.map((c, i) => (
            <div
              key={i}
              className="flex justify-between text-xs bg-charcoal/5 dark:bg-white/5 rounded px-2 py-1"
            >
              <span className="text-charcoal dark:text-cream">{c.herb}</span>
              <span className="text-charcoal/50 dark:text-cream/50 shrink-0 ml-2">
                {c.role} &middot; {c.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40 mb-1">
          Actions
        </p>
        <ul className="list-disc list-inside space-y-0.5 text-xs text-charcoal dark:text-cream">
          {formula.actions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40 mb-1">
          Indications
        </p>
        <p className="text-xs text-charcoal dark:text-cream">{formula.indications}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-charcoal/5 dark:bg-white/5 rounded-lg p-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40">
            Tongue
          </p>
          <p className="text-xs text-charcoal dark:text-cream">{formula.tongue}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40">
            Pulse
          </p>
          <p className="text-xs text-charcoal dark:text-cream">{formula.pulse}</p>
        </div>
      </div>

      {formula.mnemonic && (
        <div className="bg-forest/10 dark:bg-forest/20 rounded-lg p-2">
          <p className="text-[10px] uppercase tracking-wider text-forest dark:text-green-400 mb-0.5">
            Mnemonic
          </p>
          <p className="text-xs text-charcoal dark:text-cream italic">{formula.mnemonic}</p>
        </div>
      )}

      {formula.board_pearl && (
        <div className="bg-gold/10 dark:bg-gold/20 rounded-lg p-2">
          <p className="text-[10px] uppercase tracking-wider text-gold mb-0.5">
            Board Pearl
          </p>
          <p className="text-xs text-charcoal dark:text-cream">{formula.board_pearl}</p>
        </div>
      )}
    </div>
  );
}

function AcupointBack({ point }: { point: Acupoint }) {
  return (
    <div className="space-y-3 text-sm overflow-y-auto max-h-[55vh] pr-1">
      <h3 className="font-heading text-lg text-forest dark:text-gold font-semibold">
        {point.number} &mdash; {point.name}
      </h3>
      <p className="text-xs text-charcoal/60 dark:text-cream/50 italic">
        {point.english} &middot; {point.channelName}
      </p>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40 mb-1">
          Location
        </p>
        <p className="text-xs text-charcoal dark:text-cream">{point.location}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-charcoal/5 dark:bg-white/5 rounded-lg p-2">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40">
            Depth
          </p>
          <p className="text-xs text-charcoal dark:text-cream">{point.depth}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40">
            Categories
          </p>
          <p className="text-xs text-charcoal dark:text-cream">
            {point.categories.length > 0 ? point.categories.join(', ') : 'None'}
          </p>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40 mb-1">
          Indications
        </p>
        <ul className="list-disc list-inside space-y-0.5 text-xs text-charcoal dark:text-cream">
          {point.indications.slice(0, 6).map((ind, i) => (
            <li key={i}>{ind}</li>
          ))}
        </ul>
      </div>

      {point.boardPearl && (
        <div className="bg-gold/10 dark:bg-gold/20 rounded-lg p-2">
          <p className="text-[10px] uppercase tracking-wider text-gold mb-0.5">
            Board Pearl
          </p>
          <p className="text-xs text-charcoal dark:text-cream">{point.boardPearl}</p>
        </div>
      )}

      {point.memoryTrick && (
        <div className="bg-forest/10 dark:bg-forest/20 rounded-lg p-2">
          <p className="text-[10px] uppercase tracking-wider text-forest dark:text-green-400 mb-0.5">
            Memory Trick
          </p>
          <p className="text-xs text-charcoal dark:text-cream italic">{point.memoryTrick}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- main component ---------- */

export default function StudyPage() {
  const [activeDeck, setActiveDeck] = useState<DeckType | null>(null);
  const [queue, setQueue] = useState<CardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [studyCategories, setStudyCategories] = useState<Set<string>>(new Set());
  const [showStudyCategoryPicker, setShowStudyCategoryPicker] = useState<DeckType | null>(null);
  const { review, refresh } = useProgress();

  /* Deck stats — recomputed on every render for reactivity */
  const deckStats = useMemo(
    () => ({
      herbs: getDeckStats('herbs', herbs.length),
      formulas: getDeckStats('formulas', formulas.length),
      acupoints: getDeckStats('acupoints', acupoints.length),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDeck], // recalculate when returning to deck selection
  );

  const startDeck = useCallback(
    (deck: DeckType, filterCats?: Set<string>) => {
      const q = buildQueue(deck, filterCats);
      setQueue(q);
      setCurrentIndex(0);
      setFlipped(false);
      setSessionComplete(false);
      setActiveDeck(deck);
    },
    [],
  );

  const handleRate = useCallback(
    (rating: Rating) => {
      const card = queue[currentIndex];
      if (!card) return;

      review(card.data.id, card.deck, rating);

      // If Again (0), put card back later in the queue
      if (rating === 0) {
        setQueue((prev) => {
          const updated = [...prev];
          const reinsertPos = Math.min(
            currentIndex + 3 + Math.floor(Math.random() * 3),
            updated.length,
          );
          const [removed] = updated.splice(currentIndex, 1);
          updated.splice(reinsertPos, 0, removed);
          return updated;
        });
        setFlipped(false);
        return;
      }

      // Move to next card
      const nextIdx = currentIndex + 1;
      if (nextIdx >= queue.length) {
        setSessionComplete(true);
      } else {
        setCurrentIndex(nextIdx);
        setFlipped(false);
      }
    },
    [queue, currentIndex, review],
  );

  const handleDone = useCallback(() => {
    setActiveDeck(null);
    setQueue([]);
    setCurrentIndex(0);
    setFlipped(false);
    setSessionComplete(false);
    refresh();
  }, [refresh]);

  /* ========== Deck Selection View ========== */
  if (!activeDeck) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal px-4 py-6 pb-24">
        <h1 className="font-heading text-2xl font-bold text-forest dark:text-gold text-center mb-6">
          Study Decks
        </h1>

        <div className="space-y-4 max-w-md mx-auto">
          {(Object.keys(DECK_META) as DeckType[]).map((deck) => {
            const meta = DECK_META[deck];
            const stats = deckStats[deck];

            return (
              <div
                key={deck}
                className="bg-white dark:bg-charcoal/80 border border-charcoal/10 dark:border-white/10 rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-charcoal dark:text-cream flex items-center gap-2">
                      <span className="text-xl">{meta.icon}</span>
                      {meta.label}
                    </h2>
                    <p className="text-sm text-charcoal/60 dark:text-cream/50 mt-0.5">
                      {meta.count} cards
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-forest dark:text-gold">
                      {stats.dueToday}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/40">
                      due today
                    </p>
                  </div>
                </div>

                <MasteryBar stats={stats} />

                {/* Category filter toggle */}
                {(deck === 'herbs' || deck === 'acupoints') && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        if (showStudyCategoryPicker === deck) {
                          setShowStudyCategoryPicker(null);
                        } else {
                          setShowStudyCategoryPicker(deck);
                          setStudyCategories(new Set());
                        }
                      }}
                      className="text-xs font-semibold text-forest dark:text-gold"
                    >
                      {showStudyCategoryPicker === deck ? 'Hide filter' : deck === 'acupoints' ? '📌 Study by channel' : '📂 Study by category'}
                    </button>

                    {showStudyCategoryPicker === deck && (
                      <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-charcoal/10 dark:border-cream/10 divide-y divide-charcoal/5 dark:divide-cream/5">
                        {deck === 'herbs' && getStudyHerbCategories().map(cat => {
                          const selected = studyCategories.has(cat);
                          return (
                            <button
                              key={cat}
                              onClick={() => {
                                const next = new Set(studyCategories);
                                if (selected) next.delete(cat); else next.add(cat);
                                setStudyCategories(next);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors
                                ${selected ? 'bg-forest/10 dark:bg-gold/10' : 'hover:bg-charcoal/5 dark:hover:bg-cream/5'}`}
                            >
                              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] flex-shrink-0
                                ${selected ? 'border-forest dark:border-gold bg-forest dark:bg-gold text-white dark:text-charcoal' : 'border-charcoal/20 dark:border-cream/20'}`}>
                                {selected && '✓'}
                              </span>
                              <span className="leading-snug">{cat}</span>
                            </button>
                          );
                        })}
                        {deck === 'acupoints' && getStudyAcupointChannels().map(({ code, name }) => {
                          const selected = studyCategories.has(code);
                          return (
                            <button
                              key={code}
                              onClick={() => {
                                const next = new Set(studyCategories);
                                if (selected) next.delete(code); else next.add(code);
                                setStudyCategories(next);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors
                                ${selected ? 'bg-forest/10 dark:bg-gold/10' : 'hover:bg-charcoal/5 dark:hover:bg-cream/5'}`}
                            >
                              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] flex-shrink-0
                                ${selected ? 'border-forest dark:border-gold bg-forest dark:bg-gold text-white dark:text-charcoal' : 'border-charcoal/20 dark:border-cream/20'}`}>
                                {selected && '✓'}
                              </span>
                              <span className="font-medium">{code}</span>
                              <span className="text-charcoal/40 dark:text-cream/40">— {name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => startDeck(deck, studyCategories.size > 0 && showStudyCategoryPicker === deck ? studyCategories : undefined)}
                  disabled={stats.dueToday === 0}
                  className="mt-4 w-full py-2.5 rounded-xl font-heading font-semibold text-sm
                    bg-forest text-cream hover:bg-forest/90 active:scale-[0.98]
                    disabled:bg-charcoal/20 disabled:text-charcoal/40 disabled:cursor-not-allowed
                    dark:disabled:bg-white/10 dark:disabled:text-white/30
                    transition-all duration-150"
                >
                  {stats.dueToday === 0 ? 'All Caught Up!' : studyCategories.size > 0 && showStudyCategoryPicker === deck ? `Study ${studyCategories.size} Selected` : 'Start Review'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ========== Session Complete View ========== */
  if (sessionComplete) {
    const reviewed = currentIndex + 1;
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal flex flex-col items-center justify-center px-6 pb-24">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">&#x1F389;</div>
          <h2 className="font-heading text-2xl font-bold text-forest dark:text-gold mb-2">
            Session Complete!
          </h2>
          <p className="text-charcoal/70 dark:text-cream/60 mb-6">
            You reviewed <span className="font-semibold text-forest dark:text-gold">{reviewed}</span>{' '}
            card{reviewed !== 1 ? 's' : ''} in this session.
          </p>
          <button
            onClick={handleDone}
            className="w-full py-3 rounded-xl font-heading font-semibold
              bg-forest text-cream hover:bg-forest/90 active:scale-[0.98]
              transition-all duration-150"
          >
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  /* ========== Study Session View ========== */
  const card = queue[currentIndex];
  if (!card) {
    return (
      <div className="min-h-screen bg-cream dark:bg-charcoal flex items-center justify-center pb-24">
        <div className="text-center">
          <p className="text-charcoal/60 dark:text-cream/50 mb-4">No cards to review.</p>
          <button
            onClick={handleDone}
            className="px-6 py-2 rounded-xl font-heading font-semibold bg-forest text-cream
              hover:bg-forest/90 active:scale-[0.98] transition-all duration-150"
          >
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  const progressPct = Math.round((currentIndex / queue.length) * 100);

  /* Card front content */
  let frontContent: React.ReactNode;
  let backContent: React.ReactNode;

  if (card.deck === 'herbs') {
    const herb = card.data;
    frontContent = (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <p className="text-xs uppercase tracking-widest text-charcoal/40 dark:text-cream/30 mb-3">
          {herb.categoryAbbrev}
        </p>
        <h2 className="font-heading text-3xl font-bold text-charcoal dark:text-cream mb-2">
          {herb.pinyin}
        </h2>
        <p className="text-sm text-charcoal/50 dark:text-cream/40">{herb.category}</p>
        <p className="text-xs text-charcoal/30 dark:text-cream/20 mt-6">Tap to flip</p>
      </div>
    );
    backContent = <HerbBack herb={herb} />;
  } else if (card.deck === 'formulas') {
    const formula = card.data;
    frontContent = (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <p className="text-xs uppercase tracking-widest text-charcoal/40 dark:text-cream/30 mb-3">
          {formula.category}
        </p>
        <h2 className="font-heading text-3xl font-bold text-charcoal dark:text-cream mb-2">
          {formula.pinyin}
        </h2>
        <p className="text-sm text-charcoal/50 dark:text-cream/40">{formula.english_name}</p>
        <p className="text-xs text-charcoal/30 dark:text-cream/20 mt-6">Tap to flip</p>
      </div>
    );
    backContent = <FormulaBack formula={formula} />;
  } else {
    const point = card.data;
    frontContent = (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <p className="text-xs uppercase tracking-widest text-charcoal/40 dark:text-cream/30 mb-3">
          {point.channelName}
        </p>
        <h2 className="font-heading text-3xl font-bold text-charcoal dark:text-cream mb-1">
          {point.number}
        </h2>
        <p className="font-heading text-xl text-forest dark:text-gold">{point.name}</p>
        <p className="text-sm text-charcoal/50 dark:text-cream/40 mt-1">{point.english}</p>
        <p className="text-xs text-charcoal/30 dark:text-cream/20 mt-6">Tap to flip</p>
      </div>
    );
    backContent = <AcupointBack point={point} />;
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal flex flex-col pb-24">
      {/* Header with progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handleDone}
            className="text-sm font-heading font-semibold text-charcoal/60 dark:text-cream/50
              hover:text-charcoal dark:hover:text-cream transition-colors"
          >
            &larr; Done
          </button>
          <span className="text-sm text-charcoal/60 dark:text-cream/50 font-medium">
            {currentIndex + 1} of {queue.length}
          </span>
          <span className="text-xs text-charcoal/40 dark:text-cream/30 font-heading uppercase">
            {DECK_META[activeDeck].label}
          </span>
        </div>
        <div className="h-1.5 bg-charcoal/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-forest dark:bg-gold rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex-1 flex items-center justify-center px-4 py-4">
        <div
          className={`card-flip w-full max-w-md cursor-pointer ${flipped ? 'flipped' : ''}`}
          style={{ perspective: '1200px', minHeight: '360px' }}
          onClick={() => setFlipped((f) => !f)}
        >
          <div
            className="card-flip-inner relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: '360px',
            }}
          >
            {/* Front */}
            <div
              className="card-front absolute inset-0 rounded-2xl shadow-lg border border-charcoal/10 dark:border-white/10
                bg-white dark:bg-charcoal/80 p-6"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {frontContent}
            </div>

            {/* Back */}
            <div
              className="card-back absolute inset-0 rounded-2xl shadow-lg border border-charcoal/10 dark:border-white/10
                bg-white dark:bg-charcoal/80 p-5"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              {backContent}
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons — only visible when flipped */}
      <div
        className={`px-4 pb-4 transition-all duration-300 ${
          flipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRate(0 as Rating);
            }}
            className="py-3 rounded-xl font-heading font-semibold text-sm text-white
              bg-red-500 hover:bg-red-600 active:scale-95 transition-all duration-150"
          >
            Again
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRate(1 as Rating);
            }}
            className="py-3 rounded-xl font-heading font-semibold text-sm text-white
              bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all duration-150"
          >
            Hard
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRate(3 as Rating);
            }}
            className="py-3 rounded-xl font-heading font-semibold text-sm text-white
              bg-green-600 hover:bg-green-700 active:scale-95 transition-all duration-150"
          >
            Good
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRate(5 as Rating);
            }}
            className="py-3 rounded-xl font-heading font-semibold text-sm text-white
              bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all duration-150"
          >
            Easy
          </button>
        </div>
      </div>
    </div>
  );
}
