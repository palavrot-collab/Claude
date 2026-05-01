'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import type { Locale } from '@/i18n/config';

const Invite = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['MANAGER', 'ADMIN']).default('MANAGER'),
});

export async function inviteUser(locale: Locale, formData: FormData) {
  const admin = await requireAdmin(locale);
  const data = Invite.parse({
    email: formData.get('email'),
    name: formData.get('name'),
    role: formData.get('role'),
  });

  await prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      email: data.email,
      name: data.name,
      role: data.role,
      organizationId: admin.organizationId,
    },
  });
  revalidatePath(`/${locale}/admin/users`);
}

const RoleChange = z.object({
  id: z.string().min(1),
  role: z.enum(['MANAGER', 'ADMIN']),
});

export async function changeRole(locale: Locale, formData: FormData) {
  const admin = await requireAdmin(locale);
  const data = RoleChange.parse({ id: formData.get('id'), role: formData.get('role') });
  await prisma.user.updateMany({
    where: { id: data.id, organizationId: admin.organizationId },
    data: { role: data.role },
  });
  revalidatePath(`/${locale}/admin/users`);
}

export async function removeUser(locale: Locale, formData: FormData) {
  const admin = await requireAdmin(locale);
  const id = String(formData.get('id') ?? '');
  if (!id || id === admin.id) return;
  await prisma.user.deleteMany({ where: { id, organizationId: admin.organizationId } });
  revalidatePath(`/${locale}/admin/users`);
}
