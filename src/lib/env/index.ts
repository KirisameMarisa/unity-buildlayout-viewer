import { booleanEnv, resolveEnv, typeEnv } from "@/lib/env/helpers";

import "server-only"

export const env = {
    APP_TITLE: process.env.NEXT_PUBLIC_APP_TITLE,
    APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
} as const;
