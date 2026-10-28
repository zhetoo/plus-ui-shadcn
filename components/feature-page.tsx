"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Construction } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { CachePage } from "@/components/cache-page"
import { CrudPage } from "@/components/crud-page"
import { DictPage } from "@/components/dict-page"
import { DemoTreePage } from "@/components/demo-tree-page"
import { ExternalPage } from "@/components/external-page"
import { GenEditPage, GenPage } from "@/components/gen-page"
import { OssPage } from "@/components/oss-page"
import { PostManagementPage } from "@/components/post-management-page"
import { ProfilePage } from "@/components/profile-page"
import { RoleManagementPage } from "@/components/role-management-page"
import {
  DepartmentManagementPage,
  MenuManagementPage,
} from "@/components/tree-management-pages"
import { RoleUserPage, UserRolePage } from "@/components/authorization-page"
import { UserManagementPage } from "@/components/user-management-page"
import { LeaveEditPage, WorkflowDesignPage } from "@/components/workflow-page"
import {
  AllTaskPage,
  ProcessDefinitionPage,
  ProcessInstancePage,
} from "@/components/workflow-list-pages"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CRUD_CONFIGS } from "@/lib/crud-configs"
import type { AppRoute } from "@/types/route"

const crudPathAliases: Record<string, string> = {
  "/system/log/operlog": "/monitor/operlog",
  "/system/log/logininfor": "/monitor/logininfor",
  "/tenant/tenant": "/system/tenant",
  "/tenant/tenantPackage": "/system/tenantPackage",
}

function findRoute(
  routes: AppRoute[],
  pathname: string,
  parent = ""
): AppRoute | undefined {
  for (const route of routes) {
    const path = route.path.startsWith("/")
      ? route.path
      : `${parent}/${route.path}`.replace(/\/{2,}/g, "/")
    if (path === pathname) return route
    const child = route.children && findRoute(route.children, pathname, path)
    if (child) return child
  }
}

function RedirectPage({ pathname }: { pathname: string }) {
  const router = useRouter()
  React.useEffect(() => {
    router.replace(pathname.replace(/^\/redirect/, "") || "/")
  }, [pathname, router])
  return <p className="text-sm text-muted-foreground">正在跳转...</p>
}

export function FeaturePage({ pathname }: { pathname: string }) {
  const { routes } = useAuth()
  if (pathname === "/user/profile") return <ProfilePage />
  if (pathname === "/system/user") return <UserManagementPage />
  if (pathname === "/system/role") return <RoleManagementPage />
  if (pathname === "/system/menu") return <MenuManagementPage />
  if (pathname === "/system/dept") return <DepartmentManagementPage />
  if (pathname === "/system/post") return <PostManagementPage />
  if (pathname === "/system/oss") return <OssPage />
  if (pathname === "/demo/tree") return <DemoTreePage />
  if (pathname === "/monitor/cache") return <CachePage />
  if (pathname.toLowerCase() === "/monitor/admin")
    return <ExternalPage type="monitor" />
  if (pathname === "/monitor/snailjob") return <ExternalPage type="snailjob" />
  if (pathname === "/system/dict") return <DictPage />
  if (pathname.startsWith("/redirect/"))
    return <RedirectPage pathname={pathname} />
  if (pathname === "/tool/gen") return <GenPage />
  if (pathname === "/workflow/design/index") return <WorkflowDesignPage />
  if (pathname === "/workflow/leaveEdit/index") return <LeaveEditPage />
  if (pathname === "/workflow/processDefinition")
    return <ProcessDefinitionPage />
  if (pathname === "/workflow/processInstance") return <ProcessInstancePage />
  if (pathname === "/workflow/task/allTaskWaiting") return <AllTaskPage />
  const roleUser = pathname.match(/^\/system\/role-auth\/user\/([^/]+)$/)
  if (roleUser) return <RoleUserPage roleId={roleUser[1]} />
  const userRole = pathname.match(/^\/system\/user-auth\/role\/([^/]+)$/)
  if (userRole) return <UserRolePage userId={userRole[1]} />
  const genEdit = pathname.match(/^\/tool\/gen-edit\/index\/([^/]+)$/)
  if (genEdit) return <GenEditPage tableId={genEdit[1]} />
  const crudConfig = CRUD_CONFIGS[crudPathAliases[pathname] ?? pathname]
  if (crudConfig) return <CrudPage key={pathname} config={crudConfig} />
  const route = findRoute(routes, pathname)
  if (!route)
    return (
      <Card>
        <CardHeader>
          <Badge variant="destructive" className="w-fit">
            404
          </Badge>
          <CardTitle>页面不存在</CardTitle>
          <CardDescription>{pathname}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/" />}>
            返回首页
          </Button>
        </CardContent>
      </Card>
    )
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">旧工程无对应页面</Badge>
          <span className="text-xs text-muted-foreground">
            {route.component}
          </span>
        </div>
        <CardTitle>{route.meta?.title || "功能页面"}</CardTitle>
        <CardDescription>{pathname}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <Construction className="size-10" />
        <p>
          该菜单来自后端，但提供的 plus-ui 源码中没有对应页面或
          API，未新增虚构业务逻辑。
        </p>
      </CardContent>
    </Card>
  )
}
