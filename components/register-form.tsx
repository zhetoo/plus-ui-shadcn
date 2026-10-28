"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { getCodeImg, getTenantList, register } from "@/api/login"
import type { RegisterForm as RegisterData, TenantVO } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function RegisterForm() {
  const router = useRouter()
  const [form, setForm] = React.useState<RegisterData>({
    tenantId: "",
    username: "",
    password: "",
    confirmPassword: "",
    code: "",
    uuid: "",
    userType: "sys_user",
  })
  const [tenants, setTenants] = React.useState<TenantVO[]>([])
  const [tenantEnabled, setTenantEnabled] = React.useState(true)
  const [captchaEnabled, setCaptchaEnabled] = React.useState(true)
  const [captchaUrl, setCaptchaUrl] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const loadCaptcha = React.useCallback(async () => {
    const response = await getCodeImg()
    setCaptchaEnabled(response.data.captchaEnabled ?? true)
    setCaptchaUrl(
      response.data.img ? `data:image/gif;base64,${response.data.img}` : ""
    )
    setForm((current) => ({ ...current, uuid: response.data.uuid, code: "" }))
  }, [])

  React.useEffect(() => {
    void loadCaptcha()
    void getTenantList(false).then((response) => {
      setTenantEnabled(response.data.tenantEnabled ?? true)
      setTenants(response.data.voList ?? [])
      if (response.data.voList?.[0])
        setForm((current) => ({
          ...current,
          tenantId: response.data.voList[0].tenantId,
        }))
    })
  }, [loadCaptcha])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.username || form.username.length < 2)
      return toast.error("用户名长度不能少于 2 位")
    if (!form.password || form.password.length < 5)
      return toast.error("密码长度不能少于 5 位")
    if (form.password !== form.confirmPassword)
      return toast.error("两次输入的密码不一致")
    if (captchaEnabled && !form.code) return toast.error("请输入验证码")
    setLoading(true)
    try {
      await register(form)
      toast.success(`账号 ${form.username} 注册成功`)
      router.push("/login")
    } catch {
      await loadCaptcha().catch(() => undefined)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm animate-in duration-500 fade-in-0 fill-mode-both slide-in-from-bottom-2">
      <div className="mb-8 space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">注册账号</h2>
        <p className="text-sm text-muted-foreground">创建新的系统用户</p>
      </div>
      <div>
        <form className="space-y-4" onSubmit={submit}>
          {tenantEnabled && (
            <div className="space-y-2">
              <Label>租户</Label>
              <Select
                items={tenants.map((tenant) => ({
                  label: tenant.companyName,
                  value: tenant.tenantId,
                }))}
                value={form.tenantId || null}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    tenantId: value ?? "",
                  }))
                }
              >
                <SelectTrigger className="h-10! w-full">
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
            <Label>用户名</Label>
            <Input
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>确认密码</Label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
            />
          </div>
          {captchaEnabled && (
            <div className="space-y-2">
              <Label>验证码</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                />
                <button
                  type="button"
                  className="h-8 w-28 overflow-hidden rounded-lg border bg-white"
                  onClick={() => void loadCaptcha()}
                >
                  {captchaUrl && (
                    <Image
                      unoptimized
                      width={112}
                      height={32}
                      src={captchaUrl}
                      alt="验证码"
                      className="size-full object-cover"
                    />
                  )}
                </button>
              </div>
            </div>
          )}
          <Button
            className="h-10 w-full transition-transform active:scale-[0.98]"
            type="submit"
            disabled={loading}
          >
            {loading && <LoaderCircle className="animate-spin" />}注册
          </Button>
          <Button
            className="w-full"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            返回登录
          </Button>
        </form>
      </div>
    </div>
  )
}
