import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/i18n/config';
import { upsertTool, deleteTool } from './actions';

export default async function ToolsAdminPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const admin = await requireAdmin(locale);
  const t = await getTranslations('admin');

  const tools = await prisma.tool.findMany({
    where: { OR: [{ organizationId: null }, { organizationId: admin.organizationId }] },
    orderBy: { createdAt: 'asc' },
  });

  const upsert = upsertTool.bind(null, locale);
  const remove = deleteTool.bind(null, locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('tools')}</h1>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">{t('addTool')}</h2>
        <form action={upsert} className="grid gap-3 md:grid-cols-2">
          <Input name="key" label={t('key')} required />
          <Input name="fileUrl" label={`${t('url')} (file)`} />
          <Input name="titleHe" label="כותרת (עברית)" required />
          <Input name="titleEn" label="Title (English)" required />
          <Input name="descriptionHe" label="תיאור (עברית)" />
          <Input name="descriptionEn" label="Description (English)" />
          {admin.role === 'SUPERADMIN' && (
            <label className="block text-sm">
              <span className="text-slate-600">Scope</span>
              <select
                name="scope"
                defaultValue="org"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="org">Organization</option>
                <option value="global">Global</option>
              </select>
            </label>
          )}
          <label className="md:col-span-2 block text-sm">
            <span className="text-slate-600">{t('templateSchemaJson')}</span>
            <textarea
              name="templateSchemaJson"
              rows={6}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
              placeholder='[{"key":"wins","label":{"he":"הישגים","en":"Wins"},"type":"textarea"}]'
            />
            <span className="mt-1 block text-xs text-slate-500">{t('templateSchemaHelp')}</span>
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button className="rounded bg-brand-600 px-4 py-2 text-sm text-white">{t('save')}</button>
          </div>
        </form>
      </section>

      <section className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <Th>{t('key')}</Th>
              <Th>שם</Th>
              <Th>Scope</Th>
              <Th>{t('delete')}</Th>
            </tr>
          </thead>
          <tbody>
            {tools.map((tool) => (
              <tr key={tool.id} className="border-t">
                <Td>{tool.key}</Td>
                <Td>{tool.titleHe}</Td>
                <Td>{tool.organizationId ? 'org' : 'global'}</Td>
                <Td>
                  <form action={remove}>
                    <input type="hidden" name="id" value={tool.id} />
                    <button className="text-red-600 hover:underline">{t('delete')}</button>
                  </form>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Input({
  name,
  label,
  type = 'text',
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-start font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2">{children}</td>;
}
