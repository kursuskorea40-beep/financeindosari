// Simple JS syntax check by extracting script content
const fs = require('fs');
const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html', 'utf-8');
// Extract content between <script> (last one) and </script>
const scripts = [];
let idx = 0;
while (true) {
  const start = html.indexOf('<script>', idx);
  if (start < 0) break;
  const end = html.indexOf('</script>', start);
  if (end < 0) break;
  scripts.push(html.slice(start + 8, end));
  idx = end + 9;
}
console.log('Found', scripts.length, 'inline scripts');
scripts.forEach((s, i) => {
  try {
    new Function(s);
    console.log(`Script #${i+1}: OK (${s.length} chars)`);
  } catch (e) {
    console.error(`Script #${i+1}: SYNTAX ERROR ->`, e.message);
    // Find line number by looking for the error position
    if (e.lineNumber) console.error('   around line', e.lineNumber);
  }
});
