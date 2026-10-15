'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

const links = [
  { href: '/',            icon: '🧵', label: 'Embroidery Simulator', short: 'Simulator' },
  { href: '/design-area', icon: '🎯', label: 'Design Area Detection', short: 'Design Area' },
  { href: '/cuecase',     icon: '🎱', label: 'Cue Case Configurator', short: 'Cue Case' },
];

type Theme = 'dark' | 'light';

// The theme lives on <html data-theme>, set before paint by the inline script in layout.tsx.
function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
}
const getTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
const getServerTheme = (): Theme => 'dark';

export default function Navigation() {
  const pathname = usePathname();
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* private mode */ }
  };

  return (
    <nav className="themed sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-gray-200 flex items-center gap-2 px-3 sm:px-6 h-12 shrink-0">
      <span className="text-sm sm:text-base font-extrabold text-indigo-600 whitespace-nowrap mr-1 sm:mr-4">jb888 Studio</span>

      <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {links.map(({ href, icon, label, short }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={pathname === href ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 shrink-0 px-2.5 sm:px-3 h-9 text-sm font-medium rounded-lg transition-colors
              ${pathname === href
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            <span aria-hidden>{icon}</span>
            <span className="hidden sm:inline lg:hidden">{short}</span>
            <span className="hidden lg:inline">{label}</span>
            {pathname === href && <span className="sm:hidden">{short}</span>}
          </Link>
        ))}
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </nav>
  );
}
