// Authentication wiring.
//
// MVP: email + one-time code (OTP) sent to the user's mailbox.
// SSO: each organization can be configured to use SAML / OIDC instead.
//      Wire-up point is the `providers` array below — add a SAML / OIDC provider
//      gated on the user's organization. Hook only, not implemented in MVP.

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import { consumeOtp } from './otp';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      id: 'email-otp',
      name: 'Email code',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.code) return null;
        const ok = await consumeOtp(creds.email, creds.code);
        if (!ok) return null;
        const user = await prisma.user.findUnique({ where: { email: creds.email } });
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // SSO placeholder — enable per organization in production.
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
  pages: { signIn: '/he/sign-in' },
};
