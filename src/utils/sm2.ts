import type { CardProgress, Rating } from '../types/index.ts';

export function getInitialProgress(cardId: string, deck: import('../types/index.ts').DeckType): CardProgress {
  return {
    cardId,
    deck,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: new Date().toISOString().split('T')[0],
    lastReview: null,
  };
}

export function reviewCard(progress: CardProgress, rating: Rating): CardProgress {
  const today = new Date().toISOString().split('T')[0];
  let { easeFactor, interval, repetitions } = progress;

  if (rating < 3) {
    // Failed — reset
    repetitions = 0;
    interval = rating === 0 ? 0 : 1; // Again=immediate, Hard=1 day
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Update ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  );

  // Map user ratings to intervals:
  // Again (0) = review in ~1 minute (same session, interval=0)
  // Hard (1) = 1 day
  // Good (3) = normal interval
  // Easy (5) = interval * 1.3
  let finalInterval = interval;
  if (rating === 5) {
    finalInterval = Math.max(4, Math.round(interval * 1.3));
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + finalInterval);

  return {
    ...progress,
    easeFactor,
    interval: finalInterval,
    repetitions,
    dueDate: finalInterval === 0 ? today : dueDate.toISOString().split('T')[0],
    lastReview: today,
  };
}

export function isDue(progress: CardProgress): boolean {
  const today = new Date().toISOString().split('T')[0];
  return progress.dueDate <= today;
}

export function getDueCards(allProgress: CardProgress[]): CardProgress[] {
  return allProgress.filter(isDue).sort((a, b) => {
    // Sort by: new cards first, then by due date
    if (a.repetitions === 0 && b.repetitions !== 0) return -1;
    if (a.repetitions !== 0 && b.repetitions === 0) return 1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export function getMasteryLevel(progress: CardProgress): 'new' | 'learning' | 'reviewing' | 'mastered' {
  if (progress.repetitions === 0) return 'new';
  if (progress.interval < 7) return 'learning';
  if (progress.interval < 30) return 'reviewing';
  return 'mastered';
}
