// Generate bcrypt password hashes for the 3 demo users
const bcrypt = require('bcryptjs');

async function main() {
  const passwords = ['admin123', 'finance123', 'gudang123'];
  for (const p of passwords) {
    const hash = await bcrypt.hash(p, 10);
    console.log(`${p} => ${hash}`);
  }
}
main();
