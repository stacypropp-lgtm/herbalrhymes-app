import type { CardProgress, DeckType, StudyStats, QuizResult } from '../types/index.ts';
import { getInitialProgress } from './sm2.ts';

const STORAGE_KEYS = {
  progress: 'hr-progress',
  stats: 'hr-stats',
  quizHistory: 'hr-quiz-history',
  darkMode: 'hr-dark-mode',
  accessCode: 'hr-access-code',
} as const;

function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Progress
export function getAllProgress(): Record<string, CardProgress> {
  return getJSON(STORAGE_KEYS.progress, {});
}

export function getCardProgress(cardId: string, deck: DeckType): CardProgress {
  const all = getAllProgress();
  return all[cardId] || getInitialProgress(cardId, deck);
}

export function saveCardProgress(progress: CardProgress): void {
  const all = getAllProgress();
  all[progress.cardId] = progress;
  setJSON(STORAGE_KEYS.progress, all);
}

// Stats
export function getStats(): StudyStats {
  const stats = getJSON<StudyStats>(STORAGE_KEYS.stats, {
    totalReviewed: 0,
    cardsStudiedToday: 0,
    streak: 0,
    lastStudyDate: null,
    dailyHistory: {},
  });

  // Reset daily count if it's a new day
  const today = new Date().toISOString().split('T')[0];
  if (stats.lastStudyDate !== today) {
    stats.cardsStudiedToday = 0;
  }

  return stats;
}

export function recordReview(): void {
  const stats = getStats();
  const today = new Date().toISOString().split('T')[0];

  if (stats.lastStudyDate !== today) {
    // Check if yesterday was studied for streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (stats.lastStudyDate === yesterdayStr) {
      stats.streak += 1;
    } else if (stats.lastStudyDate !== today) {
      stats.streak = 1;
    }
  }

  stats.totalReviewed += 1;
  stats.cardsStudiedToday += 1;
  stats.lastStudyDate = today;
  stats.dailyHistory[today] = (stats.dailyHistory[today] || 0) + 1;

  setJSON(STORAGE_KEYS.stats, stats);
}

// Quiz
export function getQuizHistory(): QuizResult[] {
  return getJSON(STORAGE_KEYS.quizHistory, []);
}

export function saveQuizResult(result: QuizResult): void {
  const history = getQuizHistory();
  history.push(result);
  // Keep last 100 results
  if (history.length > 100) history.splice(0, history.length - 100);
  setJSON(STORAGE_KEYS.quizHistory, history);
}

// Dark mode
export function getDarkMode(): boolean {
  return getJSON(STORAGE_KEYS.darkMode, false);
}

export function setDarkMode(dark: boolean): void {
  setJSON(STORAGE_KEYS.darkMode, dark);
}

// Deck progress stats
export function getDeckStats(deck: DeckType, totalCards: number): {
  new: number;
  learning: number;
  reviewing: number;
  mastered: number;
  dueToday: number;
} {
  const all = getAllProgress();
  const today = new Date().toISOString().split('T')[0];
  let newCount = 0, learning = 0, reviewing = 0, mastered = 0, dueToday = 0;

  const deckCards = Object.values(all).filter(p => p.deck === deck);
  const seen = deckCards.length;
  newCount = totalCards - seen;

  for (const p of deckCards) {
    if (p.interval < 1) learning++;
    else if (p.interval < 7) learning++;
    else if (p.interval < 30) reviewing++;
    else mastered++;
    if (p.dueDate <= today) dueToday++;
  }

  // Also count unseen cards as due
  dueToday += newCount;

  return { new: newCount, learning, reviewing, mastered, dueToday };
}
