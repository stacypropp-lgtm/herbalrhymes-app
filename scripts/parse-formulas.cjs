const fs = require('fs');
const path = require('path');

const inputPath = path.resolve(__dirname, '../../formulas/formula-database.json');
const outputPath = path.resolve(__dirname, '../src/data/formulas.json');

const raw = fs.readFileSync(inputPath, 'utf-8');
const formulas = JSON.parse(raw);

const mapped = formulas.map((formula, index) => ({
  id: `formula-${index + 1}`,
  ...formula,
}));

fs.writeFileSync(outputPath, JSON.stringify(mapped, null, 2), 'utf-8');

console.log(`Processed ${mapped.length} formulas -> ${outputPath}`);
