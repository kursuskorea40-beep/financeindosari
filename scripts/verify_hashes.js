// Verify bcrypt hashes match the passwords
const bcrypt = require('bcryptjs');

const hashes = {
  admin123: '$2b$10$Kkl4OoVRS/Pc8mn6rFMrwuRAFj480HPstgi.XGVL3LJkJXnUAjObe',
  finance123: '$2b$10$kJmSzm5aMdxCMvNXBmcNIe4Epl83DvLTRoaCBvCWSsttiK.Hxj/kG',
  gudang123: '$2b$10$lSaf5y6d/i4nFSpI7wk8bu4CmfirX1PoEh7UniI9/IrzAauis69VO',
};

(async () => {
  for (const [password, hash] of Object.entries(hashes)) {
    const result = await bcrypt.compare(password, hash);
    console.log(`Password "${password}" → hash "${hash.slice(0, 20)}..." → match: ${result ? '✓ YES' : '✗ NO'}`);
  }
})();
