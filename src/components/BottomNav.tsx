'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowUpDown,
  Wallet,
  MessageSquare,
  Grid2X2,
  PieChart,
  BadgePercent,
  PiggyBank,
  Repeat2,
  X,
} from 'lucide-react';

const mainTabs = [
  { href: '/', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transaksi', icon: ArrowUpDown },
  { href: '/accounts', label: 'Rekening', icon: Wallet },
  { href: '/ai-chat', label: 'AI Chat', icon: MessageSquare },
];

const moreFeatures = [
  {
    href: '/budget',
    label: 'Anggaran',
    desc: 'Batas & alokasi bulanan',
    icon: PieChart,
  },
  {
    href: '/debts',
    label: 'Utang & Cicilan',
    desc: 'Tracking saldo & payoff',
    icon: BadgePercent,
  },
  {
    href: '/goals',
    label: 'Target Tabungan',
    desc: 'Sinking funds & progres',
    icon: PiggyBank,
  },
  {
    href: '/recurring',
    label: 'Biaya Rutin',
    desc: 'Tagihan & proyeksi 30 hari',
    icon: Repeat2,
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isMoreActive = moreFeatures.some((f) => f.href === pathname);

  return (
    <>
      {/* Slide-up Sheet for Additional Menus */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="relative bg-[#FAF9F5] border-t border-stone-300 rounded-t-2xl p-5 shadow-2xl max-w-lg mx-auto w-full z-10 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
                  Menu Keuangan
                </h3>
                <p className="text-xs text-stone-500">
                  Pilih fitur untuk berpindah halaman langsung
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-3.5">
              {moreFeatures.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex flex-col p-3 rounded-lg border transition-all text-left ${
                      isActive
                        ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950 font-medium'
                        : 'border-stone-200 bg-white hover:border-stone-400 text-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-emerald-700 text-white'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold leading-tight line-clamp-1">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500 leading-tight">
                      {item.desc}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Navigation Bar on Mobile */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF9F5] border-t border-stone-300 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
      >
        <div className="grid grid-cols-5 h-15 max-w-lg mx-auto items-stretch px-1">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
                  isActive
                    ? 'text-emerald-800 font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <div
                  className={`p-1 rounded-md transition-colors ${
                    isActive ? 'bg-emerald-100/70 text-emerald-800' : ''
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] tracking-tight leading-none">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* 5th Tab: Menu / Lainnya */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
              isMoreActive || isMenuOpen
                ? 'text-emerald-800 font-semibold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <div
              className={`p-1 rounded-md transition-colors ${
                isMoreActive || isMenuOpen
                  ? 'bg-emerald-100/70 text-emerald-800'
                  : ''
              }`}
            >
              <Grid2X2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[10px] tracking-tight leading-none">
              Fitur
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
