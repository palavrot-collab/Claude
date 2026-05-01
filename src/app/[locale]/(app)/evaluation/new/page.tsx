import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { currentPeriod } from '@/lib/period';
import type { Locale } from '@/i18n/config';
import { submitEvaluation } from './actions';

export default async function NewEvaluationPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const user = await requireUser(locale);
  const t = await getTranslations('evaluation');

  const period = currentPeriod();
  const existing = await prisma.assessment.findUnique({
    where: { userId_period: { userId: user.id, period } },
  });
  if (existing) redirect(`/${locale}/evaluation`);

  const competencies = await prisma.competency.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { order: 'asc' },
  });

  // Last evaluation, used for side-by-side comparison.
  const previous = await prisma.assessment.findFirst({
    where: { userId: user.id },
    orderBy: { period: 'desc' },
    include: { answers: true },
  });
  const prevByCompetency = new Map(previous?.answers.map((a) => [a.competencyId, a.score]) ?? []);

  const action = submitEvaluation.bind(null, locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('newPeriod', { period })}</h1>
      <form action={action} className="space-y-4">
        {competencies.map((c) => {
          const prev = prevByCompetency.get(c.id);
          return (
            <fieldset key={c.id} className="rounded border bg-white p-4">
              <legend className="px-2 text-sm font-medium">
                {locale === 'he' ? c.nameHe : c.nameEn}
              </legend>
              {(locale === 'he' ? c.descriptionHe : c.descriptionEn) ? (
                <p className="mb-2 text-xs text-slate-500">
                  {locale === 'he' ? c.descriptionHe : c.descriptionEn}
                </p>
              ) : null}
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600">{t('scoreLabel')}</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`score:${c.id}`}
                        value={n}
                        required
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded border text-sm peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:text-brand-700">
                        {n}
                      </span>
                    </label>
                  ))}
                </div>
                {prev !== undefined && (
                  <span className="ms-3 text-xs text-slate-500">
                    {t('comparePrev')}: {prev}
                  </span>
                )}
              </div>
              <label className="mt-3 block text-sm">
                <span className="text-slate-600">{t('noteLabel')}</span>
                <textarea
                  name={`note:${c.id}`}
                  rows={2}
                  className="mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm"
                />
              </label>
            </fieldset>
          );
        })}

        <label className="block">
          <span className="text-sm text-slate-600">{t('noteLabel')}</span>
          <textarea
            name="notes"
            rows={3}
            className="mt-1 block w-full rounded border border-slate-300 px-2 py-1"
          />
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          >
            {t('submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
