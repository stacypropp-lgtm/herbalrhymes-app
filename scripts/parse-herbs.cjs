const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../../products/flashcard-deck-v2.md');
const OUTPUT = path.resolve(__dirname, '../src/data/herbs.json');

const md = fs.readFileSync(INPUT, 'utf-8');
const lines = md.split('\n');

const herbs = [];
let currentCategory = '';
let currentCategoryAbbrev = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Match category headers like:
  // # Category 1: HERBS THAT RELEASE THE EXTERIOR — Warm Acrid (WARE)
  // # Category 3: CLEAR HEAT — Drain Fire
  const catMatch = line.match(/^# Category \d+\w*:\s+(.+)$/);
  if (catMatch) {
    let raw = catMatch[1].trim();
    // Extract abbreviation in parens if present (only all-caps abbreviations)
    const abbrevMatch = raw.match(/\(([A-Z]+)\)\s*$/);
    if (abbrevMatch) {
      currentCategoryAbbrev = abbrevMatch[1];
      raw = raw.replace(/\s*\([A-Z]+\)\s*$/, '').trim();
    } else {
      currentCategoryAbbrev = '';
    }
    // Convert to title case: "HERBS THAT RELEASE THE EXTERIOR — Warm Acrid"
    currentCategory = toTitleCase(raw);
    continue;
  }

  // Match card headers like: ### 📇 Card 1.1
  const cardMatch = line.match(/^### 📇 Card (\d+\w*\.\d+)/);
  if (cardMatch) {
    const cardNum = cardMatch[1]; // e.g. "1.1"
    const id = `herb-${cardNum.replace('.', '-')}`;

    // Find FRONT line
    let pinyin = '';
    let latin = '';
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      const frontMatch = lines[j].match(/\*\*FRONT:\*\*\s+\*\*(.+?)\*\*\s+·\s+\*(.+?)\*/);
      if (frontMatch) {
        pinyin = stripDiacritics(frontMatch[1].trim());
        latin = frontMatch[2].trim();
        break;
      }
    }

    // Parse back table
    let temperature = '';
    let taste = '';
    let channels = [];
    let indications = '';
    let contraindication = '';
    let boardPearl = '';

    for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
      const tl = lines[j];
      if (tl.startsWith('### ') || tl.match(/^# Category/)) break;

      const rowMatch = tl.match(/^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|$/);
      if (rowMatch) {
        const prop = rowMatch[1].trim();
        const detail = rowMatch[2].trim();

        if (prop === 'Temperature') {
          temperature = detail;
        } else if (prop === 'Taste') {
          taste = detail;
        } else if (prop.startsWith('Channel')) {
          channels = detail.split(',').map(c => c.trim());
        } else if (prop.startsWith('Top 3')) {
          indications = detail;
        } else if (prop.startsWith('Key Contra')) {
          contraindication = detail;
        } else if (prop.startsWith('Board Pearl')) {
          boardPearl = detail;
        }
      }
    }

    herbs.push({
      id,
      pinyin,
      latin,
      category: currentCategory,
      categoryAbbrev: currentCategoryAbbrev,
      temperature,
      taste,
      channels,
      indications,
      contraindication,
      boardPearl,
    });
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(herbs, null, 2), 'utf-8');
console.log(`Parsed ${herbs.length} herbs → ${OUTPUT}`);

// --- helpers ---

function toTitleCase(str) {
  const smallWords = new Set(['a','an','the','and','but','or','for','nor','on','at','to','from','by','of','in','with','that']);
  // Handle em-dash separated parts
  return str.replace(/[^—]+/g, (segment) => {
    return segment.trim().split(/\s+/).map((word, idx) => {
      // Preserve already mixed-case words like "Warm"
      if (word.match(/^[A-Z][a-z]/)) return word;
      // Titlecase a single token (may contain hyphens or parens)
      return titleToken(word, idx > 0 && smallWords);
    }).join(' ');
  }).replace(/\s*—\s*/g, ' — ');
}

function titleToken(word, smallSet) {
  // Handle hyphenated words: each part gets title-cased
  if (word.includes('-')) {
    return word.split('-').map(p => titleToken(p, null)).join('-');
  }
  // Strip surrounding parens
  let prefix = '', suffix = '';
  if (word.startsWith('(')) { prefix = '('; word = word.slice(1); }
  if (word.endsWith(')')) { suffix = ')'; word = word.slice(0, -1); }
  const lower = word.toLowerCase();
  if (smallSet && smallSet.has(lower)) return prefix + lower + suffix;
  return prefix + lower.charAt(0).toUpperCase() + lower.slice(1) + suffix;
}

function stripDiacritics(str) {
  // Remove combining diacritical marks (tone marks on pinyin)
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC');
}
