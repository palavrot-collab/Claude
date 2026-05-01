import { getTranslations } from 'next-intl/server';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/i18n/config';
import { toggleMaterial } from './actions';

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { tag?: string };
}) {
  const locale = params.locale as Locale;
  const user = await requireUser(locale);
  const t = await getTranslations('library');

  const tagFilter = searchParams.tag;

  const materials = await prisma.material.findMany({
    where: {
      OR: [{ organizationId: null }, { organizationId: user.organizationId }],
      ...(tagFilter ? { tags: { has: tagFilter } } : {}),
    },
    include: { progress: { where: { userId: user.id } } },
    orderBy: [{ stage: 'asc' }, { createdAt: 'desc' }],
  });

  const allTags = [...new Set(materials.flatMap((m) => m.tags))].sort();
  const action = toggleMaterial.bind(null, locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <a
          href={`/${locale}/library`}
          className={`rounded-full border px-3 py-1 ${!tagFilter ? 'border-brand-600 bg-brand-50 text-brand-700' : 'text-slate-600'}`}
        >
          {t('filterAll')}
        </a>
        {allTags.map((tag) => (
          <a
            key={tag}
            href={`/${locale}/library?tag=${encodeURIComponent(tag)}`}
            className={`rounded-full border px-3 py-1 ${tagFilter === tag ? 'border-brand-600 bg-brand-50 text-brand-700' : 'text-slate-600'}`}
          >
            #{tag}
          </a>
        ))}
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {materials.map((m) => {
          const p = m.progress[0];
          const completed = p?.status === 'COMPLETED';
          const favorite = p?.favorite ?? false;
          return (
            <li key={m.id} className="rounded border bg-white p-4">
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>{t('stage', { n: m.stage })}</span>
                <span className="uppercase">{m.type}</span>
              </div>
              <h3 className="text-base font-medium">{locale === 'he' ? m.titleHe : m.titleEn}</h3>
              {(locale === 'he' ? m.descriptionHe : m.descriptionEn) ? (
                <p className="mt-1 text-sm text-slate-600">
                  {locale === 'he' ? m.descriptionHe : m.descriptionEn}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded bg-brand-600 px-3 py-1 text-xs text-white"
                >
                  {t('open')}
                </a>
                <form action={action}>
                  <input type="hidden" name="materialId" value={m.id} />
                  <input type="hidden" name="field" value="complete" />
                  <button
                    className={`rounded border px-3 py-1 text-xs ${completed ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'text-slate-700'}`}
                  >
                    {completed ? '✓ ' : ''}
                    {t('markComplete')}
                  </button>
                </form>
                <form action={action}>
                  <input type="hidden" name="materialId" value={m.id} />
                  <input type="hidden" name="field" value="favorite" />
                  <button
                    className={`rounded border px-3 py-1 text-xs ${favorite ? 'border-amber-500 bg-amber-50 text-amber-700' : 'text-slate-700'}`}
                  >
                    {favorite ? '★ ' : '☆ '}
                    {t('markFavorite')}
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
