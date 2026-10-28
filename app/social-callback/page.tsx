"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { callback, login } from "@/api/login"
import type { LoginData } from "@/api/types"
import { env } from "@/lib/env"
import { getToken, setToken } from "@/utils/auth"

function SocialCallbackContent() {
  const query = useSearchParams()

  React.useEffect(() => {
    async function finishLogin() {
      try {
        const code = query.get("code") ?? ""
        const state = query.get("state") ?? ""
        const source = query.get("source") ?? ""
        const stateJson = JSON.parse(atob(state)) as {
          tenantId?: string
          domain?: string
        }

        if (stateJson.domain && stateJson.domain !== window.location.host) {
          const url = new URL(window.location.href)
          url.host = stateJson.domain
          window.location.replace(url.toString())
          return
        }

        const data: LoginData = {
          socialCode: code,
          socialState: state,
          source,
          tenantId: stateJson.tenantId || "000000",
          clientId: env.clientId,
          grantType: "social",
        }
        const response = getToken() ? await callback(data) : await login(data)
        if (response.data?.access_token) setToken(response.data.access_token)
        toast.success(response.msg || "登录成功")
        window.location.replace("/index")
      } catch {
        window.setTimeout(() => window.location.replace("/login"), 1500)
      }
    }
    void finishLogin()
  }, [query])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3">
      <LoaderCircle className="size-8 animate-spin" />
      <p className="text-sm text-muted-foreground">正在完成第三方登录...</p>
    </main>
  )
}

export default function SocialCallbackPage() {
  return (
    <React.Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center">
          <LoaderCircle className="size-8 animate-spin" />
        </main>
      }
    >
      <SocialCallbackContent />
    </React.Suspense>
  )
}
