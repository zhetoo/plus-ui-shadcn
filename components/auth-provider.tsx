"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { getInfo, login as loginApi, logout as logoutApi } from "@/api/login"
import { getRouters } from "@/api/menu"
import type { LoginData } from "@/api/types"
import type { UserVO } from "@/api/system/user/types"
import type { AppRoute } from "@/types/route"
import { getToken, removeToken, setToken } from "@/utils/auth"
import { isRelogin } from "@/utils/request"

interface AuthState {
  user: UserVO | null
  roles: string[]
  permissions: string[]
  routes: AppRoute[]
}

interface AuthContextValue extends AuthState {
  loading: boolean
  signIn: (data: LoginData) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const EMPTY_STATE: AuthState = {
  user: null,
  roles: [],
  permissions: [],
  routes: [],
}
const AuthContext = React.createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = React.useState<AuthState>(EMPTY_STATE)
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async () => {
    const [userResponse, routeResponse] = await Promise.all([
      getInfo(),
      getRouters(),
    ])
    const info = userResponse.data
    setState({
      user: info.user,
      roles: info.roles?.length ? info.roles : ["ROLE_DEFAULT"],
      permissions: info.permissions ?? [],
      routes: routeResponse.data ?? [],
    })
  }, [])

  const clearSession = React.useCallback(() => {
    removeToken()
    setState(EMPTY_STATE)
    isRelogin.show = false
  }, [])

  const signIn = React.useCallback(
    async (data: LoginData) => {
      const response = await loginApi(data)
      setToken(response.data.access_token)
      await refresh()
    },
    [refresh]
  )

  const signOut = React.useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      clearSession()
      router.replace("/login")
    }
  }, [clearSession, router])

  React.useEffect(() => {
    let active = true
    async function restoreSession() {
      if (!getToken()) {
        if (active) setLoading(false)
        return
      }
      try {
        await refresh()
      } catch {
        clearSession()
      } finally {
        if (active) setLoading(false)
      }
    }
    void restoreSession()
    return () => {
      active = false
    }
  }, [clearSession, refresh])

  React.useEffect(() => {
    function handleExpiredSession() {
      const redirect = encodeURIComponent(pathname || "/")
      clearSession()
      router.replace(`/login?redirect=${redirect}`)
    }
    window.addEventListener("auth:expired", handleExpiredSession)
    return () =>
      window.removeEventListener("auth:expired", handleExpiredSession)
  }, [clearSession, pathname, router])

  const value = React.useMemo<AuthContextValue>(
    () => ({
      ...state,
      loading,
      signIn,
      signOut,
      refresh,
      hasPermission: (permission) =>
        state.permissions.includes("*:*:*") ||
        state.permissions.includes(permission),
    }),
    [loading, refresh, signIn, signOut, state]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error("useAuth 必须在 AuthProvider 内使用")
  return context
}
