import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  CreditCard, 
  PiggyBank, 
  FileText, 
  Target, 
  Sparkles, 
  Shield, 
  Briefcase,
  Database,
  ExternalLink,
  Lock
} from 'lucide-react';

export type NavTab = 'dashboard' | 'transactions' | 'debts' | 'business' | 'savings' | 'reports';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenBudgetModal: () => void;
  onOpenSupabaseModal?: () => void;
  onSeedDemoData?: () => void;
  onLockApp?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenBudgetModal,
  onOpenSupabaseModal,
  onSeedDemoData,
  onLockApp,
}) => {
  const menuItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard Ikhtisar', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi Rumah Tangga', icon: ArrowLeftRight },
    { id: 'debts', label: 'Buku Pembantu Hutang', icon: CreditCard, badge: 'Ledger' },
    { id: 'business', label: 'Sampingan & Hobi', icon: Sparkles, badge: 'Hobi' },
    { id: 'savings', label: 'Pos Tabungan', icon: PiggyBank },
    { id: 'reports', label: 'Laporan Bulanan', icon: FileText, badge: 'Otomatis' },
  ];

  return (
    <aside className="w-full md:w-64 bg-gradient-to-b from-[#e87a38] via-[#e27332] to-[#da6a29] md:border-r border-b md:border-b-0 border-orange-300/30 p-3 md:p-4 flex md:flex-col justify-between shrink-0 overflow-x-auto md:overflow-visible text-white shadow-md shadow-orange-950/5">
      {/* Navigation Links */}
      <div className="flex md:flex-col gap-1.5 w-full">
        <div className="hidden md:block px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-orange-100/90">
          Menu Utama
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-orange-600 font-extrabold shadow-sm translate-x-0.5'
                  : 'text-orange-50 hover:text-white hover:bg-white/15 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'text-orange-600' : 'text-orange-100'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`hidden lg:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  isActive 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-white/20 text-white border border-white/25'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom actions & shortcuts */}
      <div className="hidden md:flex flex-col gap-3 pt-4 border-t border-white/20">
        
        {/* Quick Budget Limit CTA */}
        <div className="p-3.5 rounded-2xl bg-white/15 border border-white/25 shadow-xs text-white">
          <div className="flex items-center gap-2 text-xs font-bold text-white mb-1">
            <Target className="w-4 h-4 text-amber-100" />
            <span>Target Anggaran</span>
          </div>
          <p className="text-[11px] text-orange-50 mb-2.5 leading-relaxed">
            Atur batas pengeluaran bulanan agar tidak overbudget.
          </p>
          <button
            onClick={onOpenBudgetModal}
            className="w-full text-center py-2 px-2.5 rounded-xl bg-white hover:bg-amber-50 text-orange-800 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            Atur Batas Anggaran
          </button>
        </div>

        {/* Database & Supabase CTA badge */}
        {onOpenSupabaseModal ? (
          <button
            onClick={onOpenSupabaseModal}
            className="text-left p-2.5 rounded-xl bg-black/10 hover:bg-black/15 border border-white/20 text-[11px] text-orange-50 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-100" />
                Koneksi Supabase
              </span>
              <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-semibold text-white">
                Buka
              </span>
            </div>
            <p className="text-[10px] text-orange-100/90 leading-tight">
              Panduan integrasi & skrip SQL DDL untuk Supabase PostgreSQL.
            </p>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/10 border border-white/20 text-[11px] text-orange-50">
            <Shield className="w-3.5 h-3.5 text-amber-100 shrink-0" />
            <span>Data tersimpan aman di PostgreSQL Database.</span>
          </div>
        )}

        {/* Optional Seed Sample Data CTA if empty */}
        {onSeedDemoData && (
          <button
            onClick={onSeedDemoData}
            className="flex items-center justify-center gap-1.5 py-2 px-2 text-[11px] text-orange-100 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer font-medium border border-white/20"
          >
            <Sparkles className="w-3 h-3 text-amber-100" />
            <span>Muat Data Contoh Keluarga</span>
          </button>
        )}

        {/* Lock Screen Button */}
        {onLockApp && (
          <button
            onClick={onLockApp}
            className="flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl bg-black/20 hover:bg-black/30 border border-white/20 text-xs font-bold text-amber-200 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Kunci Layar (PIN)</span>
          </button>
        )}
      </div>
    </aside>
  );
};
