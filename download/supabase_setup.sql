-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Cabang" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "telp" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cabang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "cabangId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterBarang" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "satuan" TEXT,
    "cabangId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterBarang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterSupplier" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "telp" TEXT,
    "cabangId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterPelanggan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "telp" TEXT,
    "cabangId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterPelanggan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransaksiPenjualan" (
    "id" TEXT NOT NULL,
    "cabangId" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "tanggal" TEXT NOT NULL,
    "noNota" TEXT,
    "namaBarang" TEXT NOT NULL,
    "satuan" TEXT,
    "kuantitas" DOUBLE PRECISION NOT NULL,
    "hargaSatuan" DOUBLE PRECISION NOT NULL,
    "kategori" TEXT NOT NULL DEFAULT 'NOTA KECIL',
    "isLunas" BOOLEAN NOT NULL DEFAULT true,
    "jatuhTempo" TEXT,
    "keterangan" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransaksiPenjualan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransaksiPembelian" (
    "id" TEXT NOT NULL,
    "cabangId" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "tanggal" TEXT NOT NULL,
    "noNota" TEXT,
    "namaBarang" TEXT NOT NULL,
    "satuan" TEXT,
    "kuantitas" DOUBLE PRECISION NOT NULL,
    "hargaSatuan" DOUBLE PRECISION NOT NULL,
    "isLunas" BOOLEAN NOT NULL DEFAULT false,
    "jatuhTempo" TEXT,
    "keterangan" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransaksiPembelian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersediaanBulan" (
    "id" TEXT NOT NULL,
    "cabangId" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "satuan" TEXT,
    "awalQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "awalNilai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "masukQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "masukNilai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keluarQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "keluarNilai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersediaanBulan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PiutangBulan" (
    "id" TEXT NOT NULL,
    "cabangId" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "saldoAwal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penjualan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pembayaran" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penyesuaian" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PiutangBulan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtangBulan" (
    "id" TEXT NOT NULL,
    "cabangId" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "saldoAwal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penyesuaianAwal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pembelian" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pembayaran" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtangBulan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FakturPiutang" (
    "id" TEXT NOT NULL,
    "cabangId" TEXT NOT NULL,
    "pelangganId" TEXT,
    "pelanggan" TEXT NOT NULL,
    "noFaktur" TEXT NOT NULL,
    "tanggal" TEXT,
    "jatuhTempo" TEXT,
    "nilai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jumlah" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dibayar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sumber" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FakturPiutang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FakturHutang" (
    "id" TEXT NOT NULL,
    "cabangId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplier" TEXT NOT NULL,
    "noFaktur" TEXT NOT NULL,
    "tanggal" TEXT,
    "jatuhTempo" TEXT,
    "nilai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jumlah" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dibayar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sumber" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FakturHutang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabaRugiBulan" (
    "id" TEXT NOT NULL,
    "cabangId" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "akun" TEXT NOT NULL,
    "nilai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kategori" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabaRugiBulan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeracaBulan" (
    "id" TEXT NOT NULL,
    "cabangId" TEXT NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "akun" TEXT NOT NULL,
    "nilai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kategori" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeracaBulan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cabang_kode_key" ON "Cabang"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "MasterBarang_cabangId_kode_key" ON "MasterBarang"("cabangId", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "MasterSupplier_cabangId_nama_key" ON "MasterSupplier"("cabangId", "nama");

-- CreateIndex
CREATE UNIQUE INDEX "MasterPelanggan_cabangId_nama_key" ON "MasterPelanggan"("cabangId", "nama");

-- CreateIndex
CREATE INDEX "TransaksiPenjualan_cabangId_tahun_bulan_idx" ON "TransaksiPenjualan"("cabangId", "tahun", "bulan");

-- CreateIndex
CREATE INDEX "TransaksiPenjualan_cabangId_tanggal_idx" ON "TransaksiPenjualan"("cabangId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "TransaksiPenjualan_cabangId_noNota_tanggal_namaBarang_key" ON "TransaksiPenjualan"("cabangId", "noNota", "tanggal", "namaBarang");

-- CreateIndex
CREATE INDEX "TransaksiPembelian_cabangId_tahun_bulan_idx" ON "TransaksiPembelian"("cabangId", "tahun", "bulan");

-- CreateIndex
CREATE INDEX "TransaksiPembelian_cabangId_tanggal_idx" ON "TransaksiPembelian"("cabangId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "TransaksiPembelian_cabangId_noNota_tanggal_namaBarang_key" ON "TransaksiPembelian"("cabangId", "noNota", "tanggal", "namaBarang");

-- CreateIndex
CREATE UNIQUE INDEX "PersediaanBulan_cabangId_tahun_bulan_kode_key" ON "PersediaanBulan"("cabangId", "tahun", "bulan", "kode");

-- CreateIndex
CREATE UNIQUE INDEX "PiutangBulan_cabangId_tahun_bulan_key" ON "PiutangBulan"("cabangId", "tahun", "bulan");

-- CreateIndex
CREATE UNIQUE INDEX "UtangBulan_cabangId_tahun_bulan_key" ON "UtangBulan"("cabangId", "tahun", "bulan");

-- CreateIndex
CREATE INDEX "FakturPiutang_cabangId_jatuhTempo_idx" ON "FakturPiutang"("cabangId", "jatuhTempo");

-- CreateIndex
CREATE UNIQUE INDEX "FakturPiutang_cabangId_noFaktur_key" ON "FakturPiutang"("cabangId", "noFaktur");

-- CreateIndex
CREATE INDEX "FakturHutang_cabangId_jatuhTempo_idx" ON "FakturHutang"("cabangId", "jatuhTempo");

-- CreateIndex
CREATE UNIQUE INDEX "FakturHutang_cabangId_noFaktur_key" ON "FakturHutang"("cabangId", "noFaktur");

-- CreateIndex
CREATE UNIQUE INDEX "LabaRugiBulan_cabangId_tahun_bulan_akun_key" ON "LabaRugiBulan"("cabangId", "tahun", "bulan", "akun");

-- CreateIndex
CREATE UNIQUE INDEX "NeracaBulan_cabangId_tahun_bulan_akun_key" ON "NeracaBulan"("cabangId", "tahun", "bulan", "akun");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterBarang" ADD CONSTRAINT "MasterBarang_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterSupplier" ADD CONSTRAINT "MasterSupplier_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterPelanggan" ADD CONSTRAINT "MasterPelanggan_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiPenjualan" ADD CONSTRAINT "TransaksiPenjualan_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiPenjualan" ADD CONSTRAINT "TransaksiPenjualan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiPembelian" ADD CONSTRAINT "TransaksiPembelian_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiPembelian" ADD CONSTRAINT "TransaksiPembelian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersediaanBulan" ADD CONSTRAINT "PersediaanBulan_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PiutangBulan" ADD CONSTRAINT "PiutangBulan_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtangBulan" ADD CONSTRAINT "UtangBulan_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FakturPiutang" ADD CONSTRAINT "FakturPiutang_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FakturPiutang" ADD CONSTRAINT "FakturPiutang_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "MasterPelanggan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FakturHutang" ADD CONSTRAINT "FakturHutang_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FakturHutang" ADD CONSTRAINT "FakturHutang_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "MasterSupplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabaRugiBulan" ADD CONSTRAINT "LabaRugiBulan_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeracaBulan" ADD CONSTRAINT "NeracaBulan_cabangId_fkey" FOREIGN KEY ("cabangId") REFERENCES "Cabang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================
-- SEED DATA: 2 Cabang + 3 User + 4 Settings
-- ============================================================

-- Cabang (2: Jakarta + Surabaya)
INSERT INTO "Cabang" ("id", "kode", "nama", "alamat", "telp", "isDefault", "createdAt", "updatedAt") VALUES
  ('cab_jkt_001', 'JKT', 'Jakarta Pusat', 'Jl. Industri No. 1, Jakarta', '(021) 1234567', true, NOW(), NOW()),
  ('cab_sby_001', 'SBY', 'Surabaya', 'Jl. Raya Darmo No. 1, Surabaya', '(031) 7654321', false, NOW(), NOW())
ON CONFLICT ("kode") DO UPDATE SET
  "nama" = EXCLUDED."nama",
  "alamat" = EXCLUDED."alamat",
  "telp" = EXCLUDED."telp",
  "isDefault" = EXCLUDED."isDefault",
  "updatedAt" = NOW();

-- Users (3: admin1, finance1, gudang1) — password sudah di-hash bcrypt
-- Password hash untuk admin123: $2b$10$Kkl4OoVRS/Pc8mn6rFMrwuRAFj480HPstgi.XGVL3LJkJXnUAjObe
-- Password hash untuk finance123: $2b$10$kJmSzm5aMdxCMvNXBmcNIe4Epl83DvLTRoaCBvCWSsttiK.Hxj/kG
-- Password hash untuk gudang123: $2b$10$lSaf5y6d/i4nFSpI7wk8bu4CmfirX1PoEh7UniI9/IrzAauis69VO
INSERT INTO "User" ("id", "username", "passwordHash", "name", "role", "cabangId", "isActive", "createdAt", "updatedAt") VALUES
  ('user_admin1', 'admin1', '$2b$10$Kkl4OoVRS/Pc8mn6rFMrwuRAFj480HPstgi.XGVL3LJkJXnUAjObe', 'Administrator', 'ADMIN', 'cab_jkt_001', true, NOW(), NOW()),
  ('user_finance1', 'finance1', '$2b$10$kJmSzm5aMdxCMvNXBmcNIe4Epl83DvLTRoaCBvCWSsttiK.Hxj/kG', 'Bagian Keuangan', 'FINANCE', 'cab_jkt_001', true, NOW(), NOW()),
  ('user_gudang1', 'gudang1', '$2b$10$lSaf5y6d/i4nFSpI7wk8bu4CmfirX1PoEh7UniI9/IrzAauis69VO', 'Bagian Gudang', 'GUDANG', 'cab_sby_001', true, NOW(), NOW())
ON CONFLICT ("username") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "name" = EXCLUDED."name",
  "role" = EXCLUDED."role",
  "cabangId" = EXCLUDED."cabangId",
  "isActive" = true,
  "updatedAt" = NOW();

-- Settings (4: identitas perusahaan default)
INSERT INTO "Setting" ("id", "key", "value", "updatedAt") VALUES
  ('set_1', 'companyName', 'INDOSARI', NOW()),
  ('set_2', 'companyAddress', 'Jl. Industri No. 1, Jakarta', NOW()),
  ('set_3', 'companyPhone', '(021) 1234567', NOW()),
  ('set_4', 'companyNPWP', '', NOW())
ON CONFLICT ("key") DO UPDATE SET
  "value" = EXCLUDED."value",
  "updatedAt" = NOW();

-- ============================================================
-- DONE! Verify data:
-- ============================================================
-- SELECT * FROM "Cabang";      -- should show 2 rows
-- SELECT * FROM "User";        -- should show 3 rows
-- SELECT * FROM "Setting";     -- should show 4 rows
