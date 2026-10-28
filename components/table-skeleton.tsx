import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

/**
 * 表格加载骨架，按列数和行数渲染占位行，避免加载前后表格高度跳变
 * @param columns 列数，需与表头一致
 * @param rows 行数，一般传当前分页条数
 */
export function TableSkeleton({
  columns,
  rows = 10,
}: {
  columns: number
  rows?: number
}) {
  return Array.from({ length: rows }, (_, row) => (
    <TableRow key={row} className="hover:bg-transparent">
      {Array.from({ length: columns }, (_, column) => (
        <TableCell key={column}>
          <Skeleton
            className="h-4"
            // 错开每列宽度，看起来更接近真实数据
            style={{ width: `${55 + ((row + column * 3) % 4) * 12}%` }}
          />
        </TableCell>
      ))}
    </TableRow>
  ))
}

/** 数据行淡入动画样式，加载完成后挂到 TableRow 上 */
export const TABLE_ROW_ENTER_CLASS =
  "animate-in fade-in-0 duration-300 fill-mode-both"
