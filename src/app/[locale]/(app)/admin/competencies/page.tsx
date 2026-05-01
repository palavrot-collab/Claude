import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/i18n/config';
import { upsertCompetency, deleteCompetency } from './actions';

export default async function CompetenciesAdminPage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  const admin = await requireAdmin(locale);
  const t = await getTranslations('admin');

  const competencies = await prisma.competency.findMany({
    where: { organizationId: admin.organizationId },
    orderBy: { order: 'asc' },
  });

  const upsert = upsertCompetency.bind(null, locale);
  const remove = deleteCompetency.bind(null, locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('competencies')}</h1>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">{t('addCompetency')}</h2>
        <form action={upsert} className="grid gap-3 md:grid-cols-2">
          <Input name="key" label={t('key')} required />
          <Input name="order" label={t('order')} type="number" defaultValue="0" />
          <Input name="nameHe" label="שם (עברית)" required />
          <Input name="nameEn" label="Name (English)" required />
          <Input name="descriptionHe" label="תיאור (עברית)" />
          <Input name="descriptionEn" label="Description (English)" />
          <div className="md:col-span-2 flex justify-end">
            <button className="rounded bg-brand-600 px-4 py-2 text-sm text-white">{t('save')}</button>
          </div>
        </form>
      </section>

      <section className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-start text-slate-600">
            <tr>
              <Th>{t('key')}</Th>
              <Th>שם</Th>
              <Th>Name</Th>
              <Th>{t('order')}</Th>
              <Th>{t('delete')}</Th>
            </tr>
          </thead>
          <tbody>
            {competencies.map((c) => (
              <tr key={c.id} className="border-t">
                <Td>{c.key}</Td>
                <Td>{c.nameHe}</Td>
                <Td>{c.nameEn}</Td>
                <Td>{c.order}</Td>
                <Td>
                  <form action={remove}>
                    <input type="hidden" name="id" value={c.id} />
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
