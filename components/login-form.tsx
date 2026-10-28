"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Code2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { getCodeImg, getTenantList } from "@/api/login"
import { authRouterUrl } from "@/api/system/social/auth"
import type { LoginData, TenantVO } from "@/api/types"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { env } from "@/lib/env"

const DEFAULT_FORM: LoginData = {
  tenantId: "000000",
  username: "admin",
  password: "admin123",
  rememberMe: false,
  code: "",
  uuid: "",
  clientId: env.clientId,
  grantType: "password",
}

export function LoginForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter()
  const { signIn, user, loading: sessionLoading } = useAuth()
  const [form, setForm] = React.useState<LoginData>(DEFAULT_FORM)
  const [tenants, setTenants] = React.useState<TenantVO[]>([])
  const [tenantEnabled, setTenantEnabled] = React.useState(true)
  const [captchaEnabled, setCaptchaEnabled] = React.useState(true)
  const [captchaUrl, setCaptchaUrl] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  const loadCaptcha = React.useCallback(async () => {
    const response = await getCodeImg()
    const data = response.data
    const enabled = data.captchaEnabled ?? true
    setCaptchaEnabled(enabled)
    setForm((current) => ({ ...current, code: "", uuid: data.uuid ?? "" }))
    setCaptchaUrl(
      enabled && data.img ? `data:image/gif;base64,${data.img}` : ""
    )
  }, [])

  React.useEffect(() => {
    const remembered = window.localStorage.getItem("rememberMe") === "true"
    let rememberTimer: number | undefined
    if (remembered) {
      rememberTimer = window.setTimeout(() => {
        setForm((current) => ({
          ...current,
          tenantId: window.localStorage.getItem("tenantId") ?? current.tenantId,
          username: window.localStorage.getItem("username") ?? current.username,
          password: window.localStorage.getItem("password") ?? current.password,
          rememberMe: true,
        }))
      })
    }

    void loadCaptcha().catch(() => undefined)
    void getTenantList(false).then((response) => {
      const enabled = response.data.tenantEnabled ?? true
      setTenantEnabled(enabled)
      setTenants(response.data.voList ?? [])
      if (
        enabled &&
        !window.localStorage.getItem("tenantId") &&
        response.data.voList?.[0]
      ) {
        setForm((current) => ({
          ...current,
          tenantId: response.data.voList[0].tenantId,
        }))
      }
    })
    return () => window.clearTimeout(rememberTimer)
  }, [loadCaptcha])

  React.useEffect(() => {
    if (!sessionLoading && user) router.replace(redirectTo)
  }, [redirectTo, router, sessionLoading, user])

  function updateForm<K extends keyof LoginData>(key: K, value: LoginData[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !form.username ||
      !form.password ||
      (tenantEnabled && !form.tenantId) ||
      (captchaEnabled && !form.code)
    ) {
      toast.error("请完整填写登录信息")
      return
    }

    setSubmitting(true)
    try {
      if (form.rememberMe) {
        window.localStorage.setItem("tenantId", String(form.tenantId ?? ""))
        window.localStorage.setItem("username", String(form.username ?? ""))
        window.localStorage.setItem("password", String(form.password ?? ""))
        window.localStorage.setItem("rememberMe", "true")
      } else {
        for (const key of ["tenantId", "username", "password", "rememberMe"])
          window.localStorage.removeItem(key)
      }
      await signIn(form)
      router.replace(redirectTo)
    } catch {
      if (captchaEnabled) await loadCaptcha().catch(() => undefined)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSocialLogin(source: string) {
    const response = await authRouterUrl(source, String(form.tenantId ?? ""))
    if (response.data) window.location.href = response.data
  }

  return (
    <div className="w-full max-w-sm animate-in duration-500 fade-in-0 fill-mode-both slide-in-from-bottom-2">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">欢迎回来</h2>
        <p className="text-sm text-muted-foreground">
          请输入账号信息登录管理控制台
        </p>
      </div>
      <div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {tenantEnabled && (
            <div className="space-y-2">
              <Label htmlFor="tenant">租户</Label>
              <Select
                items={tenants.map((tenant) => ({
                  label: tenant.companyName,
                  value: tenant.tenantId,
                }))}
                value={form.tenantId ?? null}
                onValueChange={(value) =>
                  updateForm("tenantId", value ?? undefined)
                }
              >
                <SelectTrigger id="tenant" className="h-10! w-full">
                  <SelectValue placeholder="请选择租户" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.tenantId} value={tenant.tenantId}>
                      {tenant.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <div className="relative">
              <UserRound className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                className="h-10 pl-9"
                autoComplete="username"
                value={form.username}
                onChange={(event) => updateForm("username", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <LockKeyhole className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                className="h-10 pr-10 pl-9"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => updateForm("password", event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </div>

          {captchaEnabled && (
            <div className="space-y-2">
              <Label htmlFor="code">验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  className="h-10 flex-1"
                  value={form.code}
                  onChange={(event) => updateForm("code", event.target.value)}
                />
                <button
                  type="button"
                  className="h-10 w-32 overflow-hidden rounded-lg border bg-white"
                  onClick={() => void loadCaptcha()}
                  aria-label="刷新验证码"
                >
                  {/* 验证码由后端以 base64 动态返回。 */}
                  {captchaUrl && (
                    <Image
                      src={captchaUrl}
                      alt="验证码"
                      width={128}
                      height={40}
                      unoptimized
                      className="size-full object-cover"
                    />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={form.rememberMe}
              onCheckedChange={(checked) => updateForm("rememberMe", checked)}
            />
            <Label htmlFor="remember" className="font-normal">
              记住密码
            </Label>
          </div>

          <Button
            className="h-10 w-full transition-transform active:scale-[0.98]"
            type="submit"
            disabled={submitting}
          >
            {submitting && <LoaderCircle className="animate-spin" />}
            {submitting ? "登录中..." : "登录"}
          </Button>

          <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            其他登录方式
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="微信登录"
              onClick={() => void handleSocialLogin("wechat")}
            >
              <MessageCircle />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Gitee 登录"
              onClick={() => void handleSocialLogin("gitee")}
            >
              <span className="text-xs font-semibold">G</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="GitHub 登录"
              onClick={() => void handleSocialLogin("github")}
            >
              <Code2 />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
