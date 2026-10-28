"use client"

import { env } from "@/lib/env"

export function ExternalPage({ type }: { type: "monitor" | "snailjob" }) {
  const src = type === "monitor" ? env.monitorAdmin : env.snailJobAdmin
  const title = type === "monitor" ? "服务监控" : "任务调度"
  return (
    <iframe
      title={title}
      src={src}
      className="h-[calc(100svh-7rem)] w-full rounded-xl border bg-white"
    />
  )
}
