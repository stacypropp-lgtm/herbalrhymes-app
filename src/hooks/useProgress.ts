import { useState, useCallback } from 'react';
import type { CardProgress, DeckType, Rating } from '../types/index.ts';
import { reviewCard } from '../utils/sm2.ts';
import { getCardProgress, saveCardProgress, recordReview, getAllProgress } from '../utils/storage.ts';

export function useProgress() {
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  const review = useCallback((cardId: string, deck: DeckType, rating: Rating) => {
    const current = getCardProgress(cardId, deck);
    const updated = reviewCard(current, rating);
    saveCardProgress(updated);
    recordReview();
    refresh();
    return updated;
  }, [refresh]);

  const getProgress = useCallback((cardId: string, deck: DeckType): CardProgress => {
    return getCardProgress(cardId, deck);
  }, []);

  const allProgress = useCallback((): Record<string, CardProgress> => {
    return getAllProgress();
  }, []);

  return { review, getProgress, allProgress, refresh };
}
