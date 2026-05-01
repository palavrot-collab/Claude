import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { currentPeriod } from '@/lib/period';
import { TrendChart } from '@/components/TrendChart';
import type { Locale } from '@/i18n/config';

export default async function EvaluationListPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const user = await requireUser(locale);
  const t = await getTranslations('evaluation');

  const period = currentPeriod();
  const [history, currentForPeriod] = await Promise.all([
    prisma.assessment.findMany({
      where: { userId: user.id },
      orderBy: { period: 'asc' },
      include: { answers: { include: { competency: true } } },
    }),
    prisma.assessment.findUnique({ where: { userId_period: { userId: user.id, period } } }),
  ]);

  const periods = history.map((h) => h.period);
  const series = buildSeries(history, locale);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {!currentForPeriod && (
          <Link
            href={`/${locale}/evaluation/new`}
            className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            {t('newPeriod', { period })}
          </Link>
        )}
      </div>

      <section className="rounded border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">{t('trend')}</h2>
        {series.length === 0 ? (
          <p className="text-sm text-slate-500">{t('noHistory')}</p>
        ) : (
          <TrendChart series={series} periods={periods} />
        )}
      </section>

      <section className="rounded border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">{t('history')}</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">{t('noHistory')}</p>
        ) : (
          <ul className="space-y-3">
            {[...history].reverse().map((a) => {
              const avg = a.answers.length
                ? (a.answers.reduce((s, x) => s + x.score, 0) / a.answers.length).toFixed(2)
                : '—';
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between border-t pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="font-medium">{a.period}</span>
                  <span className="text-sm text-slate-500">
                    {new Date(a.submittedAt).toLocaleDateString(locale)} · avg {avg}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function buildSeries(
  history: Array<{
    period: string;
    answers: Array<{ competencyId: string; score: number; competency: { nameHe: string; nameEn: string } }>;
  }>,
  locale: Locale,
): Array<{ id: string; name: string; scores: number[] }> {
  const map = new Map<string, { id: string; name: string; scores: number[] }>();
  for (const a of history) {
    for (const ans of a.answers) {
      const name = locale === 'he' ? ans.competency.nameHe : ans.competency.nameEn;
      const s = map.get(ans.competencyId) ?? { id: ans.competencyId, name, scores: [] };
      s.scores.push(ans.score);
      map.set(ans.competencyId, s);
    }
  }
  return [...map.values()];
}
