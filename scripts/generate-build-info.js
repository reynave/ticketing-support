const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'environments', 'build-info.ts');
const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const timestamp = [
  String(now.getFullYear()).slice(-2),
  pad(now.getMonth() + 1),
  pad(now.getDate()), 
  pad(now.getHours()),
  pad(now.getMinutes()),
].join('');

const content = `export const buildInfo = {\n  buildCode: '${timestamp}',\n};\n`;

fs.writeFileSync(targetPath, content, 'utf8');
console.log(`Build timestamp generated: ${timestamp}`);
