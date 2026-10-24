// Sanity check: hitung split NOTA BESAR (kredit) vs NOTA KECIL (tunai) dari rincianPenjualan embedded
const fs = require("fs");
const html = fs.readFileSync("/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html", "utf8");
const m = html.match(/const COMBINED = (\{.*?\});\n/s);
const C = JSON.parse(m[1]);
const tx = C.extras.rincianPenjualan || [];
console.log("total tx:", tx.length);
const byMonth = {};
tx.forEach(t => {
  if (!t.tanggal) return;
  const mm = parseInt(String(t.tanggal).slice(5, 7), 10);
  if (!byMonth[mm]) byMonth[mm] = { tunai: 0, kredit: 0, n: 0 };
  const amt = (Number(t.kuantitas) || 0) * (Number(t.hargaSatuan) || 0);
  if (t.kategori === "NOTA BESAR") byMonth[mm].kredit += amt;
  else byMonth[mm].tunai += amt;
  byMonth[mm].n++;
});
let tot = { tunai: 0, kredit: 0 };
Object.keys(byMonth).sort().forEach(k => {
  const b = byMonth[k];
  tot.tunai += b.tunai; tot.kredit += b.kredit;
  console.log(`Bulan ${k}: n=${b.n} tunai=${b.tunai.toFixed(2)} kredit=${b.kredit.toFixed(2)} total=${(b.tunai+b.kredit).toFixed(2)}`);
});
console.log("TOTAL tunai:", tot.tunai.toFixed(2), "kredit:", tot.kredit.toFixed(2), "sum:", (tot.tunai+tot.kredit).toFixed(2));
// sample tx fields
console.log("sample:", JSON.stringify(tx[0]));
// fakturBelumLunas sample
const fk = C.extras.fakturBelumLunas || [];
console.log("faktur:", fk.length, "sample:", JSON.stringify(fk[0]));
