"use client";

import { createAuthClient } from "better-auth/react";

// Better Auth's browser client defaults to the current origin. The server
// retains BETTER_AUTH_URL as its trusted canonical origin.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
