'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import type { Locale } from '@/i18n/config';

const Upsert = z.object({
  id: z.string().optional().nullable(),
  key: z.string().min(1).max(64),
  nameHe: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionHe: z.string().optional().default(''),
  descriptionEn: z.string().optional().default(''),
  order: z.coerce.number().int().min(0).default(0),
});

export async function upsertCompetency(locale: Locale, formData: FormData) {
  const admin = await requireAdmin(locale);
  const data = Upsert.parse({
    id: formData.get('id') || null,
    key: formData.get('key'),
    nameHe: formData.get('nameHe'),
    nameEn: formData.get('nameEn'),
    descriptionHe: formData.get('descriptionHe') ?? '',
    descriptionEn: formData.get('descriptionEn') ?? '',
    order: formData.get('order') ?? 0,
  });

  if (data.id) {
    await prisma.competency.update({
      where: { id: data.id },
      data: {
        key: data.key,
        nameHe: data.nameHe,
        nameEn: data.nameEn,
        descriptionHe: data.descriptionHe || null,
        descriptionEn: data.descriptionEn || null,
        order: data.order,
      },
    });
  } else {
    await prisma.competency.create({
      data: {
        organizationId: admin.organizationId,
        key: data.key,
        nameHe: data.nameHe,
        nameEn: data.nameEn,
        descriptionHe: data.descriptionHe || null,
        descriptionEn: data.descriptionEn || null,
        order: data.order,
      },
    });
  }
  revalidatePath(`/${locale}/admin/competencies`);
}

export async function deleteCompetency(locale: Locale, formData: FormData) {
  const admin = await requireAdmin(locale);
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await prisma.competency.deleteMany({ where: { id, organizationId: admin.organizationId } });
  revalidatePath(`/${locale}/admin/competencies`);
}
