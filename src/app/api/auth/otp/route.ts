import { NextResponse } from 'next/server';
import { z } from 'zod';
import { issueOtp } from '@/lib/otp';
import { sendOtpEmail } from '@/lib/mailer';
import { prisma } from '@/lib/prisma';

const Body = z.object({
  email: z.string().email(),
  locale: z.enum(['he', 'en']).default('he'),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { email, locale } = parsed.data;

  // Only issue codes for emails that belong to a known user (multi-tenant safety).
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond 200 to avoid user enumeration, but only actually send if user exists.
  if (user) {
    const code = await issueOtp(email);
    await sendOtpEmail(email, code, locale);
  }
  return NextResponse.json({ ok: true });
}
