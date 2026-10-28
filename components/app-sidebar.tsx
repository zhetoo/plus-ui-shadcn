"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"
import {
  Activity,
  Bell,
  Blocks,
  BookOpen,
  BookOpenCheck,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleDot,
  Code2,
  Database,
  FileText,
  FlaskConical,
  Gauge,
  Globe2,
  LayoutDashboard,
  ListTree,
  LogIn,
  Logs,
  Network,
  Package,
  Settings,
  SlidersHorizontal,
  SquareCheckBig,
  Star,
  Upload,
  UserRound,
  UsersRound,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { env } from "@/lib/env"
import type { AppRoute } from "@/types/route"

const routeIcons: Record<string, LucideIcon> = {
  system: Settings,
  monitor: Activity,
  tool: Wrench,
  star: Star,
  checkbox: SquareCheckBig,
  guide: BookOpen,
  user: UserRound,
  peoples: UsersRound,
  "tree-table": ListTree,
  tree: Network,
  post: BriefcaseBusiness,
  dict: BookOpenCheck,
  edit: SlidersHorizontal,
  message: Bell,
  log: Logs,
  online: Wifi,
  redis: Database,
  code: Code2,
  international: Globe2,
  dashboard: LayoutDashboard,
  upload: Upload,
  job: CalendarClock,
  form: FileText,
  logininfo: LogIn,
  company: Building2,
  tenant: Building2,
  package: Package,
  bot: Bot,
  "#": FlaskConical,
}

function RouteIcon({
  name,
  fallback = CircleDot,
}: {
  name?: string
  fallback?: LucideIcon
}) {
  const Icon = (name && routeIcons[name.toLowerCase()]) || fallback
  return <Icon />
}

function joinRoutePath(parent: string, path: string) {
  if (/^https?:\/\//.test(path)) return path
  if (path.startsWith("/")) return path
  return `${parent}/${path}`.replace(/\/{2,}/g, "/")
}

function routeContainsPath(
  route: AppRoute,
  parentPath: string,
  pathname: string
): boolean {
  const href = route.meta?.link || joinRoutePath(parentPath, route.path)
  return (
    href === pathname ||
    (route.children ?? []).some((child) =>
      routeContainsPath(child, href, pathname)
    )
  )
}

function renderRouteLink(href: string) {
  return /^https?:\/\//.test(href) ? (
    <a href={href} target="_blank" rel="noreferrer" />
  ) : (
    <Link href={href} />
  )
}

function RouteSubItem({
  route,
  parentPath,
  pathname,
}: {
  route: AppRoute
  parentPath: string
  pathname: string
}) {
  const href = route.meta?.link || joinRoutePath(parentPath, route.path)
  const children = route.children?.filter((child) => !child.hidden) ?? []
  const title = route.meta?.title || route.name || route.path
  const active = routeContainsPath(route, parentPath, pathname)
  const [open, setOpen] = React.useState(active)

  React.useEffect(() => {
    if (active) setOpen(true)
  }, [active])

  return (
    <SidebarMenuSubItem>
      {children.length ? (
        <>
          <SidebarMenuSubButton
            render={<button type="button" />}
            className="w-full"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <RouteIcon name={route.meta?.icon} fallback={Blocks} />
            <span>{title}</span>
            <ChevronRight
              className={`ml-auto transition-transform ${open ? "rotate-90" : ""}`}
            />
          </SidebarMenuSubButton>
          {open && (
            <SidebarMenuSub>
              {children.map((child) => (
                <RouteSubItem
                  key={`${href}-${child.path}`}
                  route={child}
                  parentPath={href}
                  pathname={pathname}
                />
              ))}
            </SidebarMenuSub>
          )}
        </>
      ) : (
        <SidebarMenuSubButton render={renderRouteLink(href)} isActive={active}>
          <RouteIcon name={route.meta?.icon} />
          <span>{title}</span>
        </SidebarMenuSubButton>
      )}
    </SidebarMenuSubItem>
  )
}

function RouteMenuItem({
  route,
  pathname,
}: {
  route: AppRoute
  pathname: string
}) {
  const href = route.meta?.link || joinRoutePath("", route.path)
  const children = route.children?.filter((child) => !child.hidden) ?? []
  const title = route.meta?.title || route.name || route.path
  const active = routeContainsPath(route, "", pathname)
  const [open, setOpen] = React.useState(active)

  React.useEffect(() => {
    if (active) setOpen(true)
  }, [active])

  if (children.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={title}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <RouteIcon name={route.meta?.icon} fallback={Blocks} />
          <span>{title}</span>
          <ChevronRight
            className={`ml-auto transition-transform ${open ? "rotate-90" : ""}`}
          />
        </SidebarMenuButton>
        {open && (
          <SidebarMenuSub>
            {children.map((child) => (
              <RouteSubItem
                key={`${href}-${child.path}`}
                route={child}
                parentPath={href}
                pathname={pathname}
              />
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={renderRouteLink(href)}
        tooltip={title}
        isActive={active}
      >
        <RouteIcon name={route.meta?.icon} />
        <span>{title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function RouteItems({
  routes,
  parentPath = "",
}: {
  routes: AppRoute[]
  parentPath?: string
}) {
  const pathname = usePathname()
  return routes
    .filter((route) => !route.hidden)
    .map((route) => (
      <RouteMenuItem
        key={`${parentPath}-${route.path}`}
        route={route}
        pathname={pathname}
      />
    ))
}

export function AppSidebar() {
  const { routes, user } = useAuth()
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b p-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/" />}
              size="lg"
              tooltip={env.logoTitle}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="size-8 rounded-lg" />
              <span className="font-semibold">{env.logoTitle}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>工作台</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/" />} tooltip="首页">
                  <Gauge />
                  <span>首页</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <RouteItems routes={routes} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/user/profile" />}
              tooltip="个人中心"
            >
              <UserRound />
              <span>{user?.nickName || user?.userName || "个人中心"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
