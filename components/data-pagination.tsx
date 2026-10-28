"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

type PageItem = number | "start-ellipsis" | "end-ellipsis"

interface DataPaginationProps {
  pageNum: number
  pageSize: number
  total: number
  onPageChange: (pageNum: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizes?: number[]
}

function getPageItems(pageNum: number, totalPages: number): PageItem[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  if (pageNum <= 4) return [1, 2, 3, 4, 5, "end-ellipsis", totalPages]
  if (pageNum >= totalPages - 3)
    return [
      1,
      "start-ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  return [
    1,
    "start-ellipsis",
    pageNum - 1,
    pageNum,
    pageNum + 1,
    "end-ellipsis",
    totalPages,
  ]
}

export function DataPagination({
  pageNum,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 30, 50],
}: DataPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const [jumpPage, setJumpPage] = React.useState(String(pageNum))

  React.useEffect(() => setJumpPage(String(pageNum)), [pageNum])

  function submitJump() {
    const nextPage = Math.min(totalPages, Math.max(1, Number(jumpPage) || 1))
    setJumpPage(String(nextPage))
    onPageChange(nextPage)
  }

  if (total <= 0) return null

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>共 {total} 条</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => value && onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-24" aria-label="每页条数">
            <span>{pageSize} 条/页</span>
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} 条/页
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="上一页"
          disabled={pageNum <= 1}
          onClick={() => onPageChange(pageNum - 1)}
        >
          <ChevronLeft />
        </Button>
        {getPageItems(pageNum, totalPages).map((item) =>
          typeof item === "number" ? (
            <Button
              key={item}
              variant={item === pageNum ? "default" : "outline"}
              size="icon-sm"
              aria-label={`第 ${item} 页`}
              aria-current={item === pageNum ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ) : (
            <span
              key={item}
              className="flex size-8 items-center justify-center text-muted-foreground"
            >
              <MoreHorizontal className="size-4" />
            </span>
          )
        )}
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="下一页"
          disabled={pageNum >= totalPages}
          onClick={() => onPageChange(pageNum + 1)}
        >
          <ChevronRight />
        </Button>
        <span className="ml-2 text-sm text-muted-foreground">前往</span>
        <Input
          className="h-8 w-16 text-center"
          type="number"
          min={1}
          max={totalPages}
          value={jumpPage}
          aria-label="跳转页码"
          onChange={(event) => setJumpPage(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submitJump()}
        />
        <Button variant="outline" size="sm" onClick={submitJump}>
          跳转
        </Button>
      </div>
    </div>
  )
}
