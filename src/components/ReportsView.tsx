import React, { useMemo } from 'react';
import { 
  Printer, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PiggyBank, 
  PieChart, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Archive,
  Sparkles
} from 'lucide-react';
import { MonthlyReportResponse, MonthlyReportRecord } from '../types/index.ts';
import { formatRupiah, formatMonthIndo } from '../utils/format.ts';

interface ReportsViewProps {
  currentPeriod: string;
  onPeriodChange: (period: string) => void;
  reportData: MonthlyReportResponse | null;
  historyReports: MonthlyReportRecord[];
  loading: boolean;
  onRefreshReport: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentPeriod,
  onPeriodChange,
  reportData,
  historyReports,
  loading,
  onRefreshReport,
}) => {
  const periods = useMemo(() => {
    const list: string[] = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      list.push(`${y}-${m}`);
    }
    return list;
  }, []);

  const metrics = reportData?.metrics;
  const isSurplus = (metrics?.netCashflow || 0) >= 0;

  // Print report trigger
  const handlePrint = () => {
    window.print();
  };

  // Export report summary as CSV
  const handleExportCSV = () => {
    if (!reportData) return;

    const rows: string[] = [];
    rows.push(`LAPORAN KEUANGAN BULANAN - KELUARGAFIN`);
    rows.push(`Periode,${currentPeriod} (${formatMonthIndo(currentPeriod)})`);
    rows.push(`Status Kesehatan Finansial,${metrics?.statusSummary || '-'}`);
    rows.push(`Catatan Analisis,"${(metrics?.evaluationNotes || '').replace(/"/g, '""')}"`);
    rows.push('');
    rows.push('RINGKASAN INDIKATOR UTAMA');
    rows.push(`Total Penerimaan (Rp),${metrics?.totalIncome || 0}`);
    rows.push(`Total Pengeluaran (Rp),${metrics?.totalExpense || 0}`);
    rows.push(`Arus Kas Bersih (Rp),${metrics?.netCashflow || 0}`);
    rows.push(`Alokasi Pos Tabungan (Rp),${metrics?.savingsDeposited || 0}`);
    rows.push(`Pembayaran Hutang (Rp),${metrics?.debtPaid || 0}`);
    rows.push(`Rasio Tabungan (%),${metrics?.savingsRate || 0}%`);
    rows.push('');
    rows.push('RINCIAN PENGELUARAN PER KATEGORI');
    rows.push('Kategori,Nominal (Rp),Persentase (%),Jumlah Transaksi');
    reportData.expenseBreakdown.forEach(e => {
      rows.push(`"${e.category}",${e.amount},${e.percentage}%,${e.count}`);
    });
    rows.push('');
    rows.push('RINCIAN PENERIMAAN PER KATEGORI');
    rows.push('Kategori,Nominal (Rp),Persentase (%),Jumlah Transaksi');
    reportData.incomeBreakdown.forEach(i => {
      rows.push(`"${i.category}",${i.amount},${i.percentage}%,${i.count}`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `laporan_keuangan_${currentPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get status badge styling
  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'Sangat Sehat':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: Sparkles,
        };
      case 'Sehat':
        return {
          bg: 'bg-teal-100 text-teal-800 border-teal-300',
          icon: CheckCircle2,
        };
      case 'Waspada':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: AlertTriangle,
        };
      case 'Defisit':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: AlertTriangle,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: Clock,
        };
    }
  };

  const statusConfig = getStatusBadge(metrics?.statusSummary);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-blue-950 tracking-tight">
              Laporan Keuangan Bulanan
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Archive className="w-3 h-3 text-emerald-600" />
              Otomatis Tersimpan
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Hasil kalkulasi otomatis arus kas, rasio tabungan, dan rekam jejak finansial bulanan
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-white border border-amber-200/80 rounded-xl px-3 py-2 text-xs text-blue-950 font-bold shadow-sm">
            <Calendar className="w-4 h-4 text-orange-600" />
            <select
              value={currentPeriod}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-blue-950 focus:outline-none cursor-pointer"
            >
              {periods.map(p => (
                <option key={p} value={p}>
                  {formatMonthIndo(p)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onRefreshReport}
            className="p-2 rounded-xl bg-white hover:bg-amber-50 text-slate-700 border border-amber-200/80 transition-colors cursor-pointer shadow-sm"
            title="Muat ulang kalkulasi"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : 'text-slate-600'}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-700 border border-amber-200/80 text-xs font-bold transition-colors cursor-pointer shadow-sm"
            title="Unduh format CSV"
          >
            <Download className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden md:inline">Ekspor CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold shadow-md shadow-orange-950/20 transition-all cursor-pointer"
            title="Cetak atau Simpan sebagai PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Header (only visible when printing) */}
      <div className="hidden print-only text-black pb-4 border-b border-black mb-6">
        <h1 className="text-2xl font-black">KeluargaFin - Laporan Keuangan Rumah Tangga</h1>
        <p className="text-sm font-semibold">Periode: {formatMonthIndo(currentPeriod)}</p>
        <p className="text-xs text-gray-600">Dicetak otomatis pada: {new Date().toLocaleString('id-ID')}</p>
      </div>

      {/* Main Analysis Card */}
      <div className="rounded-3xl bg-white border border-amber-200/80 p-6 md:p-8 shadow-sm space-y-6">
        
        {/* Status & Evaluation Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${statusConfig.bg}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-600">
                Status Kesehatan Finansial Periode {formatMonthIndo(currentPeriod)}
              </div>
              <div className="text-xl font-black text-blue-950 flex items-center gap-2 mt-0.5">
                <span>{metrics?.statusSummary || 'Belum Ada Transaksi'}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${statusConfig.bg}`}>
                  Rasio Tabungan: {metrics?.savingsRate || 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 self-end md:self-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tersimpan di Cloud SQL (ID #{reportData?.report?.id || 'live'})</span>
          </div>
        </div>

        {/* Evaluation Note Text */}
        {metrics?.evaluationNotes && (
          <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 text-slate-800 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-orange-800 text-xs uppercase tracking-wider mb-1">
                Catatan Analisis Otomatis
              </div>
              <p className="font-medium text-slate-700">{metrics.evaluationNotes}</p>
            </div>
          </div>
        )}

        {/* 4 Core Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Penerimaan</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-800">
              {formatRupiah(metrics?.totalIncome || 0)}
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-medium">
              Gaji, bonus, freelance, & usaha
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Pengeluaran</span>
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-700">
              {formatRupiah(metrics?.totalExpense || 0)}
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-medium">
              Belanja, tagihan, cicilan & konsumsi
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Arus Kas Bersih</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-2xl font-black ${isSurplus ? 'text-emerald-800' : 'text-rose-700'}`}>
              {isSurplus ? `+${formatRupiah(metrics?.netCashflow || 0)}` : formatRupiah(metrics?.netCashflow || 0)}
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-medium">
              {isSurplus ? 'Surplus dana tersisa' : 'Defisit (pengeluaran > pemasukan)'}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rasio Tabungan</span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center">
                <PiggyBank className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-950">
              {metrics?.savingsRate || 0}%
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-medium">
              Target ideal: ≥ 20% dari pemasukan
            </div>
          </div>

        </div>

      </div>

      {/* Row: Breakdown Pengeluaran & Penerimaan per Kategori */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pengeluaran per Kategori */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-rose-600" />
              <span>Komposisi Pengeluaran per Kategori</span>
            </h2>
            <span className="text-xs text-slate-600 font-bold">
              Total: {formatRupiah(metrics?.totalExpense || 0)}
            </span>
          </div>

          {reportData?.expenseBreakdown && reportData.expenseBreakdown.length > 0 ? (
            <div className="space-y-3">
              {reportData.expenseBreakdown.map((item, idx) => (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-blue-950">
                      {idx + 1}. {item.category}
                      <span className="text-slate-500 font-normal ml-1.5">({item.count} transaksi)</span>
                    </span>
                    <span className="font-black text-rose-700">
                      {formatRupiah(item.amount)}
                      <span className="text-slate-500 font-normal ml-1">({item.percentage}%)</span>
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-6 font-medium">
              Tidak ada catatan pengeluaran pada bulan ini.
            </p>
          )}
        </div>

        {/* Penerimaan per Kategori */}
        <div className="rounded-2xl bg-white border border-amber-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Sumber Penerimaan per Kategori</span>
            </h2>
            <span className="text-xs text-slate-600 font-bold">
              Total: {formatRupiah(metrics?.totalIncome || 0)}
            </span>
          </div>

          {reportData?.incomeBreakdown && reportData.incomeBreakdown.length > 0 ? (
            <div className="space-y-3">
              {reportData.incomeBreakdown.map((item, idx) => (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-blue-950">
                      {idx + 1}. {item.category}
                      <span className="text-slate-500 font-normal ml-1.5">({item.count} transaksi)</span>
                    </span>
                    <span className="font-black text-emerald-800">
                      {formatRupiah(item.amount)}
                      <span className="text-slate-500 font-normal ml-1">({item.percentage}%)</span>
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center py-6 font-medium">
              Tidak ada catatan penerimaan pada bulan ini.
            </p>
          )}
        </div>

      </div>

      {/* Row: Daily Flow Timeline */}
      {reportData?.dailyFlow && reportData.dailyFlow.length > 0 && (
        <div className="rounded-2xl bg-white border border-amber-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span>Aktivitas Arus Kas Harian ({formatMonthIndo(currentPeriod)})</span>
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                Pemasukan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                Pengeluaran
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {reportData.dailyFlow.map((day) => (
              <div key={day.date} className="flex items-center justify-between text-xs py-2 border-b border-amber-100 last:border-none">
                <span className="text-slate-700 font-bold w-28">
                  {day.date}
                </span>

                <div className="flex-1 mx-4 flex items-center gap-2 font-bold">
                  {day.income > 0 && (
                    <span className="text-emerald-800 text-[11px]">
                      +{formatRupiah(day.income)}
                    </span>
                  )}
                  {day.expense > 0 && (
                    <span className="text-rose-700 text-[11px]">
                      -{formatRupiah(day.expense)}
                    </span>
                  )}
                </div>

                <div className={`font-black text-right w-28 ${day.net >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                  {day.net >= 0 ? `+${formatRupiah(day.net)}` : formatRupiah(day.net)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row: Stored Reports History Table */}
      <div className="rounded-2xl bg-white border border-amber-200/80 p-6 shadow-sm space-y-4 no-print">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-blue-950 flex items-center gap-2">
              <Archive className="w-4 h-4 text-orange-600" />
              <span>Arsip Laporan Bulanan Tersimpan di Cloud SQL</span>
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              Rekam jejak evaluasi keuangan keluarga yang tersimpan permanen
            </p>
          </div>
        </div>

        {historyReports && historyReports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-100/70 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Periode</th>
                  <th className="py-3 px-4">Penerimaan</th>
                  <th className="py-3 px-4">Pengeluaran</th>
                  <th className="py-3 px-4">Arus Kas Bersih</th>
                  <th className="py-3 px-4">Rasio Tabungan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 text-slate-800">
                {historyReports.map((rec) => {
                  const net = parseFloat(rec.netCashflow);
                  const isCurrent = rec.period === currentPeriod;
                  return (
                    <tr key={rec.id} className={`hover:bg-amber-50/50 transition-colors ${isCurrent ? 'bg-orange-50/50' : ''}`}>
                      <td className="py-3.5 px-4 font-black text-blue-950">
                        <div className="flex items-center gap-2">
                          <span>{formatMonthIndo(rec.period)}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-bold">
                              Aktif
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-800 font-extrabold">
                        {formatRupiah(rec.totalIncome)}
                      </td>
                      <td className="py-3.5 px-4 text-rose-700 font-extrabold">
                        {formatRupiah(rec.totalExpense)}
                      </td>
                      <td className={`py-3.5 px-4 font-black ${net >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                        {net >= 0 ? `+${formatRupiah(net)}` : formatRupiah(net)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-bold">
                        {rec.savingsRate}%
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {rec.statusSummary || 'Tercatat'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onPeriodChange(rec.period)}
                          className="inline-flex items-center gap-1 text-orange-700 hover:text-orange-800 font-bold text-xs cursor-pointer"
                        >
                          <span>Buka Detail</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs font-medium">
            Belum ada arsip laporan tersimpan. Laporan bulanan akan otomatis disimpan saat Anda mencatat transaksi keuangan.
          </div>
        )}
      </div>

    </div>
  );
};
