// Test restore by creating a File from JSON string
const jsonStr = JSON.stringify({
  settings: { companyName: "INDOSARI Jaya Abadi", companyAddress: "Jl. Industri No. 5, Kawasan Industri Pulogadung, Jakarta Timur", companyPhone: "(021) 468-1234", companyNPWP: "01.234.567.8-091.000" },
  masterBarang: [
    { kode: "A00002", nama: "ALKOHOL", satuan: "Ltr" },
    { kode: "A00010", nama: "BENZOAT RRC", satuan: "Kg" }
  ],
  masterSupplier: [{ id: "s1", nama: "PT Sumber Kimia", alamat: "Jakarta", telp: "021-123" }],
  masterPelanggan: [{ id: "p1", nama: "Toko Makmur", alamat: "Bandung", telp: "022-456" }],
  docs: [
    { id: "doc-test-1", module: "spb", nomor: "SPB-2026-10-001", tanggal: "2026-10-25", partnerId: "", partnerNama: "Gudang", partnerAlamat: "", catatan: "test restore", extra: {}, items: [{ no: 1, kode: "A001", nama: "Test", qty: 1, satuan: "Pcs", harga: 0, subtotal: 0 }], total: 0, status: "draft", createdAt: "2026-10-25T09:00:00Z" }
  ],
  counters: { spb: { "2026-10": 1 }, lpb: {}, po: {}, invoice: {}, kwitansi: {} }
});
const blob = new Blob([jsonStr], { type: "application/json" });
const file = new File([blob], "test_backup.json", { type: "application/json" });
// restoreUpload is async; we just trigger it and report
restoreUpload(file).then(() => {
  window._restoreResult = "done";
});
"triggered";
