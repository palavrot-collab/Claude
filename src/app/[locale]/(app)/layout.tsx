import { Nav } from '@/components/Nav';
import { requireUser } from '@/lib/session';
import type { Locale } from '@/i18n/config';

// All app pages are user-specific; opt out of static rendering.
export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  const user = await requireUser(locale);
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  return (
    <>
      <Nav locale={locale} userName={user.name} isAdmin={isAdmin} />
      <main className="section">{children}</main>
    </>
  );
}
