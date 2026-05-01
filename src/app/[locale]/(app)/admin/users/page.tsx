import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/i18n/config';
import { inviteUser, changeRole, removeUser } from './actions';

export default async function UsersAdminPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const admin = await requireAdmin(locale);
  const t = await getTranslations('admin');

  const users = await prisma.user.findMany({
    where: { organizationId: admin.organizationId },
    orderBy: { createdAt: 'asc' },
  });

  const invite = inviteUser.bind(null, locale);
  const change = changeRole.bind(null, locale);
  const remove = removeUser.bind(null, locale);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('users')}</h1>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">{t('inviteUser')}</h2>
        <form action={invite} className="grid gap-3 md:grid-cols-3">
          <Input name="name" label={t('name')} required />
          <Input name="email" label={t('email')} type="email" required />
          <label className="block text-sm">
            <span className="text-slate-600">{t('role')}</span>
            <select
              name="role"
              defaultValue="MANAGER"
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            >
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <div className="md:col-span-3 flex justify-end">
            <button className="rounded bg-brand-600 px-4 py-2 text-sm text-white">{t('save')}</button>
          </div>
        </form>
      </section>

      <section className="rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <Th>{t('name')}</Th>
              <Th>{t('email')}</Th>
              <Th>{t('role')}</Th>
              <Th>{t('delete')}</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <Td>{u.name}</Td>
                <Td>{u.email}</Td>
                <Td>
                  <form action={change} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <button className="rounded bg-slate-700 px-2 py-1 text-xs text-white">
                      {t('save')}
                    </button>
                  </form>
                </Td>
                <Td>
                  {u.id !== admin.id && (
                    <form action={remove}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className="text-red-600 hover:underline">{t('delete')}</button>
                    </form>
                  )}
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
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
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
