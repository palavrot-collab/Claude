import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const acme = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme Corp', slug: 'acme', locale: 'he' },
  });

  const globex = await prisma.organization.upsert({
    where: { slug: 'globex' },
    update: {},
    create: { name: 'Globex', slug: 'globex', locale: 'en' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@acme.test' },
    update: { role: 'ADMIN' },
    create: {
      email: 'admin@acme.test',
      name: 'Acme Admin',
      role: 'ADMIN',
      organizationId: acme.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'demo@acme.test' },
    update: {},
    create: {
      email: 'demo@acme.test',
      name: 'Demo Manager',
      role: 'MANAGER',
      organizationId: acme.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'demo@globex.test' },
    update: {},
    create: {
      email: 'demo@globex.test',
      name: 'Globex Manager',
      role: 'MANAGER',
      organizationId: globex.id,
      preferredLocale: 'en',
    },
  });

  const competencies = [
    { key: 'feedback', nameHe: 'מתן פידבק', nameEn: 'Giving feedback', order: 1 },
    { key: 'delegation', nameHe: 'האצלת סמכויות', nameEn: 'Delegation', order: 2 },
    { key: 'one-on-ones', nameHe: 'שיחות 1:1', nameEn: 'One-on-ones', order: 3 },
    { key: 'decision-making', nameHe: 'קבלת החלטות', nameEn: 'Decision making', order: 4 },
    { key: 'team-development', nameHe: 'פיתוח הצוות', nameEn: 'Team development', order: 5 },
  ];
  for (const org of [acme, globex]) {
    for (const c of competencies) {
      await prisma.competency.upsert({
        where: { organizationId_key: { organizationId: org.id, key: c.key } },
        update: { nameHe: c.nameHe, nameEn: c.nameEn, order: c.order },
        create: { ...c, organizationId: org.id },
      });
    }
  }

  // Global materials available to all orgs.
  const globals = [
    {
      type: 'ARTICLE' as const,
      titleHe: 'מודל SBI למתן פידבק',
      titleEn: 'The SBI feedback model',
      url: 'https://example.com/sbi',
      tags: ['feedback'],
      stage: 1,
    },
    {
      type: 'VIDEO' as const,
      titleHe: 'איך לנהל שיחת 1:1 אפקטיבית',
      titleEn: 'Running effective 1:1s',
      url: 'https://example.com/one-on-one',
      tags: ['one-on-ones'],
      stage: 1,
    },
    {
      type: 'PODCAST' as const,
      titleHe: 'אומנות ההאצלה',
      titleEn: 'The art of delegation',
      url: 'https://example.com/delegate',
      tags: ['delegation'],
      stage: 2,
    },
    {
      type: 'PDF' as const,
      titleHe: 'מסגרת קבלת החלטות RAPID',
      titleEn: 'RAPID decision-making framework',
      url: 'https://example.com/rapid.pdf',
      tags: ['decision-making'],
      stage: 2,
    },
  ];
  // Idempotent: only create if there are no global materials yet.
  const existingGlobals = await prisma.material.count({ where: { organizationId: null } });
  if (existingGlobals === 0) {
    for (const m of globals) {
      await prisma.material.create({ data: { ...m, organizationId: null } });
    }
  }

  const existingTools = await prisma.tool.count({ where: { organizationId: null } });
  if (existingTools === 0) {
    await prisma.tool.create({
      data: {
        organizationId: null,
        key: 'one-on-one',
        titleHe: 'תבנית שיחת 1:1',
        titleEn: '1:1 conversation template',
        descriptionHe: 'מסגרת לסדר יום של שיחה אישית עם חבר/ת צוות',
        descriptionEn: 'Frame for a structured one-on-one conversation',
        templateSchema: [
          { key: 'wins', label: { he: 'הישגים מהשבוע', en: 'Wins this week' }, type: 'textarea' },
          { key: 'blockers', label: { he: 'מכשולים', en: 'Blockers' }, type: 'textarea' },
          { key: 'feedback', label: { he: 'פידבק עבור/ממני', en: 'Feedback to/from me' }, type: 'textarea' },
          { key: 'next', label: { he: 'מה עד הפעם הבאה', en: 'Next steps' }, type: 'textarea' },
        ],
      },
    });
    await prisma.tool.create({
      data: {
        organizationId: null,
        key: 'feedback-sbi',
        titleHe: 'תכנון פידבק (SBI)',
        titleEn: 'Feedback planning (SBI)',
        descriptionHe: 'הכנת שיחת פידבק לפי המודל Situation-Behavior-Impact',
        descriptionEn: 'Plan a feedback conversation using the SBI model',
        templateSchema: [
          { key: 'situation', label: { he: 'הסיטואציה', en: 'Situation' }, type: 'textarea' },
          { key: 'behavior', label: { he: 'ההתנהגות', en: 'Behavior' }, type: 'textarea' },
          { key: 'impact', label: { he: 'ההשפעה', en: 'Impact' }, type: 'textarea' },
          { key: 'request', label: { he: 'הבקשה להמשך', en: 'Request going forward' }, type: 'textarea' },
        ],
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
