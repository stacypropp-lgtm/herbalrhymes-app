const fs = require('fs');
const path = require('path');

// Create a minimal valid PNG file with brand color
// PNG spec: signature + IHDR + IDAT + IEND
function createPNG(size) {
  const { deflateSync } = require('zlib');
  const width = size;
  const height = size;
  
  // Create raw pixel data (RGBA)
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  
  // Forest green: #22573E -> r=34, g=87, b=62
  // Gold leaf: #C4A265 -> r=196, g=162, b=101
  const centerX = width / 2;
  const centerY = height / 2;
  const leafRadius = width * 0.35;
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // filter byte
    
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Round rect background (forest green)
      const cornerRadius = width * 0.2;
      const inRect = Math.abs(dx) <= width/2 && Math.abs(dy) <= height/2;
      
      if (!inRect || dist > width * 0.48) {
        rawData[px] = 0; rawData[px+1] = 0; rawData[px+2] = 0; rawData[px+3] = 0;
        continue;
      }
      
      // Check if in rounded corner
      const cornerCheck = (cx, cy) => {
        const cdx = x - cx;
        const cdy = y - cy;
        return Math.sqrt(cdx*cdx + cdy*cdy) <= cornerRadius;
      };
      
      const hw = width/2 - cornerRadius;
      const hh = height/2 - cornerRadius;
      const inRounded = (Math.abs(dx) <= hw || Math.abs(dy) <= hh) ||
        cornerCheck(centerX - hw, centerY - hh) ||
        cornerCheck(centerX + hw, centerY - hh) ||
        cornerCheck(centerX - hw, centerY + hh) ||
        cornerCheck(centerX + hw, centerY + hh);
      
      if (!inRounded) {
        rawData[px] = 0; rawData[px+1] = 0; rawData[px+2] = 0; rawData[px+3] = 0;
        continue;
      }
      
      // Leaf shape (simple ellipse)
      const leafDy = (dy + height * 0.02) / leafRadius;
      const leafDx = dx / (leafRadius * 0.55);
      const leafDist = leafDx * leafDx + leafDy * leafDy;
      
      if (leafDist < 1) {
        // Gold leaf
        rawData[px] = 196; rawData[px+1] = 162; rawData[px+2] = 101; rawData[px+3] = 230;
      } else {
        // Forest green background
        rawData[px] = 34; rawData[px+1] = 87; rawData[px+2] = 62; rawData[px+3] = 255;
      }
    }
  }
  
  const compressed = deflateSync(rawData);
  
  // Build PNG
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
  }
  
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  
  const iend = Buffer.alloc(0);
  
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend),
  ]);
}

fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon-192.png'), createPNG(192));
fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon-512.png'), createPNG(512));
console.log('Generated icon-192.png and icon-512.png');
