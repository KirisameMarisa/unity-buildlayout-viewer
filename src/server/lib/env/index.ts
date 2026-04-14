import { booleanEnv, resolveEnv, typeEnv } from "@/lib/env/helpers";

import "server-only"

export const env = {
    DATABASE_URL: process.env.DATABASE_URL,
} as const;
