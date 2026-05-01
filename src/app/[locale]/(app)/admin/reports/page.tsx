import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/i18n/config';

export default async function ReportsPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const admin = await requireAdmin(locale);
  const t = await getTranslations('admin');
  const orgId = admin.organizationId;

  const [users, allMaterialsForOrg, completed, allAnswers, competencies] = await Promise.all([
    prisma.user.findMany({ where: { organizationId: orgId } }),
    prisma.material.findMany({
      where: { OR: [{ organizationId: null }, { organizationId: orgId } ] },
    }),
    prisma.materialProgress.findMany({
      where: { user: { organizationId: orgId }, status: 'COMPLETED' },
    }),
    prisma.assessmentAnswer.findMany({
      where: { assessment: { user: { organizationId: orgId } } },
      include: { competency: true },
    }),
    prisma.competency.findMany({ where: { organizationId: orgId }, orderBy: { order: 'asc' } }),
  ]);

  const totalUsers = users.length;
  const totalMaterials = allMaterialsForOrg.length;
  const denom = totalUsers * totalMaterials;
  const completionRate = denom === 0 ? 0 : Math.round((completed.length / denom) * 100);

  // Average score per competency.
  const sumByCompetency = new Map<string, { sum: number; count: number; name: string }>();
  for (const a of allAnswers) {
    const key = a.competencyId;
    const e = sumByCompetency.get(key) ?? {
      sum: 0,
      count: 0,
      name: locale === 'he' ? a.competency.nameHe : a.competency.nameEn,
    };
    e.sum += a.score;
    e.count += 1;
    sumByCompetency.set(key, e);
  }
  const avgRows = competencies.map((c) => {
    const e = sumByCompetency.get(c.id);
    const avg = e && e.count > 0 ? (e.sum / e.count).toFixed(2) : '—';
    return { id: c.id, name: locale === 'he' ? c.nameHe : c.nameEn, avg, count: e?.count ?? 0 };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('reports')}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label={t('totalUsers')} value={totalUsers} />
        <Stat label={t('totalMaterials')} value={totalMaterials} />
        <Stat label={t('completionRate')} value={`${completionRate}%`} />
      </div>

      <section className="rounded border bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">{t('avgScore')}</h2>
        <ul className="space-y-2">
          {avgRows.map((r) => (
            <li key={r.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
              <span>{r.name}</span>
              <span className="font-mono tabular-nums">{r.avg}</span>
              <span className="text-xs text-slate-500">n={r.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
