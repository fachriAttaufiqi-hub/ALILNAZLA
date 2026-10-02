export function formatRupiah(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 'Rp 0';
  const num = Math.round(Number(amount));
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDateIndo(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    }
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatMonthIndo(periodStr: string): string {
  if (!periodStr) return '';
  const [year, month] = periodStr.split('-');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${monthNames[mIndex] || month} ${year}`;
}

export const EXPENSE_CATEGORIES = [
  'Belanja Bulanan',
  'Makanan & Kuliner',
  'Tagihan & Utilitas',
  'Pendidikan',
  'Transportasi',
  'Kesehatan',
  'Keluarga & Anak',
  'Hiburan & Rekreasi',
  'Alokasi Tabungan',
  'Pembayaran Hutang',
  'Pemberian & Sedekah',
  'Lain-lain',
];

export const INCOME_CATEGORIES = [
  'Gaji Bulanan',
  'Usaha Sampingan',
  'Bonus & THR',
  'Hasil Investasi',
  'Penerimaan Piutang',
  'Pencairan Tabungan',
  'Hadiah & Lainnya',
];

export const WALLET_OPTIONS = [
  'Tunai / Cash',
  'Bank BCA',
  'Bank Mandiri',
  'Bank BRI',
  'Bank BNI',
  'Bank Jago / Seabank',
  'GoPay / OVO / Dana',
  'Rekening Bersama',
  'Lainnya',
];

export const BUSINESS_INCOME_CATEGORIES = [
  'Jasa Layanan & Freelance',
  'Karya, Seni & Kerajinan Hobi',
  'Penjualan Produk & Jualan Online',
  'Pendapatan Proyek & Desain',
  'Konten Kreator & Kursus Hobi',
  'Hasil Tanaman / Hewan Hobi',
  'Komisi, Afiliasi & Hadiah Lomba',
  'Penerimaan Piutang Sampingan',
  'Pendapatan Lain-lain Sampingan/Hobi',
];

export const BUSINESS_EXPENSE_CATEGORIES = [
  'Bahan Baku & Perlengkapan Hobi',
  'Alat, Perkakas & Gadget Hobi',
  'Stok Barang & Dagangan',
  'Biaya Pengiriman, Kurir & Ongkir',
  'Kursus, Workshop & Komunitas Hobi',
  'Pemasaran & Iklan Medsos',
  'Peralatan & Software Penunjang',
  'Prive / Setor ke Kas Rumah Tangga',
  'Biaya Operasional Sampingan Lainnya',
];

export const BUSINESS_WALLET_OPTIONS = [
  'Kas Sampingan & Hobi (Tunai)',
  'Rekening Khusus (BCA)',
  'Rekening Khusus (Mandiri)',
  'Rekening Khusus (BRI/BNI)',
  'QRIS / E-Wallet (GoPay/OVO/ShopeePay)',
  'Saldo Toko Online / Marketplace',
  'Rekening Lainnya',
];
