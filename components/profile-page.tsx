"use client"

import * as React from "react"
import { LoaderCircle, Upload } from "lucide-react"
import { toast } from "sonner"

import { delOnline, getOnline } from "@/api/monitor/online"
import {
  authRouterUrl,
  authUnlock,
  getAuthList,
} from "@/api/system/social/auth"
import {
  getUserProfile,
  updateUserProfile,
  updateUserPwd,
  uploadAvatar,
} from "@/api/system/user"
import type { UserForm, UserInfoVO, UserVO } from "@/api/system/user/types"
import { useAuth } from "@/components/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const SEX_OPTIONS = [
  { label: "男", value: "0" },
  { label: "女", value: "1" },
  { label: "未知", value: "2" },
]

interface SocialAuth {
  id: string
  source: string
  userName?: string
}

interface OnlineDevice {
  tokenId: string
  deviceType?: string
  ipaddr?: string
  loginLocation?: string
  os?: string
  browser?: string
  loginTime?: string
}

export function ProfilePage() {
  const { refresh } = useAuth()
  const [profile, setProfile] = React.useState<UserInfoVO | null>(null)
  const [user, setUser] = React.useState<Partial<UserVO>>({})
  const [password, setPassword] = React.useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [auths, setAuths] = React.useState<SocialAuth[]>([])
  const [devices, setDevices] = React.useState<OnlineDevice[]>([])
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    const [response, authResponse, deviceResponse] = await Promise.all([
      getUserProfile(),
      getAuthList(),
      getOnline(),
    ])
    setProfile(response.data)
    setUser(response.data.user)
    setAuths(authResponse.data as unknown as SocialAuth[])
    setDevices(
      (deviceResponse as unknown as { rows?: OnlineDevice[] }).rows ?? []
    )
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await updateUserProfile(user as UserForm)
      toast.success("个人信息修改成功")
      await Promise.all([load(), refresh()])
    } finally {
      setSaving(false)
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault()
    if (!password.oldPassword || password.newPassword.length < 5)
      return toast.error("新密码长度不能少于 5 位")
    if (password.newPassword !== password.confirmPassword)
      return toast.error("两次输入的新密码不一致")
    await updateUserPwd(password.oldPassword, password.newPassword)
    setPassword({ oldPassword: "", newPassword: "", confirmPassword: "" })
    toast.success("密码修改成功")
  }

  async function changeAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const data = new FormData()
    data.append("avatarfile", file)
    const response = await uploadAvatar(data)
    setUser((current) => ({ ...current, avatar: response.data.imgUrl }))
    await refresh()
    toast.success("头像修改成功")
  }

  async function bind(source: string) {
    const response = await authRouterUrl(source, user.tenantId || "000000")
    if (response.data) window.location.assign(response.data)
  }

  async function unbind(auth: SocialAuth) {
    if (!window.confirm(`确认解除 ${auth.source} 账号绑定吗？`)) return
    await authUnlock(auth.id)
    toast.success("解绑成功")
    await load()
  }

  async function removeDevice(device: OnlineDevice) {
    if (!window.confirm("删除设备后，该设备需要重新登录，确认继续吗？")) return
    await delOnline(device.tokenId)
    toast.success("设备已删除")
    await load()
  }

  if (!profile)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    )

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="relative">
            <Avatar className="size-24">
              <AvatarImage src={user.avatar || "/images/profile.jpg"} />
              <AvatarFallback>{user.userName?.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <Label
              htmlFor="avatar"
              className="absolute right-0 bottom-0 flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Upload className="size-4" />
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void changeAvatar(event)}
              />
            </Label>
          </div>
          <CardTitle>{user.nickName || user.userName}</CardTitle>
          <CardDescription>{user.userName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">所属部门</span>
            <span className="text-right">{user.deptName || "-"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">所属角色</span>
            <span className="text-right">{profile.roleGroup || "-"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">所属岗位</span>
            <span className="text-right">{profile.postGroup || "-"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">账号状态</span>
            <Badge variant="secondary">
              {user.status === "1" ? "停用" : "正常"}
            </Badge>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>基本资料</CardTitle>
            <CardDescription>更新昵称和联系方式</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveProfile}>
              <div className="space-y-2">
                <Label>用户昵称</Label>
                <Input
                  value={user.nickName ?? ""}
                  onChange={(event) =>
                    setUser((current) => ({
                      ...current,
                      nickName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>手机号码</Label>
                <Input
                  value={user.phonenumber ?? ""}
                  onChange={(event) =>
                    setUser((current) => ({
                      ...current,
                      phonenumber: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input
                  type="email"
                  value={user.email ?? ""}
                  onChange={(event) =>
                    setUser((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>性别</Label>
                <Select
                  items={SEX_OPTIONS}
                  value={user.sex ?? "2"}
                  onValueChange={(value) =>
                    value &&
                    setUser((current) => ({
                      ...current,
                      sex: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEX_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <LoaderCircle className="animate-spin" />}保存资料
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>修改密码</CardTitle>
            <CardDescription>密码长度为 5 至 20 位</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-3" onSubmit={savePassword}>
              <div className="space-y-2">
                <Label>当前密码</Label>
                <Input
                  type="password"
                  value={password.oldPassword}
                  onChange={(event) =>
                    setPassword((current) => ({
                      ...current,
                      oldPassword: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>新密码</Label>
                <Input
                  type="password"
                  value={password.newPassword}
                  onChange={(event) =>
                    setPassword((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>确认新密码</Label>
                <Input
                  type="password"
                  value={password.confirmPassword}
                  onChange={(event) =>
                    setPassword((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit">更新密码</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>第三方账号</CardTitle>
            <CardDescription>绑定或解除社交账号</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {["wechat", "gitee", "github"].map((source) => (
                <Button
                  key={source}
                  variant="outline"
                  onClick={() => void bind(source)}
                >
                  绑定 {source}
                </Button>
              ))}
            </div>
            {auths.map((auth) => (
              <div
                key={auth.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <span>
                  {auth.source} {auth.userName ? `· ${auth.userName}` : ""}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void unbind(auth)}
                >
                  解除绑定
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>在线设备</CardTitle>
            <CardDescription>管理当前账号的登录会话</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>设备</TableHead>
                  <TableHead>主机</TableHead>
                  <TableHead>地点</TableHead>
                  <TableHead>系统 / 浏览器</TableHead>
                  <TableHead>登录时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      暂无在线设备
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow key={device.tokenId}>
                      <TableCell>{device.deviceType || "-"}</TableCell>
                      <TableCell>{device.ipaddr || "-"}</TableCell>
                      <TableCell>{device.loginLocation || "-"}</TableCell>
                      <TableCell>
                        {device.os || "-"} / {device.browser || "-"}
                      </TableCell>
                      <TableCell>
                        {device.loginTime
                          ? new Date(Number(device.loginTime)).toLocaleString(
                              "zh-CN",
                              { hour12: false }
                            )
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void removeDevice(device)}
                        >
                          删除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
