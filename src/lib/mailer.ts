// Mail dispatch. MVP logs to stdout in development; wire to SES/SendGrid in prod.

export async function sendOtpEmail(email: string, code: string, locale: 'he' | 'en') {
  const subject = locale === 'he' ? 'קוד התחברות' : 'Your sign-in code';
  const body =
    locale === 'he'
      ? `שלום, קוד ההתחברות שלך הוא: ${code}\nתוקף הקוד: 10 דקות.`
      : `Hi, your sign-in code is: ${code}\nValid for 10 minutes.`;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[mailer] To: ${email}\nSubject: ${subject}\n${body}`);
    return;
  }
  // TODO: integrate provider (e.g. AWS SES, SendGrid).
  throw new Error('Mailer not configured for production');
}
