const fs = require('fs');
const path = require('path');

const ACUPOINTS_DIR = path.resolve(__dirname, '../../acupoints');
const OUT_DIR = path.resolve(__dirname, '../src/data');

const SOURCE_FILES = [
  'tmp_lu_li.json',
  'tmp_st.json',
  'tmp_sp_ht_si.json',
  'tmp_kd_pc_sj.json',
  'tmp_gb_lv.json',
  'tmp_ub.json',
  'tmp_ren_du.json',
  'tmp_extra_points.json',
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const allPoints = [];

for (const file of SOURCE_FILES) {
  const filePath = path.join(ACUPOINTS_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const [key, channel] of Object.entries(data)) {
    // extra_points has a different structure — no channel-level metadata
    const isExtra = key === 'extra_points';
    const channelAbbr = isExtra ? 'EX' : channel.abbreviation || key;
    const channelName = isExtra ? 'Extra Points' : (channel.channel_name || key);
    const element = isExtra ? null : (channel.element || null);
    const yinYang = isExtra ? null : (channel.yin_yang || null);

    if (!channel.points || !Array.isArray(channel.points)) {
      console.warn(`Warning: No points array in ${file} -> ${key}`);
      continue;
    }

    for (const pt of channel.points) {
      allPoints.push({
        id: pt.number,
        name: pt.name,
        number: pt.number,
        english: pt.english || null,
        channel: channelAbbr,
        channelName: channelName,
        element: element,
        yinYang: yinYang,
        location: pt.location || null,
        depth: pt.depth || null,
        categories: pt.categories || [],
        indications: pt.indications || [],
        boardPearl: pt.board_pearl || null,
        memoryTrick: pt.memory_trick || null,
        cautions: pt.cautions || null,
        fiveShu: pt.five_shu || null,
        specialCategories: pt.special_categories || [],
      });
    }
  }
}

// Write acupoints.json
const acupointsOut = path.join(OUT_DIR, 'acupoints.json');
fs.writeFileSync(acupointsOut, JSON.stringify(allPoints, null, 2));
console.log(`Wrote ${allPoints.length} points to ${acupointsOut}`);

// Copy and reformat point-categories.json
const catSrc = path.join(ACUPOINTS_DIR, 'tmp_point_categories.json');
const catData = JSON.parse(fs.readFileSync(catSrc, 'utf8'));
const catOut = path.join(OUT_DIR, 'point-categories.json');
fs.writeFileSync(catOut, JSON.stringify(catData, null, 2));
console.log(`Wrote point-categories.json to ${catOut}`);
