import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** 查询区表单网格，统一列数和间距 */
export const QUERY_GRID_CLASS =
  "grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"

/**
 * 查询区单个条件，标签与输入框同行显示
 * @param label 标签文字
 * @param htmlFor 关联的输入框 id
 * @param wide 是否占两列，日期范围等较长内容使用
 * @param className 额外样式
 */
export function QueryField({
  label,
  htmlFor,
  wide = false,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  wide?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        wide && "sm:col-span-2",
        className
      )}
    >
      <Label
        htmlFor={htmlFor}
        className="w-16 shrink-0 justify-end text-right text-muted-foreground"
      >
        {label}
      </Label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/**
 * 查询区按钮容器，靠右对齐并占满剩余位置
 * @param children 查询、重置等按钮
 */
export function QueryActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 sm:col-[-2/-1]">
      {children}
    </div>
  )
}
