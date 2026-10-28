export const env = {
  title: process.env.NEXT_PUBLIC_APP_TITLE ?? "RuoYi-Vue-Plus多租户管理系统",
  logoTitle: process.env.NEXT_PUBLIC_APP_LOGO_TITLE ?? "RuoYi-Vue-Plus",
  baseApi: process.env.NEXT_PUBLIC_APP_BASE_API ?? "/dev-api",
  contextPath: process.env.NEXT_PUBLIC_APP_CONTEXT_PATH ?? "/",
  monitorAdmin: process.env.NEXT_PUBLIC_APP_MONITOR_ADMIN ?? "",
  snailJobAdmin: process.env.NEXT_PUBLIC_APP_SNAILJOB_ADMIN ?? "",
  encrypt: process.env.NEXT_PUBLIC_APP_ENCRYPT === "true",
  rsaPublicKey: process.env.NEXT_PUBLIC_APP_RSA_PUBLIC_KEY ?? "",
  rsaPrivateKey: process.env.NEXT_PUBLIC_APP_RSA_PRIVATE_KEY ?? "",
  clientId: process.env.NEXT_PUBLIC_APP_CLIENT_ID ?? "",
  websocket: process.env.NEXT_PUBLIC_APP_WEBSOCKET === "true",
  sse: process.env.NEXT_PUBLIC_APP_SSE === "true",
} as const
