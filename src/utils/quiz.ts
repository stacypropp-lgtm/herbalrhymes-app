import type { Herb, Formula, Acupoint, DeckType } from '../types/index.ts';

export interface QuizQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
  cardId: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count);
}

function generateHerbQuestions(herbs: Herb[], count: number): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const pool = shuffle(herbs);

  for (const herb of pool.slice(0, count)) {
    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
      // Identify by indication
      const distractors = pickRandom(
        herbs.filter(h => h.id !== herb.id),
        3
      ).map(h => h.pinyin);
      questions.push({
        id: `quiz-${herb.id}-ind`,
        question: `Which herb has the following indication: "${herb.indications.split('·')[0].replace(/^\d+\)\s*/, '').trim()}"?`,
        correctAnswer: herb.pinyin,
        options: shuffle([herb.pinyin, ...distractors]),
        explanation: `${herb.pinyin} — ${herb.boardPearl}`,
        cardId: herb.id,
      });
    } else if (type === 1) {
      // Identify by channel/temperature
      const distractors = pickRandom(
        herbs.filter(h => h.id !== herb.id && h.temperature !== herb.temperature),
        3
      ).map(h => h.pinyin);
      questions.push({
        id: `quiz-${herb.id}-temp`,
        question: `Which herb is ${herb.temperature} in temperature and enters the ${herb.channels.join(', ')} channel(s)?`,
        correctAnswer: herb.pinyin,
        options: shuffle([herb.pinyin, ...distractors]),
        explanation: `${herb.pinyin} (${herb.latin}) — ${herb.temperature}, ${herb.channels.join(', ')}`,
        cardId: herb.id,
      });
    } else {
      // Board pearl question
      const distractors = pickRandom(
        herbs.filter(h => h.id !== herb.id),
        3
      ).map(h => h.pinyin);
      const pearl = herb.boardPearl.length > 80
        ? herb.boardPearl.substring(0, 80) + '...'
        : herb.boardPearl;
      questions.push({
        id: `quiz-${herb.id}-pearl`,
        question: `Which herb matches this board pearl: "${pearl}"?`,
        correctAnswer: herb.pinyin,
        options: shuffle([herb.pinyin, ...distractors]),
        explanation: `${herb.pinyin} — ${herb.boardPearl}`,
        cardId: herb.id,
      });
    }
  }

  return questions;
}

function generateFormulaQuestions(formulas: Formula[], count: number): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const pool = shuffle(formulas);

  for (const formula of pool.slice(0, count)) {
    const type = Math.floor(Math.random() * 3);

    if (type === 0) {
      // Identify by composition
      const junHerb = formula.composition.find(c => c.role === 'Jun');
      if (!junHerb) continue;
      const distractors = pickRandom(
        formulas.filter(f => f.id !== formula.id),
        3
      ).map(f => f.pinyin);
      questions.push({
        id: `quiz-${formula.id}-comp`,
        question: `Which formula has ${junHerb.herb} as its Jun (Chief) herb?`,
        correctAnswer: formula.pinyin,
        options: shuffle([formula.pinyin, ...distractors]),
        explanation: `${formula.pinyin} (${formula.english_name}) — Jun: ${junHerb.herb}`,
        cardId: formula.id,
      });
    } else if (type === 1) {
      // Identify by indication
      const distractors = pickRandom(
        formulas.filter(f => f.id !== formula.id),
        3
      ).map(f => f.pinyin);
      const indication = formula.indications.length > 100
        ? formula.indications.substring(0, 100) + '...'
        : formula.indications;
      questions.push({
        id: `quiz-${formula.id}-ind`,
        question: `Which formula treats: "${indication}"?`,
        correctAnswer: formula.pinyin,
        options: shuffle([formula.pinyin, ...distractors]),
        explanation: `${formula.pinyin} — ${formula.board_pearl}`,
        cardId: formula.id,
      });
    } else {
      // Tongue/Pulse
      const distractors = pickRandom(
        formulas.filter(f => f.id !== formula.id),
        3
      ).map(f => f.pinyin);
      questions.push({
        id: `quiz-${formula.id}-tp`,
        question: `Which formula presents with Tongue: "${formula.tongue}" and Pulse: "${formula.pulse}"?`,
        correctAnswer: formula.pinyin,
        options: shuffle([formula.pinyin, ...distractors]),
        explanation: `${formula.pinyin} — ${formula.board_pearl}`,
        cardId: formula.id,
      });
    }
  }

  return questions;
}

function generateAcupointQuestions(points: Acupoint[], count: number): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const pool = shuffle(points.filter(p => p.boardPearl && p.boardPearl.length > 5));

  for (const point of pool.slice(0, count)) {
    const type = Math.floor(Math.random() * 3);

    if (type === 0 && point.categories.length > 0) {
      // Identify by category
      const cat = point.categories[0];
      const distractors = pickRandom(
        points.filter(p => p.id !== point.id),
        3
      ).map(p => p.number);
      questions.push({
        id: `quiz-${point.id}-cat`,
        question: `Which point is the ${cat}?`,
        correctAnswer: point.number,
        options: shuffle([point.number, ...distractors]),
        explanation: `${point.number} (${point.name}) — ${point.boardPearl}`,
        cardId: point.id,
      });
    } else if (type === 1) {
      // Location based
      const distractors = pickRandom(
        points.filter(p => p.id !== point.id && p.channel !== point.channel),
        3
      ).map(p => p.number);
      const loc = point.location.length > 80
        ? point.location.substring(0, 80) + '...'
        : point.location;
      questions.push({
        id: `quiz-${point.id}-loc`,
        question: `Which point is located: "${loc}"?`,
        correctAnswer: point.number,
        options: shuffle([point.number, ...distractors]),
        explanation: `${point.number} (${point.name}) — ${point.english}`,
        cardId: point.id,
      });
    } else {
      // Board pearl
      const distractors = pickRandom(
        points.filter(p => p.id !== point.id),
        3
      ).map(p => p.number);
      const pearl = point.boardPearl.length > 80
        ? point.boardPearl.substring(0, 80) + '...'
        : point.boardPearl;
      questions.push({
        id: `quiz-${point.id}-pearl`,
        question: `Which point matches: "${pearl}"?`,
        correctAnswer: point.number,
        options: shuffle([point.number, ...distractors]),
        explanation: `${point.number} (${point.name}) — ${point.boardPearl}`,
        cardId: point.id,
      });
    }
  }

  return questions;
}

export function generateQuiz(
  deck: DeckType,
  herbs: Herb[],
  formulas: Formula[],
  points: Acupoint[],
  count: number = 20
): QuizQuestion[] {
  switch (deck) {
    case 'herbs':
      return generateHerbQuestions(herbs, count);
    case 'formulas':
      return generateFormulaQuestions(formulas, count);
    case 'acupoints':
      return generateAcupointQuestions(points, count);
  }
}
