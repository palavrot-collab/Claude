'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';
import type { Locale } from '@/i18n/config';

const TemplateField = z.object({
  key: z.string().min(1),
  label: z.object({ he: z.string().min(1), en: z.string().min(1) }),
  type: z.enum(['text', 'textarea']),
});
const TemplateSchema = z.array(TemplateField);

const Upsert = z.object({
  id: z.string().optional().nullable(),
  key: z.string().min(1).max(64),
  titleHe: z.string().min(1),
  titleEn: z.string().min(1),
  descriptionHe: z.string().optional().default(''),
  descriptionEn: z.string().optional().default(''),
  fileUrl: z.string().optional().default(''),
  templateSchemaJson: z.string().optional().default(''),
  scope: z.enum(['org', 'global']).default('org'),
});

export async function upsertTool(locale: Locale, formData: FormData) {
  const admin = await requireAdmin(locale);
  const data = Upsert.parse(Object.fromEntries(formData));

  let parsedSchema: unknown = null;
  if (data.templateSchemaJson.trim()) {
    try {
      parsedSchema = JSON.parse(data.templateSchemaJson);
    } catch {
      throw new Error('invalid_template_json');
    }
    TemplateSchema.parse(parsedSchema);
  }

  const orgId = data.scope === 'global' && admin.role === 'SUPERADMIN' ? null : admin.organizationId;

  if (data.id) {
    await prisma.tool.update({
      where: { id: data.id },
      data: {
        key: data.key,
        titleHe: data.titleHe,
        titleEn: data.titleEn,
        descriptionHe: data.descriptionHe || null,
        descriptionEn: data.descriptionEn || null,
        fileUrl: data.fileUrl || null,
        templateSchema:
          parsedSchema === null
            ? Prisma.JsonNull
            : (parsedSchema as Prisma.InputJsonValue),
      },
    });
  } else {
    await prisma.tool.create({
      data: {
        organizationId: orgId,
        key: data.key,
        titleHe: data.titleHe,
        titleEn: data.titleEn,
        descriptionHe: data.descriptionHe || null,
        descriptionEn: data.descriptionEn || null,
        fileUrl: data.fileUrl || null,
        templateSchema:
          parsedSchema === null
            ? Prisma.JsonNull
            : (parsedSchema as Prisma.InputJsonValue),
      },
    });
  }

  revalidatePath(`/${locale}/admin/tools`);
}

export async function deleteTool(locale: Locale, formData: FormData) {
  const admin = await requireAdmin(locale);
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const where = admin.role === 'SUPERADMIN'
    ? { id }
    : { id, organizationId: admin.organizationId };
  await prisma.tool.deleteMany({ where });
  revalidatePath(`/${locale}/admin/tools`);
}
