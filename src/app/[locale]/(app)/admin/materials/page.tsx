import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/i18n/config';
import { upsertMaterial, deleteMaterial } from './actions';

export default async function MaterialsAdminPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  const admin = await requireAdmin(locale);
  const t = await getTranslations('admin');

  const materials = await prisma.material.findMany({
    where: { OR: [{ organizationId: null }, { organizationId: admin.organizationId }] },
    orderBy: [{ stage: 'asc' }, { createdAt: 'desc' }],
  });

  const upsert = upsertMaterial.bind(null, locale);
  const remove = deleteMaterial.bind(null, locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('materials')}</h1>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">{t('addMaterial')}</h2>
        <form action={upsert} className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-600">{t('type')}</span>
            <select
              name="type"
              required
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              defaultValue="ARTICLE"
            >
              <option value="VIDEO">VIDEO</option>
              <option value="ARTICLE">ARTICLE</option>
              <option value="PODCAST">PODCAST</option>
              <option value="PDF">PDF</option>
            </select>
          </label>
          <Input name="stage" label={t('stage')} type="number" defaultValue="1" />
          <Input name="titleHe" label="כותרת (עברית)" required />
          <Input name="titleEn" label="Title (English)" required />
          <Input name="descriptionHe" label="תיאור (עברית)" />
          <Input name="descriptionEn" label="Description (English)" />
          <Input name="url" label={t('url')} type="url" required />
          <Input name="tags" label={`${t('tags')} (csv)`} />
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
          <div className="md:col-span-2 flex justify-end">
            <button className="rounded bg-brand-600 px-4 py-2 text-sm text-white">{t('save')}</button>
          </div>
        </form>
      </section>

      <section className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <Th>{t('type')}</Th>
              <Th>{t('stage')}</Th>
              <Th>שם</Th>
              <Th>{t('tags')}</Th>
              <Th>Scope</Th>
              <Th>{t('delete')}</Th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id} className="border-t">
                <Td>{m.type}</Td>
                <Td>{m.stage}</Td>
                <Td>{m.titleHe}</Td>
                <Td className="text-slate-500">{m.tags.join(', ')}</Td>
                <Td>{m.organizationId ? 'org' : 'global'}</Td>
                <Td>
                  <form action={remove}>
                    <input type="hidden" name="id" value={m.id} />
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

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className ?? ''}`}>{children}</td>;
}
