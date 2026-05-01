import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/config';

const items = [
  { href: '', key: 'home' as const },
  { href: '/evaluation', key: 'evaluation' as const },
  { href: '/library', key: 'library' as const },
  { href: '/toolbox', key: 'toolbox' as const },
];

export function Nav({ locale, userName }: { locale: Locale; userName: string }) {
  const t = useTranslations('nav');
  const tApp = useTranslations('app');
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href={`/${locale}`} className="text-lg font-semibold text-brand-700">
          {tApp('name')}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {items.map((it) => (
            <Link key={it.key} href={`/${locale}${it.href}`} className="text-slate-700 hover:text-brand-700">
              {t(it.key)}
            </Link>
          ))}
          <span className="text-slate-400">|</span>
          <Link href={`/${locale === 'he' ? 'en' : 'he'}`} className="text-slate-500 hover:text-slate-900">
            {locale === 'he' ? 'EN' : 'עב'}
          </Link>
          <span className="text-slate-500">{userName}</span>
        </nav>
      </div>
    </header>
  );
}
