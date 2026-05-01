import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import type { Locale } from '@/i18n/config';
import { saveToolEntry, deleteToolEntry } from '../actions';

type TemplateField = { key: string; label: { he: string; en: string }; type: 'text' | 'textarea' };

export default async function ToolPage({
  params,
}: {
  params: { locale: string; toolId: string };
}) {
  const locale = params.locale as Locale;
  const user = await requireUser(locale);
  const t = await getTranslations('toolbox');

  const tool = await prisma.tool.findFirst({
    where: {
      id: params.toolId,
      OR: [{ organizationId: null }, { organizationId: user.organizationId }],
    },
  });
  if (!tool) notFound();

  const fields = parseTemplate(tool.templateSchema);
  const submissions = await prisma.toolSubmission.findMany({
    where: { userId: user.id, toolId: tool.id },
    orderBy: { savedAt: 'desc' },
  });

  const save = saveToolEntry.bind(null, locale);
  const remove = deleteToolEntry.bind(null, locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{locale === 'he' ? tool.titleHe : tool.titleEn}</h1>
      {(locale === 'he' ? tool.descriptionHe : tool.descriptionEn) ? (
        <p className="text-slate-600">{locale === 'he' ? tool.descriptionHe : tool.descriptionEn}</p>
      ) : null}

      <form action={save} className="space-y-4 rounded border bg-white p-5">
        <input type="hidden" name="toolId" value={tool.id} />
        <label className="block">
          <span className="text-sm">{t('saveLabel')}</span>
          <input
            name="title"
            required
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-sm">{locale === 'he' ? f.label.he : f.label.en}</span>
            {f.type === 'textarea' ? (
              <textarea
                name={`field:${f.key}`}
                rows={4}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              />
            ) : (
              <input
                name={`field:${f.key}`}
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              />
            )}
          </label>
        ))}

        <div className="flex justify-end">
          <button className="rounded bg-brand-600 px-4 py-2 text-sm text-white">{t('save')}</button>
        </div>
      </form>

      <section className="rounded border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">{t('history')}</h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-slate-500">—</p>
        ) : (
          <ul className="space-y-3">
            {submissions.map((s) => (
              <li key={s.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{s.title}</span>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{new Date(s.savedAt).toLocaleString(locale)}</span>
                    <form action={remove}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="toolId" value={tool.id} />
                      <button className="text-red-600 hover:underline">{t('delete')}</button>
                    </form>
                  </div>
                </div>
                <dl className="mt-2 grid gap-2 text-sm">
                  {fields.map((f) => {
                    const val = (s.content as Record<string, string>)?.[f.key];
                    if (!val) return null;
                    return (
                      <div key={f.key}>
                        <dt className="text-xs text-slate-500">
                          {locale === 'he' ? f.label.he : f.label.en}
                        </dt>
                        <dd className="whitespace-pre-wrap">{val}</dd>
                      </div>
                    );
                  })}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function parseTemplate(raw: unknown): TemplateField[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is TemplateField => {
    if (!f || typeof f !== 'object') return false;
    const o = f as Record<string, unknown>;
    return (
      typeof o.key === 'string' &&
      (o.type === 'text' || o.type === 'textarea') &&
      typeof o.label === 'object' &&
      o.label !== null &&
      typeof (o.label as Record<string, unknown>).he === 'string' &&
      typeof (o.label as Record<string, unknown>).en === 'string'
    );
  });
}
