export interface Herb {
  id: string;
  pinyin: string;
  latin: string;
  category: string;
  categoryAbbrev: string;
  temperature: string;
  taste: string;
  channels: string[];
  indications: string;
  contraindication: string;
  boardPearl: string;
}

export interface FormulaComposition {
  herb: string;
  role: string;
  amount: string;
}

export interface FormulaModification {
  modification: string;
  for: string;
}

export interface Formula {
  id: string;
  pinyin: string;
  english_name: string;
  category: string;
  composition: FormulaComposition[];
  actions: string[];
  indications: string;
  tongue: string;
  pulse: string;
  mnemonic: string;
  board_pearl: string;
  formula_math: string;
  key_modifications: FormulaModification[];
  comparison_formulas: string[];
  clinical_pearls: string[];
  contraindications: string[];
}

export interface Acupoint {
  id: string;
  name: string;
  number: string;
  english: string;
  channel: string;
  channelName: string;
  element: string | null;
  yinYang: string | null;
  location: string;
  depth: string;
  categories: string[];
  indications: string[];
  boardPearl: string;
  memoryTrick: string;
  cautions: string | null;
  fiveShu: string | null;
  specialCategories: string[];
}

export type DeckType = 'herbs' | 'formulas' | 'acupoints';

export interface CardProgress {
  cardId: string;
  deck: DeckType;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastReview: string | null;
}

export interface StudyStats {
  totalReviewed: number;
  cardsStudiedToday: number;
  streak: number;
  lastStudyDate: string | null;
  dailyHistory: Record<string, number>;
}

export interface QuizResult {
  deck: DeckType;
  score: number;
  total: number;
  date: string;
  missed: string[];
}

export type Rating = 0 | 1 | 2 | 3 | 4 | 5;
