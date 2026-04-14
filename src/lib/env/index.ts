import { booleanEnv, resolveEnv, typeEnv } from "@/lib/env/helpers";

export const env = {
    APP_TITLE: process.env.NEXT_PUBLIC_APP_TITLE,
    APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
    UPLOAD_TIMEOUT_MS: typeEnv<number>(process.env.NEXT_PUBLIC_UPLOAD_TIMEOUT_MS, "300000"),
    UPLOAD_POLLING_MS: typeEnv<number>(process.env.NEXT_PUBLIC_UPLOAD_POLLING_MS, "5000"),
} as const;
