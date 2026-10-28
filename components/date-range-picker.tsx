"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { zhCN } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const DATE_FORMAT = "yyyy-MM-dd"

/**
 * 将 yyyy-MM-dd 字符串转成日期
 * @param value 日期字符串
 * @returns 日期对象，空值返回 undefined
 */
function toDate(value?: string) {
  return value ? parse(value, DATE_FORMAT, new Date()) : undefined
}

/**
 * 日期范围选择器，值与原 type="date" 输入框一致，均为 yyyy-MM-dd 字符串
 * @param value [开始日期, 结束日期]
 * @param onChange 选择后回调，参数同 value
 * @param placeholder 未选择时的提示文字
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "开始日期 ~ 结束日期",
  className,
}: {
  value?: [string?, string?]
  onChange: (value: [string, string]) => void
  placeholder?: string
  className?: string
}) {
  const [begin, end] = value ?? []
  const from = toDate(begin)
  const to = toDate(end)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-normal", className)}
          />
        }
      >
        <CalendarIcon className="text-muted-foreground" />
        {begin || end ? (
          <span className="truncate">
            {begin || "开始日期"} ~ {end || "结束日期"}
          </span>
        ) : (
          <span className="truncate text-muted-foreground">{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          locale={zhCN}
          numberOfMonths={2}
          showOutsideDays={false}
          defaultMonth={from}
          selected={{ from, to }}
          onSelect={(range) =>
            onChange([
              range?.from ? format(range.from, DATE_FORMAT) : "",
              range?.to ? format(range.to, DATE_FORMAT) : "",
            ])
          }
        />
      </PopoverContent>
    </Popover>
  )
}
