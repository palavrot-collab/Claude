import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { currentPeriod } from '@/lib/period';
import type { Locale } from '@/i18n/config';

export default async function HomePage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const user = await requireUser(locale);
  const t = await getTranslations('home');

  const period = currentPeriod();
  const [existingForPeriod, allMaterials, completedMaterials, recentSubmissions] = await Promise.all([
    prisma.assessment.findUnique({ where: { userId_period: { userId: user.id, period } } }),
    prisma.material.count({
      where: { OR: [{ organizationId: null }, { organizationId: user.organizationId }] },
    }),
    prisma.materialProgress.count({
      where: { userId: user.id, status: 'COMPLETED' },
    }),
    prisma.toolSubmission.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      include: { tool: true },
    }),
  ]);

  const recommended = await prisma.material.findMany({
    where: {
      OR: [{ organizationId: null }, { organizationId: user.organizationId }],
      progress: { none: { userId: user.id, status: 'COMPLETED' } },
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

  const progressPct = allMaterials === 0 ? 0 : Math.round((completedMaterials / allMaterials) * 100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('welcome', { name: user.name })}</h1>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">{t('myJourney')}</h2>
        <div className="flex items-center gap-4">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-brand-500"
              style={{ width: `${progressPct}%` }}
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
          <span className="w-14 text-end text-sm font-medium">{progressPct}%</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{t('progress')}</p>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">{t('nextEval')}</h2>
        {existingForPeriod ? (
          <p className="text-sm text-slate-600">{t('noUpcoming')}</p>
        ) : (
          <Link
            href={`/${locale}/evaluation/new`}
            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {t('startEval')} ({period})
          </Link>
        )}
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">{t('recommended')}</h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {recommended.map((m) => (
            <li key={m.id} className="rounded border p-3">
              <p className="text-sm font-medium">{locale === 'he' ? m.titleHe : m.titleEn}</p>
              <Link className="mt-2 inline-block text-sm text-brand-700" href={`/${locale}/library`}>
                ←
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">{t('quickTools')}</h2>
        <ul className="space-y-2">
          {recentSubmissions.map((s) => (
            <li key={s.id} className="text-sm">
              <Link href={`/${locale}/toolbox`} className="text-brand-700 hover:underline">
                {s.title}
              </Link>
              <span className="text-slate-500"> — {locale === 'he' ? s.tool.titleHe : s.tool.titleEn}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
