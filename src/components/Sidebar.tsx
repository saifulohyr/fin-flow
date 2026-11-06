'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowUpDown,
  Wallet,
  PieChart,
  BadgePercent,
  PiggyBank,
  Repeat2,
  MessageSquare,
} from 'lucide-react';

const menuItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transaksi', icon: ArrowUpDown },
  { href: '/accounts', label: 'Rekening', icon: Wallet },
  { href: '/budget', label: 'Anggaran', icon: PieChart },
  { href: '/debts', label: 'Utang', icon: BadgePercent },
  { href: '/goals', label: 'Tabungan', icon: PiggyBank },
  { href: '/recurring', label: 'Rutin', icon: Repeat2 },
  { href: '/ai-chat', label: 'AI Chat', icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] border-r bg-[#FAF9F5] flex flex-col gap-1 p-4">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
