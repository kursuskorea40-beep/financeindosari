// ============================================================
// 12. PIUTANG — menu sendiri (saldo bulanan + tunai vs kredit)
// ============================================================
// Sumber data: sheet Excel "Piutang & Utang" (Piutang: baris 8-19, Tunai vs Kredit: baris 23-34).
// Edit sel tersimpan di localStorage (userEdits.extras.piutangBulan), bisa di-reset ke data Excel asli.
const PIUTANG_FIELDS = ["saldoAwal","penjualan","pembayaran","penyesuaian"];
const UTANG_FIELDS = ["saldoAwal","penyesuaianAwal","pembelian","pembayaran"];

function getPiutangRows() {
  const ov = (userEdits.extras && userEdits.extras.piutangBulan) || {};
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const pRow = 7 + m;
    // PIUTANG: C=saldoAwal, D=penjualan, E=pembayaran, F=penyesuaian
    const r = Object.assign({
      saldoAwal: Number(hfGet("Piutang & Utang",`C${pRow}`)) || 0,
      penjualan: Number(hfGet("Piutang & Utang",`D${pRow}`)) || 0,
      pembayaran: Number(hfGet("Piutang & Utang",`E${pRow}`)) || 0,
      penyesuaian: Number(hfGet("Piutang & Utang",`F${pRow}`)) || 0,
    }, ov[String(m)] || {});
    r.bulan = BULAN_NAMES[m-1];
    // Saldo Akhir = Saldo Awal + Penjualan - Pembayaran.
    // Kolom Penyesuaian TIDAK ditambahkan lagi karena sudah termasuk dalam Saldo Awal
    // (terbukti dari data Excel: C11 = G10 + F11) — sama dengan Excel asli.
    r.saldoAkhir = r.saldoAwal + r.penjualan - r.pembayaran;
    rows.push(r);
  }
  return rows;
}

function savePiutangBulan(rows) {
  if (!userEdits.extras) userEdits.extras = {};
  userEdits.extras.piutangBulan = {};
  rows.forEach((r, i) => {
    const o = {};
    PIUTANG_FIELDS.forEach(f => { o[f] = Number(r[f]) || 0; });
    userEdits.extras.piutangBulan[String(i+1)] = o;
  });
  saveEdits(userEdits);
}

// Tunai (NOTA KECIL) vs Kredit (NOTA BESAR) per bulan.
// Prioritas: dihitung LIVE dari data transaksi Penjualan (hasil import/paste Accurate) bila bulan tsb ada transaksi;
// kalau tidak ada, pakai nilai statis dari sheet Excel "Piutang & Utang" (baris 23-34).
function getTunaiKreditRows() {
  const tx = getTxData("penjualan") || [];
  const byMonth = {};
  tx.forEach(t => {
    if (!t || !t.tanggal) return;
    const m = parseInt(String(t.tanggal).slice(5,7), 10);
    if (!m || m < 1 || m > 12) return;
    if (!byMonth[m]) byMonth[m] = { tunai: 0, kredit: 0 };
    const amt = (Number(t.kuantitas)||0) * (Number(t.hargaSatuan)||0);
    if (t.kategori === "NOTA BESAR") byMonth[m].kredit += amt;
    else byMonth[m].tunai += amt;
  });
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const tRow = 22 + m;
    const exTunai = Number(hfGet("Piutang & Utang",`C${tRow}`)) || 0;
    const exKredit = Number(hfGet("Piutang & Utang",`D${tRow}`)) || 0;
    const live = byMonth[m];
    const useLive = !!live && (live.tunai > 0 || live.kredit > 0);
    rows.push({
      bulan: BULAN_NAMES[m-1],
      tunai: useLive ? live.tunai : exTunai,
      kredit: useLive ? live.kredit : exKredit,
      fromTx: useLive,
    });
  }
  return rows;
}

// Edit sel angka bulanan (klik sel kuning → input → Enter/blur = simpan).
// Pakai data-val (angka mentah) supaya nilai desimal tidak rusak oleh format tampilan.
function attachMonthCellEdit(tbody, rows, onSaved, rerender, label) {
  tbody.querySelectorAll("td.input[data-f]").forEach(td => {
    td.onclick = () => {
      if (td.querySelector("input")) return;
      const inp = document.createElement("input");
      inp.className = "cell-input";
      inp.value = td.dataset.val !== undefined ? td.dataset.val : td.textContent.replace(/[Rp ().,]/g,"").trim();
      inp.type = "text";
      inp.inputMode = "decimal";
      td.textContent = "";
      td.appendChild(inp);
      inp.focus(); inp.select();
      const save = () => {
        const raw = inp.value.trim();
        let v = 0;
        if (raw !== "") {
          const cleaned = raw.replace(/\./g,"").replace(",",".");
          if (!isNaN(Number(cleaned)) && /^[\d.,\-]+$/.test(raw)) v = Number(cleaned);
        }
        const m = parseInt(td.dataset.m,10);
        const f = td.dataset.f;
        rows[m][f] = v;
        onSaved(rows);
        rerender();
        showToast(`✓ ${BULAN_NAMES[m]} (${label}) diupdate`);
      };
      inp.onblur = save;
      inp.onkeydown = (e) => { if (e.key === "Enter") inp.blur(); };
    };
  });
}

function renderPiutang() {
  const c = document.getElementById("sheetContainer");
  c.classList.add("p-4","sm:p-6");
  c.style.background = "#fff";

  const rows = getPiutangRows();
  const tkRows = getTunaiKreditRows();
  const saldoAkhirDes = rows[11].saldoAkhir;
  const totJual = rows.reduce((s,r)=>s+r.penjualan,0);
  const totBayar = rows.reduce((s,r)=>s+r.pembayaran,0);
  const totTunai = tkRows.reduce((s,r)=>s+r.tunai,0);
  const totKredit = tkRows.reduce((s,r)=>s+r.kredit,0);
  const totPenjualan = totTunai + totKredit;
  const pctTunai = totPenjualan > 0 ? totTunai/totPenjualan : 0;
  const hasEdit = !!(userEdits.extras && userEdits.extras.piutangBulan);

  c.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">Piutang Usaha — 2026</h2>
          <p class="text-xs text-slate-500">Saldo piutang bulanan (penjualan kredit / Nota Besar) + breakdown Tunai vs Kredit</p>
        </div>
        <div class="flex gap-2">
          ${hasEdit ? '<button id="btnResetPiu" class="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">↺ Reset Edit</button>' : ''}
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="kpi-card"><div class="label">Saldo Piutang Akhir</div><div class="value">Rp ${fmtRupiah(saldoAkhirDes)}</div><div class="sub">Per Desember 2026</div></div>
        <div class="kpi-card primary"><div class="label">Penjualan Kredit YTD</div><div class="value">Rp ${fmtRupiah(totJual)}</div><div class="sub">Total penjualan Nota Besar</div></div>
        <div class="kpi-card success"><div class="label">Pembayaran Piutang YTD</div><div class="value">Rp ${fmtRupiah(totBayar)}</div><div class="sub">Pelunasan pelanggan</div></div>
        <div class="kpi-card"><div class="label">% Penjualan Tunai YTD</div><div class="value">${(pctTunai*100).toFixed(1)}%</div><div class="sub">Tunai Rp ${fmtRupiah(totTunai)} / Total Rp ${fmtRupiah(totPenjualan)}</div></div>
      </div>

      <div class="bg-white border border-slate-200 rounded-lg overflow-auto scrollbar-thin">
        <h3 class="text-sm font-bold text-slate-700 m-4 mb-1">Piutang Usaha per Bulan</h3>
        <p class="text-xs text-slate-500 mx-4 mt-0 mb-2">Saldo Akhir = Saldo Awal + Penjualan − Pembayaran (auto). Kolom Penyesuaian sudah termasuk dalam Saldo Awal (sama dengan Excel). Klik sel angka (kuning) untuk edit.</p>
        <table class="dash-table">
          <thead><tr><th>BULAN</th><th>SALDO AWAL</th><th>PENJUALAN (KREDIT)</th><th>PEMBAYARAN</th><th>PENYESUAIAN</th><th>SALDO AKHIR</th></tr></thead>
          <tbody id="piuTbody">
            ${rows.map((r,i)=>`<tr><td class="label">${r.bulan}</td><td class="num input" data-m="${i}" data-f="saldoAwal" data-val="${r.saldoAwal}">Rp ${fmtRupiah(r.saldoAwal)}</td><td class="num input" data-m="${i}" data-f="penjualan" data-val="${r.penjualan}">Rp ${fmtRupiah(r.penjualan)}</td><td class="num input" data-m="${i}" data-f="pembayaran" data-val="${r.pembayaran}">Rp ${fmtRupiah(r.pembayaran)}</td><td class="num input" data-m="${i}" data-f="penyesuaian" data-val="${r.penyesuaian}">Rp ${fmtRupiah(r.penyesuaian)}</td><td class="num">Rp ${fmtRupiah(r.saldoAkhir)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="bg-white border border-slate-200 rounded-lg overflow-auto scrollbar-thin">
        <h3 class="text-sm font-bold text-slate-700 m-4 mb-1">Penjualan: Tunai (Nota Kecil) vs Kredit (Nota Besar)</h3>
        <p class="text-xs text-slate-500 mx-4 mt-0 mb-2">Bulan bertanda "⚡ dari transaksi" dihitung otomatis dari data menu Penjualan (hasil paste Accurate). Bulan lain memakai data Excel.</p>
        <table class="dash-table">
          <thead><tr><th>BULAN</th><th>NOTA KECIL (TUNAI)</th><th>NOTA BESAR (KREDIT)</th><th>TOTAL</th><th>% TUNAI</th><th>SUMBER</th></tr></thead>
          <tbody>
            ${tkRows.map(r=>{ const tot = r.tunai + r.kredit; const pct = tot>0 ? r.tunai/tot : null; return `<tr><td class="label">${r.bulan}</td><td class="num">Rp ${fmtRupiah(r.tunai)}</td><td class="num">Rp ${fmtRupiah(r.kredit)}</td><td class="num">Rp ${fmtRupiah(tot)}</td><td class="num">${pct===null?"-":(pct*100).toFixed(1)+"%"}</td><td class="center text-[10px] ${r.fromTx?'text-emerald-600 font-medium':'text-slate-400'}">${r.fromTx?"⚡ dari transaksi":"Excel"}</td></tr>`; }).join("")}
          </tbody>
          <tfoot>
            <tr class="total-row"><td style="text-align:left;font-weight:700">TOTAL</td><td class="num">Rp ${fmtRupiah(totTunai)}</td><td class="num">Rp ${fmtRupiah(totKredit)}</td><td class="num">Rp ${fmtRupiah(totPenjualan)}</td><td class="num">${totPenjualan>0?(pctTunai*100).toFixed(1)+"%":"-"}</td><td></td></tr>
          </tfoot>
        </table>
      </div>

      <p class="text-xs text-slate-500">Sumber data: sheet Excel "Piutang & Utang" + data transaksi Penjualan. Edit tersimpan otomatis di browser (localStorage); gunakan "Reset Edit" untuk kembali ke data Excel asli.</p>
    </div>`;

  if (hasEdit) {
    document.getElementById("btnResetPiu").onclick = () => {
      if (!confirm("Reset semua edit Piutang ke data Excel asli?")) return;
      delete userEdits.extras.piutangBulan;
      saveEdits(userEdits);
      renderPiutang();
      showToast("✓ Edit Piutang direset");
    };
  }
  attachMonthCellEdit(document.getElementById("piuTbody"), rows, savePiutangBulan, renderPiutang, "Piutang");

  document.getElementById("statusBar").textContent = `Piutang Akhir (Des): Rp ${fmtRupiah(saldoAkhirDes)} · Penjualan Kredit YTD: Rp ${fmtRupiah(totJual)} · Pembayaran YTD: Rp ${fmtRupiah(totBayar)}`;
}

// ============================================================
// 12b. HUTANG — menu sendiri (saldo bulanan + faktur belum lunas)
// ============================================================
function getUtangRows() {
  const ov = (userEdits.extras && userEdits.extras.utangBulan) || {};
  const rows = [];
  for (let m = 1; m <= 12; m++) {
    const uRow = 39 + m;
    // UTANG: C=saldoAwal, D=penyesuaianAwal, E=pembelian, F=pembayaran
    const r = Object.assign({
      saldoAwal: Number(hfGet("Piutang & Utang",`C${uRow}`)) || 0,
      penyesuaianAwal: Number(hfGet("Piutang & Utang",`D${uRow}`)) || 0,
      pembelian: Number(hfGet("Piutang & Utang",`E${uRow}`)) || 0,
      pembayaran: Number(hfGet("Piutang & Utang",`F${uRow}`)) || 0,
    }, ov[String(m)] || {});
    r.bulan = BULAN_NAMES[m-1];
    // Saldo Akhir = Saldo Awal + Pembelian - Pembayaran.
    // Kolom Penyesuaian Awal TIDAK ditambahkan lagi karena sudah termasuk dalam Saldo Awal
    // (terbukti dari data Excel: C40 = G39 + D40) — kode lama double-count.
    r.saldoAkhir = r.saldoAwal + r.pembelian - r.pembayaran;
    rows.push(r);
  }
  return rows;
}

function saveUtangBulan(rows) {
  if (!userEdits.extras) userEdits.extras = {};
  userEdits.extras.utangBulan = {};
  rows.forEach((r, i) => {
    const o = {};
    UTANG_FIELDS.forEach(f => { o[f] = Number(r[f]) || 0; });
    userEdits.extras.utangBulan[String(i+1)] = o;
  });
  saveEdits(userEdits);
}

function getFakturBelumLunas() {
  if (userEdits.extras && userEdits.extras.fakturBelumLunas) return userEdits.extras.fakturBelumLunas;
  return EXTRAS.fakturBelumLunas || [];
}

function renderHutang() {
  const c = document.getElementById("sheetContainer");
  c.classList.add("p-4","sm:p-6");
  c.style.background = "#fff";

  const rows = getUtangRows();
  const saldoAkhirDes = rows[11].saldoAkhir;
  const totBeli = rows.reduce((s,r)=>s+r.pembelian,0);
  const totBayar = rows.reduce((s,r)=>s+r.pembayaran,0);
  const faktur = getFakturBelumLunas();
  const totalFaktur = faktur.reduce((s,r)=>s+r.nilai,0);
  const terlewat = faktur.filter(f=>f.status==="TERLEWAT").length;
  const hasEdit = !!(userEdits.extras && userEdits.extras.utangBulan);

  c.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">Hutang Usaha — 2026</h2>
          <p class="text-xs text-slate-500">Saldo hutang bulanan (pembelian kredit ke supplier) + faktur belum lunas</p>
        </div>
        <div class="flex gap-2">
          ${hasEdit ? '<button id="btnResetHut" class="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">↺ Reset Edit</button>' : ''}
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="kpi-card danger"><div class="label">Saldo Hutang Akhir</div><div class="value">Rp ${fmtRupiah(saldoAkhirDes)}</div><div class="sub">Per Desember 2026</div></div>
        <div class="kpi-card primary"><div class="label">Pembelian Kredit YTD</div><div class="value">Rp ${fmtRupiah(totBeli)}</div><div class="sub">Total pembelian kredit</div></div>
        <div class="kpi-card success"><div class="label">Pembayaran Hutang YTD</div><div class="value">Rp ${fmtRupiah(totBayar)}</div><div class="sub">Pelunasan ke supplier</div></div>
        <div class="kpi-card"><div class="label">Faktur Belum Lunas</div><div class="value">Rp ${fmtRupiah(totalFaktur)}</div><div class="sub">${faktur.length} faktur · ${terlewat} jatuh tempo terlewat</div></div>
      </div>

      <div class="bg-white border border-slate-200 rounded-lg overflow-auto scrollbar-thin">
        <h3 class="text-sm font-bold text-slate-700 m-4 mb-1">Hutang Usaha per Bulan</h3>
        <p class="text-xs text-slate-500 mx-4 mt-0 mb-2">Saldo Akhir = Saldo Awal + Pembelian − Pembayaran (auto). Kolom Penyesuaian Awal sudah termasuk dalam Saldo Awal (sama dengan Excel). Klik sel angka (kuning) untuk edit.</p>
        <table class="dash-table">
          <thead><tr><th>BULAN</th><th>SALDO AWAL</th><th>PENYESUAIAN AWAL</th><th>PEMBELIAN</th><th>PEMBAYARAN</th><th>SALDO AKHIR</th></tr></thead>
          <tbody id="hutTbody">
            ${rows.map((r,i)=>`<tr><td class="label">${r.bulan}</td><td class="num input" data-m="${i}" data-f="saldoAwal" data-val="${r.saldoAwal}">Rp ${fmtRupiah(r.saldoAwal)}</td><td class="num input" data-m="${i}" data-f="penyesuaianAwal" data-val="${r.penyesuaianAwal}">Rp ${fmtRupiah(r.penyesuaianAwal)}</td><td class="num input" data-m="${i}" data-f="pembelian" data-val="${r.pembelian}">Rp ${fmtRupiah(r.pembelian)}</td><td class="num input" data-m="${i}" data-f="pembayaran" data-val="${r.pembayaran}">Rp ${fmtRupiah(r.pembayaran)}</td><td class="num">Rp ${fmtRupiah(r.saldoAkhir)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="bg-white border border-slate-200 rounded-lg overflow-auto scrollbar-thin">
        <h3 class="text-sm font-bold text-slate-700 m-4 mb-1">Rincian Faktur Belum Lunas (per 30 Sep 2026)</h3>
        <p class="text-xs text-slate-500 mx-4 mt-0 mb-2">Status TERLEWAT/BERJALAN dihitung dari tanggal jatuh tempo vs hari ini</p>
        <table class="tx-table">
          <thead>
            <tr><th>SUPPLIER</th><th>NO. FAKTUR</th><th>TANGGAL</th><th>JATUH TEMPO</th><th>UMUR (HR)</th><th>NILAI</th><th>STATUS</th></tr>
          </thead>
          <tbody>
            ${faktur.map(f=>`<tr><td>${escapeHtml(f.supplier)}</td><td>${escapeHtml(f.noFaktur)}</td><td class="center">${f.tanggal||"-"}</td><td class="center">${f.jatuhTempo||"-"}</td><td class="num">${f.umur}</td><td class="num">Rp ${fmtRupiah(f.nilai)}</td><td class="center"><span class="px-1.5 py-0.5 rounded text-[10px] font-medium ${f.status==='TERLEWAT'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}">${f.status}</span></td></tr>`).join("")}
          </tbody>
          <tfoot>
            <tr class="total-row"><td colspan="5" style="text-align:right">TOTAL (${faktur.length} faktur)</td><td class="num">Rp ${fmtRupiah(totalFaktur)}</td><td></td></tr>
          </tfoot>
        </table>
      </div>

      <p class="text-xs text-slate-500">Sumber data: sheet Excel "Piutang & Utang" (bagian Hutang) + Faktur Belum Lunas. Edit tersimpan otomatis di browser (localStorage); gunakan "Reset Edit" untuk kembali ke data Excel asli.</p>
    </div>`;

  if (hasEdit) {
    document.getElementById("btnResetHut").onclick = () => {
      if (!confirm("Reset semua edit Hutang ke data Excel asli?")) return;
      delete userEdits.extras.utangBulan;
      saveEdits(userEdits);
      renderHutang();
      showToast("✓ Edit Hutang direset");
    };
  }
  attachMonthCellEdit(document.getElementById("hutTbody"), rows, saveUtangBulan, renderHutang, "Hutang");

  document.getElementById("statusBar").textContent = `Hutang Akhir (Des): Rp ${fmtRupiah(saldoAkhirDes)} · Pembelian Kredit YTD: Rp ${fmtRupiah(totBeli)} · Faktur Belum Lunas: Rp ${fmtRupiah(totalFaktur)} (${faktur.length} faktur, ${terlewat} terlewat).`;
}
