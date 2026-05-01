import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './auth';
import { prisma } from './prisma';
import type { Locale } from '@/i18n/config';

export async function requireUser(locale: Locale) {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) redirect(`/${locale}/sign-in`);
  const user = await prisma.user.findUnique({
    where: { id },
    include: { organization: true },
  });
  if (!user) redirect(`/${locale}/sign-in`);
  return user;
}
