'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import type { Locale } from '@/i18n/config';

const Toggle = z.object({
  materialId: z.string().min(1),
  field: z.enum(['complete', 'favorite']),
});

export async function toggleMaterial(locale: Locale, formData: FormData) {
  const user = await requireUser(locale);
  const { materialId, field } = Toggle.parse({
    materialId: formData.get('materialId'),
    field: formData.get('field'),
  });

  const existing = await prisma.materialProgress.findUnique({
    where: { userId_materialId: { userId: user.id, materialId } },
  });

  if (field === 'complete') {
    const completed = existing?.status !== 'COMPLETED';
    await prisma.materialProgress.upsert({
      where: { userId_materialId: { userId: user.id, materialId } },
      update: {
        status: completed ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId: user.id,
        materialId,
        status: completed ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: completed ? new Date() : null,
      },
    });
  } else {
    const favorite = !(existing?.favorite ?? false);
    await prisma.materialProgress.upsert({
      where: { userId_materialId: { userId: user.id, materialId } },
      update: { favorite },
      create: { userId: user.id, materialId, favorite, status: 'NOT_STARTED' },
    });
  }

  revalidatePath(`/${locale}/library`);
}
