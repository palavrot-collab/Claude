import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/session';
import type { Locale } from '@/i18n/config';

const items = [
  { href: '', key: 'overview' as const },
  { href: '/competencies', key: 'competencies' as const },
  { href: '/materials', key: 'materials' as const },
  { href: '/tools', key: 'tools' as const },
  { href: '/users', key: 'users' as const },
  { href: '/reports', key: 'reports' as const },
];

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  await requireAdmin(locale);
  const t = await getTranslations('admin');
  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <aside className="space-y-1">
        <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('title')}
        </h2>
        {items.map((it) => (
          <Link
            key={it.key}
            href={`/${locale}/admin${it.href}`}
            className="block rounded px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            {t(it.key)}
          </Link>
        ))}
      </aside>
      <div>{children}</div>
    </div>
  );
}
