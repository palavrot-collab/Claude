import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import type { Locale } from '@/i18n/config';
import { saveToolEntry } from '../actions';

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

  const fields: TemplateField[] =
    (Array.isArray(tool.templateSchema) ? (tool.templateSchema as unknown as TemplateField[]) : []) ?? [];

  const action = saveToolEntry.bind(null, locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{locale === 'he' ? tool.titleHe : tool.titleEn}</h1>
      {(locale === 'he' ? tool.descriptionHe : tool.descriptionEn) ? (
        <p className="text-slate-600">{locale === 'he' ? tool.descriptionHe : tool.descriptionEn}</p>
      ) : null}

      <form action={action} className="space-y-4 rounded border bg-white p-5">
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
    </div>
  );
}
