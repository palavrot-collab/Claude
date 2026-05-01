'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { currentPeriod } from '@/lib/period';
import type { Locale } from '@/i18n/config';

const Answer = z.object({
  competencyId: z.string().min(1),
  score: z.coerce.number().int().min(1).max(5),
  note: z.string().max(2000).optional().default(''),
});

export async function submitEvaluation(locale: Locale, formData: FormData) {
  const user = await requireUser(locale);
  const period = currentPeriod();

  const competencies = await prisma.competency.findMany({
    where: { organizationId: user.organizationId },
  });

  const answers = competencies.map((c) =>
    Answer.parse({
      competencyId: c.id,
      score: formData.get(`score:${c.id}`),
      note: formData.get(`note:${c.id}`) ?? '',
    }),
  );

  const generalNote = (formData.get('notes') as string | null)?.slice(0, 4000) ?? '';

  await prisma.assessment.upsert({
    where: { userId_period: { userId: user.id, period } },
    update: {
      notes: generalNote,
      answers: {
        deleteMany: {},
        create: answers,
      },
    },
    create: {
      userId: user.id,
      period,
      notes: generalNote,
      answers: { create: answers },
    },
  });

  revalidatePath(`/${locale}/evaluation`);
  redirect(`/${locale}/evaluation`);
}
