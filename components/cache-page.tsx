"use client"

import * as React from "react"
import { Database, LoaderCircle, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { clearCacheAll, getCache } from "@/api/monitor/cache"
import type { CacheVO } from "@/api/monitor/cache/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function CachePage() {
  const [cache, setCache] = React.useState<CacheVO | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await getCache()
      setCache(response.data)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  async function clearAll() {
    if (!window.confirm("确认清空全部缓存吗？")) return
    await clearCacheAll()
    toast.success("缓存已清空")
    await load()
  }

  if (loading && !cache)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoaderCircle className="animate-spin" />
      </div>
    )

  const info = cache?.info ?? {}
  const cpu = Number.parseFloat(info.used_cpu_user_children ?? "")
  const cards = [
    ["Redis 版本", info.redis_version || "-"],
    [
      "运行模式",
      info.redis_mode === "standalone" ? "单机" : info.redis_mode || "-",
    ],
    ["端口", info.tcp_port || "-"],
    ["客户端数", info.connected_clients || "-"],
    ["运行天数", info.uptime_in_days || "-"],
    ["使用内存", info.used_memory_human || "-"],
    ["CPU 负载", Number.isNaN(cpu) ? "-" : cpu.toFixed(2)],
    ["内存配置", info.maxmemory_human || "-"],
    ["AOF 是否开启", info.aof_enabled === "0" ? "否" : "是"],
    ["RDB 状态", info.rdb_last_bgsave_status || "-"],
    ["缓存键数量", cache?.dbSize ?? 0],
    [
      "网络入口/出口",
      `${info.instantaneous_input_kbps || "0"}kps / ${
        info.instantaneous_output_kbps || "0"
      }kps`,
    ],
  ]

  // 命令统计按调用次数倒序，便于看出热点命令
  const commandStats = [...(cache?.commandStats ?? [])].sort(
    (a, b) => Number(b.value) - Number(a.value)
  )
  const maxCommand = Math.max(
    1,
    ...commandStats.map((item) => Number(item.value))
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">缓存监控</h1>
          <p className="text-sm text-muted-foreground">
            查看 Redis 运行信息和命令统计
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw />
            刷新
          </Button>
          <Button variant="destructive" onClick={() => void clearAll()}>
            <Trash2 />
            清空缓存
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <Database className="size-4 text-muted-foreground" />
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {cards.map(([label, value]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2.5"
              >
                <dt className="shrink-0 text-sm text-muted-foreground">
                  {label}
                </dt>
                <dd className="truncate text-right font-medium tabular-nums">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>命令统计</CardTitle>
          <CardDescription>Redis 命令调用次数</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>命令</TableHead>
                <TableHead>调用次数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandStats.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="w-40 font-mono text-xs">
                    {item.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* 按最大调用次数折算比例条宽度 */}
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{
                            width: `${(Number(item.value) / maxCommand) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-20 text-right tabular-nums">
                        {item.value}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
