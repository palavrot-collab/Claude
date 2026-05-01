import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { currentPeriod } from '@/lib/period';
import type { Locale } from '@/i18n/config';

export default async function AdminOverviewPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const admin = await requireAdmin(locale);
  const t = await getTranslations('admin');
  const orgId = admin.organizationId;
  const period = currentPeriod();

  const [users, materials, assessments, periodAssessments] = await Promise.all([
    prisma.user.count({ where: { organizationId: orgId } }),
    prisma.material.count({
      where: { OR: [{ organizationId: null }, { organizationId: orgId } ] },
    }),
    prisma.assessment.count({
      where: { user: { organizationId: orgId } },
    }),
    prisma.assessment.count({
      where: { user: { organizationId: orgId }, period },
    }),
  ]);

  const participation = users === 0 ? 0 : Math.round((periodAssessments / users) * 100);

  const cards = [
    { label: t('totalUsers'), value: users },
    { label: t('totalMaterials'), value: materials },
    { label: t('totalAssessments'), value: assessments },
    { label: `${t('participation')} (${period})`, value: `${participation}%` },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('overview')}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded border bg-white p-4">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
