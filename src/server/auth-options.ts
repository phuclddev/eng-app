import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { getEnv } from "@/lib/env";
import { prisma } from "@/server/prisma";

const env = getEnv();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID || "placeholder-google-client-id",
      clientSecret:
        env.GOOGLE_CLIENT_SECRET || "placeholder-google-client-secret",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const profile = await prisma.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            role: true,
            status: true,
            name: true,
            image: true,
          },
        });

        if (profile) {
          token.id = profile.id;
          token.role = profile.role;
          token.status = profile.status;
          token.name = profile.name ?? token.name;
          token.picture = profile.image ?? token.picture;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role ?? "USER";
        session.user.status = token.status ?? "PENDING";
      }

      return session;
    },
  },
  secret: env.NEXTAUTH_SECRET,
  debug: process.env.AUTH_DEBUG === "true",
};
