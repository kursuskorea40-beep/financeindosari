// Verify JS syntax of INDOSARI_Operasional.html
const fs = require('fs');
const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Operasional.html', 'utf-8');

// Extract inline <script> (without src)
const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (matches.length === 0) {
  console.error('No inline scripts found');
  process.exit(1);
}
console.log(`Found ${matches.length} inline scripts`);
let allOk = true;
for (let i = 0; i < matches.length; i++) {
  const code = matches[i][1];
  try {
    new Function(code);
    console.log(`Script #${i+1}: OK (${code.length} chars)`);
  } catch (e) {
    console.error(`Script #${i+1}: FAIL - ${e.message}`);
    // Print line number context
    const lines = code.split('\n');
    const m = e.message.match(/line (\d+)/);
    if (m) {
      const ln = parseInt(m[1], 10);
      const start = Math.max(0, ln - 3);
      const end = Math.min(lines.length, ln + 2);
      console.error('Context:');
      for (let j = start; j < end; j++) {
        console.error(`${j+1}: ${lines[j]}`);
      }
    }
    allOk = false;
  }
}
console.log(allOk ? '\n✓ ALL SCRIPTS OK' : '\n✗ HAS FAILURES');
process.exit(allOk ? 0 : 1);
