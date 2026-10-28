"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, Moon, Sun, UserRound } from "lucide-react"
import { useTheme } from "next-themes"

import { getTenantList } from "@/api/login"
import { dynamicClear, dynamicTenant } from "@/api/system/tenant"
import type { TenantVO } from "@/api/types"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth } from "@/components/auth-provider"
import { NoticeMenu } from "@/components/notice-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AppRoute } from "@/types/route"

/**
 * 按菜单层级查找当前路径对应的标题链
 * @param routes 后端下发的菜单
 * @param pathname 当前路径
 * @param parent 父级路径
 * @returns 从顶级到当前菜单的标题数组，未找到返回 undefined
 */
function findTrail(
  routes: AppRoute[],
  pathname: string,
  parent = ""
): string[] | undefined {
  for (const route of routes) {
    const path = route.path.startsWith("/")
      ? route.path
      : `${parent}/${route.path}`.replace(/\/{2,}/g, "/")
    const title = route.meta?.title || route.name || route.path
    if (path === pathname) return [title]
    const nested = route.children && findTrail(route.children, pathname, path)
    if (nested) return [title, ...nested]
  }
}

function TenantSwitcher({ refresh }: { refresh: () => Promise<void> }) {
  const router = useRouter()
  const [tenants, setTenants] = React.useState<TenantVO[]>([])
  const [tenantId, setTenantId] = React.useState("")

  React.useEffect(() => {
    void getTenantList(true).then((response) =>
      setTenants(
        response.data.tenantEnabled === false
          ? []
          : (response.data.voList ?? [])
      )
    )
  }, [])

  async function change(value: string | null) {
    if (!value) return
    await dynamicTenant(value)
    setTenantId(value)
    await refresh()
    router.push("/")
    router.refresh()
  }

  async function clear() {
    await dynamicClear()
    setTenantId("")
    await refresh()
    router.push("/")
    router.refresh()
  }

  if (!tenants.length) return null
  return (
    <div className="hidden items-center gap-1 xl:flex">
      <Select value={tenantId || null} onValueChange={change}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="动态切换租户" />
        </SelectTrigger>
        <SelectContent>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.tenantId} value={tenant.tenantId}>
              {tenant.companyName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {tenantId && (
        <Button variant="ghost" size="sm" onClick={() => void clear()}>
          恢复
        </Button>
      )}
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const { loading, user, routes, signOut, refresh } = useAuth()

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || "/")}`)
    }
  }, [loading, pathname, router, user])

  if (loading || !user) {
    return (
      <div className="flex min-h-svh animate-in duration-500 fade-in-0">
        {/* 1. 侧边栏：logo 与菜单项占位 */}
        <aside className="hidden w-(--sidebar-width) shrink-0 flex-col gap-2 border-r bg-sidebar p-2 [--sidebar-width:16rem] md:flex">
          <div className="flex h-12 items-center gap-2 px-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="mx-2 mt-2 h-3 w-12" />
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex h-8 items-center gap-2 px-2">
              <Skeleton className="size-4" />
              <Skeleton
                className="h-3.5"
                style={{ width: `${45 + (index % 3) * 15}%` }}
              />
            </div>
          ))}
        </aside>
        <div className="flex flex-1 flex-col">
          {/* 2. 顶栏：面包屑与右侧操作区占位 */}
          <div className="flex h-14 items-center gap-3 border-b px-4">
            <Skeleton className="size-7" />
            <Skeleton className="h-4 w-40" />
            <div className="ml-auto flex items-center gap-2">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          {/* 3. 内容区：查询卡片与表格卡片占位 */}
          <div className="flex-1 space-y-4 p-4 md:p-6">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-[calc(100svh-14rem)] rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  const trail =
    pathname === "/"
      ? ["首页"]
      : pathname === "/user/profile"
        ? ["个人中心"]
        : findTrail(routes, pathname) || ["功能页面"]
  const initials = (user.nickName || user.userName || "U")
    .slice(0, 1)
    .toUpperCase()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
          <SidebarTrigger />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList className="flex-nowrap">
              {trail.map((item, index) => (
                <React.Fragment key={`${index}-${item}`}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem className="truncate">
                    {index === trail.length - 1 ? (
                      <BreadcrumbPage className="truncate font-medium">
                        {item}
                      </BreadcrumbPage>
                    ) : (
                      item
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          {String(user.userId) === "1" && <TenantSwitcher refresh={refresh} />}
          <NoticeMenu />
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            title="切换主题"
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="h-9 gap-2 px-2" />}
            >
              <Avatar className="size-7">
                <AvatarImage src={user.avatar || "/images/profile.jpg"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">
                {user.nickName || user.userName}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{user.userName}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/user/profile")}>
                <UserRound />
                个人中心
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void signOut()}
              >
                <LogOut />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
