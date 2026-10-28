"use client"

import * as React from "react"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import { env } from "@/lib/env"
import { getToken } from "@/utils/auth"

interface NoticeItem {
  id: number
  message: string
  time: string
  read: boolean
}

export function NoticeMenu() {
  const [notices, setNotices] = React.useState<NoticeItem[]>([])

  React.useEffect(() => {
    const token = getToken()
    if (!token) return
    let eventSource: EventSource | undefined
    let socket: WebSocket | undefined
    let heartbeat: number | undefined

    function addNotice(message: string) {
      const notice = {
        id: Date.now(),
        message,
        time: new Date().toLocaleString("zh-CN"),
        read: false,
      }
      setNotices((current) => [notice, ...current])
      toast.success(message, { description: "实时消息" })
    }

    const query = `Authorization=${encodeURIComponent(`Bearer ${token}`)}&clientid=${encodeURIComponent(env.clientId)}`
    if (env.sse) {
      eventSource = new EventSource(`${env.baseApi}/resource/sse?${query}`)
      eventSource.onmessage = (event) => event.data && addNotice(event.data)
    }
    if (env.websocket) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      socket = new WebSocket(
        `${protocol}//${window.location.host}${env.baseApi}/resource/websocket?${query}`
      )
      socket.onmessage = (event) => {
        if (!String(event.data).includes("ping")) addNotice(String(event.data))
      }
      heartbeat = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN)
          socket.send(JSON.stringify({ type: "ping" }))
      }, 10_000)
    }

    return () => {
      eventSource?.close()
      socket?.close()
      window.clearInterval(heartbeat)
    }
  }, [])

  const unread = notices.filter((item) => !item.read).length
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" />}
      >
        <Bell />
        {unread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
            {unread}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            实时消息
            <span className="text-xs font-normal text-muted-foreground">
              {unread} 条未读
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {notices.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            暂无消息
          </div>
        ) : (
          notices.slice(0, 8).map((notice) => (
            <DropdownMenuItem
              key={notice.id}
              className="flex-col items-start gap-1 py-2"
              onClick={() =>
                setNotices((current) =>
                  current.map((item) =>
                    item.id === notice.id ? { ...item, read: true } : item
                  )
                )
              }
            >
              <span
                className={
                  notice.read ? "text-muted-foreground" : "font-medium"
                }
              >
                {notice.message}
              </span>
              <span className="text-xs text-muted-foreground">
                {notice.time}
              </span>
            </DropdownMenuItem>
          ))
        )}
        {notices.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="grid grid-cols-2 gap-1 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setNotices((current) =>
                    current.map((item) => ({ ...item, read: true }))
                  )
                }
              >
                <CheckCheck />
                全部已读
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setNotices([])}>
                <Trash2 />
                清空
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
