import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const acme = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme Corp', slug: 'acme', locale: 'he' },
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

  const competencies = [
    { key: 'feedback', nameHe: 'מתן פידבק', nameEn: 'Giving feedback', order: 1 },
    { key: 'delegation', nameHe: 'האצלת סמכויות', nameEn: 'Delegation', order: 2 },
    { key: 'one-on-ones', nameHe: 'שיחות 1:1', nameEn: 'One-on-ones', order: 3 },
    { key: 'decision-making', nameHe: 'קבלת החלטות', nameEn: 'Decision making', order: 4 },
    { key: 'team-development', nameHe: 'פיתוח הצוות', nameEn: 'Team development', order: 5 },
  ];
  for (const c of competencies) {
    await prisma.competency.upsert({
      where: { organizationId_key: { organizationId: acme.id, key: c.key } },
      update: { nameHe: c.nameHe, nameEn: c.nameEn, order: c.order },
      create: { ...c, organizationId: acme.id },
    });
  }

  const materials = [
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
  ];
  for (const m of materials) {
    await prisma.material.create({ data: { ...m, organizationId: null } });
  }

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
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
