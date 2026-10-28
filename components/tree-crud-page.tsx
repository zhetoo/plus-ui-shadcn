"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Edit,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { CheckboxTree, type TreeOption } from "@/components/tree-controls"
import {
  TableSkeleton,
  TABLE_ROW_ENTER_CLASS,
} from "@/components/table-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { CrudConfig, CrudField, CrudOption } from "@/lib/crud"

type TreeRow = Record<string, unknown> & { children?: TreeRow[] }

interface TreeResponse {
  data?: TreeRow[]
  rows?: TreeRow[]
}

function flattenInput(rows: TreeRow[]): TreeRow[] {
  return rows.flatMap((row) => [row, ...flattenInput(row.children ?? [])])
}

// 后端列表返回平面结构，按 parentId 还原旧前端使用的树。
function buildTree(rows: TreeRow[], idKey: string): TreeRow[] {
  const source = flattenInput(rows)
  const nodes = new Map<string, TreeRow>(
    source.map((row): [string, TreeRow] => [
      String(row[idKey]),
      { ...row, children: [] },
    ])
  )
  const roots: TreeRow[] = []
  for (const row of source) {
    const node = nodes.get(String(row[idKey]))!
    const parent = nodes.get(String(row.parentId ?? ""))
    if (parent && parent !== node) parent.children?.push(node)
    else roots.push(node)
  }
  return roots
}

function collectIds(rows: TreeRow[], idKey: string): string[] {
  return rows.flatMap((row) => [
    String(row[idKey]),
    ...collectIds(row.children ?? [], idKey),
  ])
}

function visibleRows(
  rows: TreeRow[],
  idKey: string,
  expanded: Set<string>,
  depth = 0
): Array<{ row: TreeRow; depth: number }> {
  return rows.flatMap((row) => {
    const id = String(row[idKey])
    return [
      { row, depth },
      ...(expanded.has(id)
        ? visibleRows(row.children ?? [], idKey, expanded, depth + 1)
        : []),
    ]
  })
}

function toTreeOptions(
  rows: TreeRow[],
  idKey: string,
  nameKey: string
): TreeOption[] {
  return rows.map((row) => ({
    id: String(row[idKey]),
    label: String(row[nameKey] ?? row[idKey]),
    children: toTreeOptions(row.children ?? [], idKey, nameKey),
  }))
}

function cellText(value: unknown, format?: string) {
  if (value === null || value === undefined || value === "") return "-"
  if (format === "datetime") {
    const date = new Date(String(value))
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString("zh-CN", { hour12: false })
  }
  return String(value)
}

function required(field: CrudField, form: Record<string, unknown>) {
  return typeof field.required === "function"
    ? field.required(form)
    : field.required
}

function FormControl({
  field,
  value,
  options,
  onChange,
}: {
  field: CrudField
  value: unknown
  options?: CrudOption[]
  onChange: (value: unknown) => void
}) {
  const text = value === null || value === undefined ? "" : String(value)
  if (field.type === "select")
    return (
      <Select
        value={text || null}
        onValueChange={(next) => next && onChange(next)}
      >
        <SelectTrigger className="w-full">
          <span className={text ? "" : "text-muted-foreground"}>
            {options?.find((option) => option.value === text)?.label ||
              field.placeholder ||
              `请选择${field.label}`}
          </span>
        </SelectTrigger>
        <SelectContent>
          {options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  if (field.type === "textarea")
    return (
      <Textarea
        value={text}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  return (
    <Input
      type={field.type === "number" ? "number" : "text"}
      value={text}
      placeholder={field.placeholder}
      onChange={(event) =>
        onChange(
          field.type === "number" && event.target.value !== ""
            ? Number(event.target.value)
            : event.target.value
        )
      }
    />
  )
}

export function TreeCrudPage({
  config,
  nameKey,
  cascadeRemove,
  defaultExpanded = true,
}: {
  config: CrudConfig
  nameKey: string
  cascadeRemove?: (ids: string[]) => Promise<unknown>
  defaultExpanded?: boolean
}) {
  const { hasPermission } = useAuth()
  const [queryDraft, setQueryDraft] = React.useState<Record<string, unknown>>(
    {}
  )
  const [query, setQuery] = React.useState<Record<string, unknown>>({})
  const [rows, setRows] = React.useState<TreeRow[]>([])
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState<Record<string, unknown>>(
    config.defaultForm ?? {}
  )
  const [options, setOptions] = React.useState<Record<string, CrudOption[]>>({})
  const [queryOptions, setQueryOptions] = React.useState<
    Record<string, CrudOption[]>
  >({})
  const [saving, setSaving] = React.useState(false)
  const [cascadeOpen, setCascadeOpen] = React.useState(false)
  const [cascadeIds, setCascadeIds] = React.useState<string[]>([])

  const canAdd = hasPermission(`${config.permissionPrefix}:add`)
  const canEdit = hasPermission(`${config.permissionPrefix}:edit`)
  const canRemove = hasPermission(`${config.permissionPrefix}:remove`)
  const allIds = React.useMemo(
    () => collectIds(rows, config.idKey),
    [config.idKey, rows]
  )
  const flattened = React.useMemo(
    () => visibleRows(rows, config.idKey, expanded),
    [config.idKey, expanded, rows]
  )

  const loadRows = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = (await config.list(query)) as TreeResponse
      const nextRows = buildTree(
        response.rows ?? response.data ?? [],
        config.idKey
      )
      setRows(nextRows)
      setExpanded(
        defaultExpanded
          ? new Set(collectIds(nextRows, config.idKey))
          : new Set()
      )
    } finally {
      setLoading(false)
    }
  }, [config, defaultExpanded, query])

  React.useEffect(() => {
    void loadRows()
  }, [loadRows])

  React.useEffect(() => {
    void Promise.all(
      config.queryFields.map(
        async (field) =>
          [
            field.key,
            field.loadOptions
              ? await field.loadOptions({})
              : (field.options ?? []),
          ] as const
      )
    ).then((entries) => setQueryOptions(Object.fromEntries(entries)))
  }, [config])

  async function loadOptions(values: Record<string, unknown>) {
    const entries = await Promise.all(
      config.formFields.map(
        async (field) =>
          [
            field.key,
            field.loadOptions
              ? await field.loadOptions(values)
              : (field.options ?? []),
          ] as const
      )
    )
    setOptions(Object.fromEntries(entries))
  }

  async function openCreate(parentId?: string) {
    const next = {
      ...(config.defaultForm ?? {}),
      ...(parentId ? { parentId } : {}),
    }
    setForm(next)
    await loadOptions(next)
    setDialogOpen(true)
  }

  async function openEdit(row: TreeRow) {
    if (!config.detail) return
    const response = (await config.detail(row[config.idKey])) as {
      data?: Record<string, unknown>
    }
    const next = response.data ?? row
    setForm(next)
    await loadOptions(next)
    setDialogOpen(true)
  }

  async function save() {
    const missing = config.formFields.find(
      (field) =>
        field.visible?.(form) !== false &&
        required(field, form) &&
        (form[field.key] === "" || form[field.key] === undefined)
    )
    if (missing) return toast.error(`请填写${missing.label}`)
    setSaving(true)
    try {
      const id = form[config.idKey]
      if (id && config.update) await config.update(form)
      else if (config.create) await config.create(form)
      toast.success(id ? "修改成功" : "新增成功")
      setDialogOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  async function remove(row: TreeRow) {
    if (!config.remove) return
    const name = String(row[nameKey] ?? "该记录")
    if (!window.confirm(`确认删除“${name}”吗？`)) return
    await config.remove(row[config.idKey])
    toast.success("删除成功")
    await loadRows()
  }

  async function confirmCascade() {
    if (!cascadeRemove || !cascadeIds.length) return
    if (!window.confirm(`确认级联删除选中的 ${cascadeIds.length} 个菜单吗？`))
      return
    await cascadeRemove(cascadeIds)
    toast.success("级联删除成功")
    setCascadeOpen(false)
    setCascadeIds([])
    await loadRows()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              setQuery({ ...queryDraft })
            }}
          >
            {config.queryFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}</Label>
                <FormControl
                  field={field}
                  value={queryDraft[field.key]}
                  options={queryOptions[field.key]}
                  onChange={(value) =>
                    setQueryDraft((current) => ({
                      ...current,
                      [field.key]: value,
                    }))
                  }
                />
              </div>
            ))}
            <div className="flex items-end gap-2">
              <Button type="submit">
                <Search />
                查询
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQueryDraft({})
                  setQuery({})
                }}
              >
                <RefreshCw />
                重置
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardDescription>共 {allIds.length} 个节点</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canAdd && (
              <Button onClick={() => void openCreate()}>
                <Plus />
                新增
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                setExpanded(
                  allIds.every((id) => expanded.has(id))
                    ? new Set()
                    : new Set(allIds)
                )
              }
            >
              <ChevronsUpDown />
              展开/折叠
            </Button>
            {cascadeRemove && canRemove && (
              <Button variant="outline" onClick={() => setCascadeOpen(true)}>
                <Trash2 />
                级联删除
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {config.columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton columns={config.columns.length + 1} rows={8} />
              ) : flattened.length ? (
                flattened.map(({ row, depth }) => {
                  const id = String(row[config.idKey])
                  const hasChildren = Boolean(row.children?.length)
                  return (
                    <TableRow key={id} className={TABLE_ROW_ENTER_CLASS}>
                      {config.columns.map((column) => (
                        <TableCell key={column.key}>
                          {column.key === nameKey ? (
                            <div
                              className="flex items-center gap-1"
                              style={{ paddingLeft: depth * 18 }}
                            >
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                disabled={!hasChildren}
                                aria-label={expanded.has(id) ? "收起" : "展开"}
                                onClick={() =>
                                  setExpanded((current) => {
                                    const next = new Set(current)
                                    if (next.has(id)) next.delete(id)
                                    else next.add(id)
                                    return next
                                  })
                                }
                              >
                                {hasChildren &&
                                  (expanded.has(id) ? (
                                    <ChevronDown />
                                  ) : (
                                    <ChevronRight />
                                  ))}
                              </Button>
                              <span>{cellText(row[column.key])}</span>
                            </div>
                          ) : column.format === "status" ? (
                            <Badge
                              variant={
                                String(row[column.key]) === "0"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {String(row[column.key]) === "0"
                                ? "正常"
                                : "停用"}
                            </Badge>
                          ) : (
                            cellText(row[column.key], column.format)
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="修改"
                              onClick={() => void openEdit(row)}
                            >
                              <Edit />
                            </Button>
                          )}
                          {canAdd && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="新增下级"
                              onClick={() => void openCreate(id)}
                            >
                              <Plus />
                            </Button>
                          )}
                          {canRemove && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="删除"
                              onClick={() => void remove(row)}
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={config.columns.length + 1}
                    className="h-32 text-center text-muted-foreground"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {form[config.idKey]
                ? `修改${config.title.replace("管理", "")}`
                : `新增${config.title.replace("管理", "")}`}
            </DialogTitle>
            <DialogDescription>
              字段与提交接口保持与旧前端一致。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {config.formFields
              .filter((field) => field.visible?.(form) !== false)
              .map((field) => (
                <div
                  key={field.key}
                  className={
                    field.type === "textarea"
                      ? "space-y-2 sm:col-span-2"
                      : "space-y-2"
                  }
                >
                  <Label>
                    {field.label}
                    {required(field, form) ? " *" : ""}
                  </Label>
                  <FormControl
                    field={field}
                    value={form[field.key]}
                    options={options[field.key]}
                    onChange={(value) => {
                      const next = { ...form, [field.key]: value }
                      setForm(next)
                      if (field.key === "parentId") void loadOptions(next)
                    }}
                  />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving && <LoaderCircle className="animate-spin" />}确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cascadeOpen} onOpenChange={setCascadeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>级联删除菜单</DialogTitle>
            <DialogDescription>
              选择菜单后将同时删除其下级节点。
            </DialogDescription>
          </DialogHeader>
          <CheckboxTree
            nodes={toTreeOptions(rows, config.idKey, nameKey)}
            value={cascadeIds}
            onChange={setCascadeIds}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCascadeOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={!cascadeIds.length}
              onClick={() => void confirmCascade()}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
