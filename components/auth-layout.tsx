/* eslint-disable @next/next/no-img-element */
import { env } from "@/lib/env"

const COPYRIGHT = "Copyright © 2018-2026 疯狂的狮子Li All Rights Reserved."

/**
 * 登录、注册等认证页的左右分栏布局，左侧品牌区仅桌面端显示
 * @param children 右侧表单内容
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh lg:grid-cols-[minmax(0,1.1fr)_minmax(28rem,1fr)]">
      {/* 1. 左侧品牌区 */}
      <section className="login-aurora-bg relative isolate hidden overflow-hidden p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="login-aurora-orb login-aurora-orb-primary" />
          <div className="login-aurora-orb login-aurora-orb-violet" />
          <div className="login-aurora-orb login-aurora-orb-cyan" />
          <div className="login-aurora-grid absolute inset-0" />
        </div>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="size-9 rounded-lg" />
          <span className="text-lg font-semibold">{env.logoTitle}</span>
        </div>
        <div className="my-auto max-w-lg animate-in duration-700 fade-in-0 fill-mode-both slide-in-from-bottom-4">
          <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance">
            {env.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            多租户、权限、工作流与代码生成一体化的后台管理平台
          </p>
        </div>
        <p className="text-xs text-white/45">{COPYRIGHT}</p>
      </section>

      {/* 2. 右侧表单区，移动端独占整屏 */}
      <section className="flex flex-col bg-background px-6 py-8 sm:px-10">
        <div className="flex items-center gap-2 lg:hidden">
          <img src="/logo.png" alt="" className="size-8 rounded-lg" />
          <span className="font-semibold">{env.logoTitle}</span>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          {children}
        </div>
        <p className="text-center text-xs text-muted-foreground lg:hidden">
          {COPYRIGHT}
        </p>
      </section>
    </main>
  )
}
