import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/i18n/config';

export default async function ToolboxPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const user = await requireUser(locale);
  const t = await getTranslations('toolbox');

  const [tools, submissions] = await Promise.all([
    prisma.tool.findMany({
      where: { OR: [{ organizationId: null }, { organizationId: user.organizationId }] },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.toolSubmission.findMany({
      where: { userId: user.id },
      include: { tool: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <ul className="grid gap-4 md:grid-cols-2">
        {tools.map((tool) => (
          <li key={tool.id} className="rounded border bg-white p-4">
            <h3 className="text-base font-medium">{locale === 'he' ? tool.titleHe : tool.titleEn}</h3>
            {(locale === 'he' ? tool.descriptionHe : tool.descriptionEn) ? (
              <p className="mt-1 text-sm text-slate-600">
                {locale === 'he' ? tool.descriptionHe : tool.descriptionEn}
              </p>
            ) : null}
            <div className="mt-3 flex gap-2 text-sm">
              <Link
                href={`/${locale}/toolbox/${tool.id}`}
                className="rounded bg-brand-600 px-3 py-1 text-xs text-white"
              >
                {t('open')}
              </Link>
              {tool.fileUrl && (
                <a
                  href={tool.fileUrl}
                  className="rounded border px-3 py-1 text-xs text-slate-700"
                >
                  {t('download')}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      <section className="rounded border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">{t('myItems')}</h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-slate-500">—</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {submissions.map((s) => (
              <li key={s.id} className="flex items-center justify-between border-t pt-2 first:border-t-0 first:pt-0">
                <span className="font-medium">{s.title}</span>
                <span className="text-slate-500">
                  {locale === 'he' ? s.tool.titleHe : s.tool.titleEn} ·{' '}
                  {new Date(s.savedAt).toLocaleDateString(locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
