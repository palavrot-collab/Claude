import createMiddleware from 'next-intl/middleware';
import { defaultLocale, locales } from './i18n/config';

export default createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
});

export const config = {
  // Match all paths except API, static, and Next internals.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
