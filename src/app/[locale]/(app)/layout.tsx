import { Nav } from '@/components/Nav';
import { requireUser } from '@/lib/session';
import type { Locale } from '@/i18n/config';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale as Locale;
  const user = await requireUser(locale);
  return (
    <>
      <Nav locale={locale} userName={user.name} />
      <main className="section">{children}</main>
    </>
  );
}
