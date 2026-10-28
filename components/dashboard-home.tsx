"use client"

import Link from "next/link"
import { Activity, Boxes, ShieldCheck, Users } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function DashboardHome() {
  const { user, roles, permissions, routes } = useAuth()
  const cards = [
    {
      title: "菜单模块",
      value: routes.length,
      icon: Boxes,
      description: "后端动态下发",
    },
    {
      title: "角色",
      value: roles.length,
      icon: Users,
      description: roles.join("、") || "默认角色",
    },
    {
      title: "权限标识",
      value: permissions.length,
      icon: ShieldCheck,
      description: "已加载按钮权限",
    },
    {
      title: "运行状态",
      value: "在线",
      icon: Activity,
      description: "接口与会话已连接",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary">工作台</Badge>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            你好，{user?.nickName || user?.userName}
          </h1>
          <p className="text-sm text-muted-foreground">
            欢迎使用 RuoYi-Vue-Plus 多租户管理系统
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/user/profile" />}>
          查看个人资料
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {item.title}
              </CardTitle>
              <item.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{item.value}</div>
              <CardDescription className="mt-1 truncate">
                {item.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>系统说明</CardTitle>
          <CardDescription>
            新前端保留原有后端 API、鉴权、租户与动态菜单协议，界面组件已切换为
            shadcn/ui。
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
