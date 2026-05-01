'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import type { Locale } from '@/i18n/config';

const Save = z.object({
  toolId: z.string().min(1),
  title: z.string().min(1).max(200),
});

export async function saveToolEntry(locale: Locale, formData: FormData) {
  const user = await requireUser(locale);
  const { toolId, title } = Save.parse({
    toolId: formData.get('toolId'),
    title: formData.get('title'),
  });

  const content: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith('field:') && typeof v === 'string') {
      content[k.slice('field:'.length)] = v;
    }
  }

  await prisma.toolSubmission.create({
    data: { userId: user.id, toolId, title, content },
  });

  revalidatePath(`/${locale}/toolbox`);
  redirect(`/${locale}/toolbox`);
}
