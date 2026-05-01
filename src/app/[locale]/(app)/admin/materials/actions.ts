'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import type { Locale } from '@/i18n/config';

const Upsert = z.object({
  id: z.string().optional().nullable(),
  type: z.enum(['VIDEO', 'ARTICLE', 'PODCAST', 'PDF']),
  titleHe: z.string().min(1),
  titleEn: z.string().min(1),
  descriptionHe: z.string().optional().default(''),
  descriptionEn: z.string().optional().default(''),
  url: z.string().url(),
  tags: z.string().optional().default(''),
  stage: z.coerce.number().int().min(1).default(1),
  scope: z.enum(['org', 'global']).default('org'),
});

export async function upsertMaterial(locale: Locale, formData: FormData) {
  const admin = await requireAdmin(locale);
  const data = Upsert.parse(Object.fromEntries(formData));
  const tags = data.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  // Only superadmin can write global materials.
  const orgId = data.scope === 'global' && admin.role === 'SUPERADMIN' ? null : admin.organizationId;

  if (data.id) {
    await prisma.material.update({
      where: { id: data.id },
      data: {
        type: data.type,
        titleHe: data.titleHe,
        titleEn: data.titleEn,
        descriptionHe: data.descriptionHe || null,
        descriptionEn: data.descriptionEn || null,
        url: data.url,
        tags,
        stage: data.stage,
      },
    });
  } else {
    await prisma.material.create({
      data: {
        organizationId: orgId,
        type: data.type,
        titleHe: data.titleHe,
        titleEn: data.titleEn,
        descriptionHe: data.descriptionHe || null,
        descriptionEn: data.descriptionEn || null,
        url: data.url,
        tags,
        stage: data.stage,
      },
    });
  }
  revalidatePath(`/${locale}/admin/materials`);
}

export async function deleteMaterial(locale: Locale, formData: FormData) {
  const admin = await requireAdmin(locale);
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  // Only delete materials this admin can manage (their org, or global if superadmin).
  const where = admin.role === 'SUPERADMIN'
    ? { id }
    : { id, organizationId: admin.organizationId };
  await prisma.material.deleteMany({ where });
  revalidatePath(`/${locale}/admin/materials`);
}
