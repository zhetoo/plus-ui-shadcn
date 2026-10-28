"use client"

import * as React from "react"
import {
  Download,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { DataPagination } from "@/components/data-pagination"
import { DateRangePicker } from "@/components/date-range-picker"
import {
  QUERY_GRID_CLASS,
  QueryActions,
  QueryField,
} from "@/components/query-field"
import { RichTextEditor } from "@/components/rich-text-editor"
import { CheckboxTree } from "@/components/tree-controls"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { CrudConfig, CrudField, CrudTreeOption } from "@/lib/crud"
import { cn } from "@/lib/utils"
import request, { download } from "@/utils/request"

interface ListResponse {
  data?: unknown
  rows?: unknown[]
  total?: number
}

interface DetailResponse {
  data?: Record<string, unknown>
}

function toText(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (Array.isArray(value)) return value.join("、")
  return String(value)
}

function CellValue({
  value,
  format,
  statusLabels = ["正常", "停用"],
}: {
  value: unknown
  format?: string
  statusLabels?: [string, string]
}) {
  if (format === "status") {
    const active = String(value) === "0"
    return (
      <Badge variant={active ? "secondary" : "destructive"}>
        {active ? statusLabels[0] : statusLabels[1]}
      </Badge>
    )
  }
  if (format === "boolean")
    return <Badge variant="outline">{value ? "是" : "否"}</Badge>
  if (format === "activity")
    return (
      <Badge variant={Number(value) === 1 ? "secondary" : "destructive"}>
        {Number(value) === 1 ? "激活" : "挂起"}
      </Badge>
    )
  if (format === "suspension")
    return (
      <Badge variant={value ? "destructive" : "secondary"}>
        {value ? "挂起" : "激活"}
      </Badge>
    )
  if (format === "link" && typeof value === "string")
    return (
      <a
        className="block max-w-56 truncate text-primary underline-offset-4 hover:underline"
        href={value}
        target="_blank"
        rel="noreferrer"
      >
        {value}
      </a>
    )
  if (format === "resource" && typeof value === "string") {
    const image = /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(value)
    if (image)
      return (
        <a href={value} target="_blank" rel="noreferrer" title="查看原图">
          <span
            role="img"
            aria-label="文件预览"
            className="block size-16 rounded-md border bg-cover bg-center"
            style={{ backgroundImage: `url(${value})` }}
          />
        </a>
      )
    return (
      <a
        className="block max-w-56 truncate text-primary underline-offset-4 hover:underline"
        href={value}
        target="_blank"
        rel="noreferrer"
      >
        {value}
      </a>
    )
  }
  if (format === "datetime" && value) {
    const date = new Date(value as string | number)
    return (
      <>
        {Number.isNaN(date.getTime())
          ? toText(value)
          : date.toLocaleString("zh-CN", { hour12: false })}
      </>
    )
  }
  const text = toText(value)
  // 超长文本截断，悬停显示完整内容
  if (text.length > 24)
    return (
      <span className="block max-w-48 truncate" title={text}>
        {text}
      </span>
    )
  return <>{text}</>
}

function FieldControl({
  field,
  value,
  onChange,
  options = field.options,
  treeOptions,
  linked,
  onLinkedChange,
  disabled = false,
}: {
  field: CrudField
  value: unknown
  onChange: (value: unknown) => void
  options?: CrudField["options"]
  treeOptions?: CrudTreeOption[]
  linked?: boolean
  onLinkedChange?: (linked: boolean) => void
  disabled?: boolean
}) {
  const text = Array.isArray(value)
    ? value.join(",")
    : value === null || value === undefined
      ? ""
      : String(value)
  if (field.type === "boolean")
    return (
      <Switch
        disabled={disabled}
        checked={Boolean(value)}
        onCheckedChange={onChange}
      />
    )
  if (field.type === "array" && options?.length) {
    const selected = new Set(
      Array.isArray(value)
        ? value.map(String)
        : text
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
    )
    return (
      <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
        {options.map((option) => (
          <Label
            key={option.value}
            className="flex items-center gap-2 font-normal"
          >
            <Checkbox
              disabled={disabled}
              checked={selected.has(option.value)}
              onCheckedChange={(checked) => {
                const next = new Set(selected)
                if (checked) next.add(option.value)
                else next.delete(option.value)
                onChange([...next])
              }}
            />
            {option.label}
          </Label>
        ))}
      </div>
    )
  }
  if (field.type === "tree")
    return (
      <CheckboxTree
        nodes={treeOptions ?? []}
        value={Array.isArray(value) ? value.map(String) : []}
        linked={linked}
        onLinkedChange={onLinkedChange}
        onChange={onChange}
      />
    )
  if (field.type === "select") {
    return (
      <Select
        disabled={disabled}
        value={text || null}
        onValueChange={(next) => onChange(next ?? "")}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={field.placeholder || `请选择${field.label}`}
          />
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
  }
  if (field.type === "textarea")
    return (
      <Textarea
        disabled={disabled}
        value={text}
        placeholder={field.placeholder || `请输入${field.label}`}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  if (field.type === "richtext")
    return <RichTextEditor value={text} onChange={onChange} />
  return (
    <Input
      disabled={disabled}
      type={
        field.type === "password"
          ? "password"
          : field.type === "number"
            ? "number"
            : field.type === "date"
              ? "date"
              : "text"
      }
      value={text}
      placeholder={field.placeholder || `请输入${field.label}`}
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

function normalizeFields(values: Record<string, unknown>, fields: CrudField[]) {
  const result = { ...values }
  for (const field of fields) {
    if (field.type === "array" && typeof result[field.key] === "string") {
      result[field.key] = (result[field.key] as string)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }
  for (const [key, value] of Object.entries({ ...result })) {
    if (!key.includes(".")) continue
    delete result[key]
    const parts = key.split(".")
    let target = result
    for (const part of parts.slice(0, -1)) {
      if (!target[part] || typeof target[part] !== "object") target[part] = {}
      target = target[part] as Record<string, unknown>
    }
    target[parts.at(-1)!] = value
  }
  return result
}

export function CrudPage({
  config,
  onRowClick,
  selectedRowId,
}: {
  config: CrudConfig
  onRowClick?: (row: Record<string, unknown>) => void
  selectedRowId?: string
}) {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [queryDraft, setQueryDraft] = React.useState<Record<string, unknown>>(
    {}
  )
  const [query, setQuery] = React.useState<Record<string, unknown>>({})
  const [rows, setRows] = React.useState<Record<string, unknown>[]>([])
  const [pageNum, setPageNum] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState<Record<string, unknown>>(
    config.defaultForm ?? {}
  )
  const [runningAction, setRunningAction] = React.useState(false)
  const [viewRow, setViewRow] = React.useState<Record<string, unknown> | null>(
    null
  )
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [dynamicOptions, setDynamicOptions] = React.useState<
    Record<string, NonNullable<CrudField["options"]>>
  >({})
  const [dynamicTreeOptions, setDynamicTreeOptions] = React.useState<
    Record<string, CrudTreeOption[]>
  >({})
  const [queryOptions, setQueryOptions] = React.useState<
    Record<string, NonNullable<CrudField["options"]>>
  >({})

  const allowed = React.useCallback(
    (action: string) => hasPermission(`${config.permissionPrefix}:${action}`),
    [config.permissionPrefix, hasPermission]
  )

  const loadRows = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = (await config.list({
        pageNum,
        pageSize,
        ...normalizeFields(query, config.queryFields),
        ...(config.fixedQuery ?? {}),
      })) as ListResponse
      const dataRows = Array.isArray(response.rows)
        ? response.rows
        : Array.isArray(response.data)
          ? response.data
          : []
      setRows(dataRows as Record<string, unknown>[])
      setTotal(response.total ?? dataRows.length)
      setSelectedIds(new Set())
    } catch {
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [config, pageNum, pageSize, query])

  React.useEffect(() => {
    void loadRows()
  }, [loadRows])

  React.useEffect(() => {
    let active = true
    void Promise.all(
      config.queryFields
        .filter((field) => field.loadOptions)
        .map(
          async (field) => [field.key, await field.loadOptions!({})] as const
        )
    ).then((entries) => {
      if (active) setQueryOptions(Object.fromEntries(entries))
    })
    return () => {
      active = false
    }
  }, [config])

  async function loadFormOptions(nextForm: Record<string, unknown>) {
    const [entries, treeEntries] = await Promise.all([
      Promise.all(
        config.formFields
          .filter((field) => field.loadOptions)
          .map(
            async (field) =>
              [field.key, await field.loadOptions!(nextForm)] as const
          )
      ),
      Promise.all(
        config.formFields
          .filter((field) => field.loadTreeOptions)
          .map(
            async (field) =>
              [field.key, await field.loadTreeOptions!(nextForm)] as const
          )
      ),
    ])
    setDynamicOptions(Object.fromEntries(entries))
    setDynamicTreeOptions(Object.fromEntries(treeEntries))
  }

  async function openCreate() {
    if (config.createHref) {
      router.push(config.createHref)
      return
    }
    const initialForm = {
      ...(config.defaultForm ?? {}),
      ...((await config.loadDefaultForm?.()) ?? {}),
    }
    const nextForm = config.deriveForm
      ? config.deriveForm(initialForm)
      : initialForm
    setForm(nextForm)
    await loadFormOptions(nextForm)
    setDialogOpen(true)
  }

  async function openEdit(row: Record<string, unknown>) {
    if (config.editHref) {
      router.push(config.editHref(row))
      return
    }
    if (config.detail) {
      const response = (await config.detail(
        row[config.idKey]
      )) as DetailResponse
      const nextForm = response.data ?? row
      setForm(nextForm)
      await loadFormOptions(nextForm)
    } else {
      setForm(row)
      await loadFormOptions(row)
    }
    setDialogOpen(true)
  }

  async function save() {
    for (const field of config.formFields) {
      if (field.visible && !field.visible(form)) continue
      const required =
        typeof field.required === "function"
          ? field.required(form)
          : field.required
      const value = form[field.key]
      if (
        required &&
        (value === "" ||
          value === undefined ||
          value === null ||
          (Array.isArray(value) && value.length === 0))
      ) {
        toast.error(`请填写${field.label}`)
        return
      }
    }
    const editing =
      form[config.idKey] !== undefined && form[config.idKey] !== null
    const action = editing ? config.update : config.create
    if (!action) return
    setSaving(true)
    try {
      const normalized = normalizeFields(
        { ...(config.fixedQuery ?? {}), ...form },
        config.formFields
      )
      const payload = config.preparePayload
        ? config.preparePayload(normalized)
        : normalized
      await action(payload)
      toast.success(editing ? "修改成功" : "新增成功")
      setDialogOpen(false)
      await loadRows()
    } finally {
      setSaving(false)
    }
  }

  async function remove(row: Record<string, unknown>) {
    const label = config.removeLabel ?? "删除"
    if (
      !config.remove ||
      !window.confirm(
        config.removeConfirm?.(row) ??
          `确认${label}“${toText(row[config.idKey])}”吗？`
      )
    )
      return
    await config.remove(row[config.idKey])
    toast.success(`${label}成功`)
    await loadRows()
  }

  async function changeStatus(row: Record<string, unknown>, status: string) {
    if (!config.statusChange) return
    await config.statusChange(row, status)
    toast.success("状态修改成功")
    await loadRows()
  }

  async function runRowAction(
    action: NonNullable<CrudConfig["rowActions"]>[number],
    row: Record<string, unknown>
  ) {
    if (action.render?.(row) === "dialog") {
      setViewRow(row)
      return
    }
    const href = action.href?.(row)
    if (href) {
      router.push(href)
      return
    }
    if (!action.run || (action.confirm && !window.confirm(action.confirm(row))))
      return
    setRunningAction(true)
    try {
      await action.run(row)
      if (action.successMessage !== false)
        toast.success(action.successMessage || `${action.label}成功`)
      await loadRows()
    } finally {
      setRunningAction(false)
    }
  }

  async function runToolbarAction(
    action: NonNullable<CrudConfig["toolbarActions"]>[number]
  ) {
    if (action.href) {
      router.push(action.href)
      return
    }
    if (!action.run) return
    if (action.confirm && !window.confirm(action.confirm)) return
    setRunningAction(true)
    try {
      await action.run()
      if (action.successMessage !== false)
        toast.success(action.successMessage || `${action.label}成功`)
      await loadRows()
    } finally {
      setRunningAction(false)
    }
  }

  async function runBulkAction(
    action: NonNullable<CrudConfig["bulkActions"]>[number]
  ) {
    if (!selectedIds.size) return toast.error("请先选择数据")
    if (!action.run) return
    if (action.confirm && !window.confirm(action.confirm)) return
    setRunningAction(true)
    try {
      await action.run([...selectedIds])
      if (action.successMessage !== false)
        toast.success(action.successMessage || `${action.label}成功`)
      await loadRows()
    } finally {
      setRunningAction(false)
    }
  }

  async function removeSelected() {
    if (
      !config.remove ||
      !selectedIds.size ||
      !window.confirm(`确认删除选中的 ${selectedIds.size} 条数据吗？`)
    )
      return
    await config.remove([...selectedIds])
    toast.success("批量删除成功")
    await loadRows()
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !config.uploadUrl) return
    const data = new FormData()
    data.append("file", file)
    const extraFields = await config.uploadExtraFields?.()
    if (extraFields === null) return
    for (const [key, value] of Object.entries(extraFields ?? {}))
      data.append(key, value)
    if (config.uploadAction) await config.uploadAction(data)
    else await request.post(config.uploadUrl, data)
    event.target.value = ""
    toast.success("上传成功")
    await loadRows()
  }

  const canCreate = Boolean(config.create && allowed("add"))
  const canEdit = Boolean(config.update && allowed("edit"))
  const canRemove = Boolean(
    config.remove && (allowed("remove") || allowed("forceLogout"))
  )
  const rowActions =
    config.rowActions?.filter(
      (action) => !action.permission || hasPermission(action.permission)
    ) ?? []
  const toolbarActions =
    config.toolbarActions?.filter(
      (action) => !action.permission || hasPermission(action.permission)
    ) ?? []
  const bulkActions =
    config.bulkActions?.filter(
      (action) => !action.permission || hasPermission(action.permission)
    ) ?? []
  const canBulkRemove = Boolean(
    config.remove && canRemove && config.bulkRemove !== false
  )
  const selectable = bulkActions.length > 0 || canBulkRemove

  return (
    <div className="space-y-4">
      {config.queryFields.length > 0 && (
        <Card>
          <CardContent>
            <form
              className={QUERY_GRID_CLASS}
              onSubmit={(event) => {
                event.preventDefault()
                setPageNum(1)
                setQuery({ ...queryDraft })
              }}
            >
              {config.queryFields.map((field) => (
                <QueryField
                  key={field.key}
                  label={field.label}
                  htmlFor={`query-${field.key}`}
                  wide={field.type === "daterange"}
                >
                  {field.type === "daterange" && field.endKey ? (
                    <DateRangePicker
                      value={[
                        queryDraft[field.key] as string,
                        queryDraft[field.endKey] as string,
                      ]}
                      onChange={([begin, end]) =>
                        setQueryDraft((current) => ({
                          ...current,
                          [field.key]: begin,
                          [field.endKey!]: end,
                        }))
                      }
                    />
                  ) : (
                    <FieldControl
                      field={field}
                      value={queryDraft[field.key]}
                      options={queryOptions[field.key] ?? field.options}
                      onChange={(value) =>
                        setQueryDraft((current) => ({
                          ...current,
                          [field.key]: value,
                        }))
                      }
                    />
                  )}
                </QueryField>
              ))}
              <QueryActions>
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
                    setPageNum(1)
                  }}
                >
                  <RefreshCw />
                  重置
                </Button>
              </QueryActions>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardDescription>
              共 {total} 条记录{selectable && `，已选 ${selectedIds.size} 条`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canBulkRemove && (
              <Button
                variant="destructive"
                disabled={!selectedIds.size}
                onClick={() => void removeSelected()}
              >
                <Trash2 />
                批量删除
              </Button>
            )}
            {bulkActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                disabled={runningAction || !selectedIds.size}
                onClick={() => void runBulkAction(action)}
              >
                {action.label}
              </Button>
            ))}
            {toolbarActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                disabled={runningAction}
                onClick={() => void runToolbarAction(action)}
              >
                {action.label}
              </Button>
            ))}
            {config.exportUrl && allowed("export") && (
              <Button
                variant="outline"
                onClick={() =>
                  void download(
                    config.exportUrl!,
                    {
                      ...normalizeFields(query, config.queryFields),
                      ...(config.fixedQuery ?? {}),
                    },
                    `${config.title}_${Date.now()}.xlsx`
                  )
                }
              >
                <Download />
                导出
              </Button>
            )}
            {config.uploadUrl &&
              (config.uploadPermission
                ? hasPermission(config.uploadPermission)
                : allowed("upload")) && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Label htmlFor={`upload-${config.path}`} />}
                >
                  <Upload />
                  上传
                  <Input
                    id={`upload-${config.path}`}
                    type="file"
                    className="hidden"
                    onChange={(event) => void upload(event)}
                  />
                </Button>
              )}
            {canCreate && (
              <Button onClick={() => void openCreate()}>
                <Plus />
                新增
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        rows.length > 0 && selectedIds.size === rows.length
                      }
                      onCheckedChange={(checked) =>
                        setSelectedIds(
                          checked
                            ? new Set(
                                rows.map((row) => String(row[config.idKey]))
                              )
                            : new Set()
                        )
                      }
                    />
                  </TableHead>
                )}
                {config.columns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
                {(canEdit || canRemove || rowActions.length > 0) && (
                  <TableHead className="text-right">操作</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton
                  columns={config.columns.length + (selectable ? 2 : 1)}
                  rows={pageSize}
                />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={config.columns.length + (selectable ? 2 : 1)}
                    className="h-32 text-center text-muted-foreground"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => {
                  const rowId = String(row[config.idKey] ?? index)
                  return (
                    <TableRow
                      key={rowId}
                      data-state={
                        selectedRowId === rowId ? "selected" : undefined
                      }
                      className={cn(
                        TABLE_ROW_ENTER_CLASS,
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(rowId)}
                            onCheckedChange={(checked) =>
                              setSelectedIds((current) => {
                                const next = new Set(current)
                                if (checked) next.add(rowId)
                                else next.delete(rowId)
                                return next
                              })
                            }
                          />
                        </TableCell>
                      )}
                      {config.columns.map((column) => (
                        <TableCell key={column.key}>
                          {column.format === "status" &&
                          config.statusChange &&
                          allowed("edit") &&
                          (!config.canEditRow || config.canEditRow(row)) ? (
                            <Switch
                              checked={String(row[column.key]) === "0"}
                              onCheckedChange={(checked) =>
                                void changeStatus(row, checked ? "0" : "1")
                              }
                            />
                          ) : (
                            <CellValue
                              value={row[column.key]}
                              format={column.format}
                              statusLabels={column.statusLabels}
                            />
                          )}
                        </TableCell>
                      ))}
                      {(canEdit || canRemove || rowActions.length > 0) && (
                        <TableCell className="space-x-1 text-right">
                          {canEdit &&
                            (!config.canEditRow || config.canEditRow(row)) && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => void openEdit(row)}
                                title="编辑"
                              >
                                <Pencil />
                              </Button>
                            )}
                          {canRemove &&
                            (!config.canRemoveRow ||
                              config.canRemoveRow(row)) && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => void remove(row)}
                                title={config.removeLabel ?? "删除"}
                              >
                                <Trash2 />
                              </Button>
                            )}
                          {rowActions.some(
                            (action) => !action.visible || action.visible(row)
                          ) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={runningAction}
                                  />
                                }
                              >
                                <MoreHorizontal />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {rowActions
                                  .filter(
                                    (action) =>
                                      !action.visible || action.visible(row)
                                  )
                                  .map((action) => (
                                    <DropdownMenuItem
                                      key={action.label}
                                      onClick={() =>
                                        void runRowAction(action, row)
                                      }
                                    >
                                      {action.label}
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          <div className="mt-4">
            <DataPagination
              pageNum={pageNum}
              pageSize={pageSize}
              total={total}
              onPageChange={setPageNum}
              onPageSizeChange={(size) => {
                setPageNum(1)
                setPageSize(size)
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {form[config.idKey] === undefined
                ? `新增${config.title}`
                : `编辑${config.title}`}
            </DialogTitle>
            <DialogDescription>
              字段和提交接口保持与旧前端一致。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            {config.formFields.map((field) => {
              if (field.visible && !field.visible(form)) return null
              const required =
                typeof field.required === "function"
                  ? field.required(form)
                  : field.required
              const disabled =
                typeof field.disabled === "function"
                  ? field.disabled(form)
                  : field.disabled
              return (
                <div
                  key={field.key}
                  className={
                    field.type === "textarea" ||
                    field.type === "richtext" ||
                    field.type === "tree" ||
                    (field.type === "array" &&
                      dynamicOptions[field.key]?.length)
                      ? "space-y-2 sm:col-span-2"
                      : "space-y-2"
                  }
                >
                  <Label htmlFor={`form-${field.key}`}>
                    {field.label}
                    {required && <span className="text-destructive"> *</span>}
                  </Label>
                  <FieldControl
                    disabled={disabled}
                    field={field}
                    value={form[field.key]}
                    options={dynamicOptions[field.key] ?? field.options}
                    treeOptions={dynamicTreeOptions[field.key]}
                    linked={
                      field.linkedKey
                        ? Boolean(form[field.linkedKey])
                        : undefined
                    }
                    onLinkedChange={
                      field.linkedKey
                        ? (linked) =>
                            setForm((current) => ({
                              ...current,
                              [field.linkedKey!]: linked,
                            }))
                        : undefined
                    }
                    onChange={(value) => {
                      const changedForm = {
                        ...form,
                        ...(field.resetFieldsOnChange ?? {}),
                        [field.key]: value,
                      }
                      const nextForm = config.deriveForm
                        ? config.deriveForm(changedForm)
                        : changedForm
                      setForm(nextForm)
                      if (field.reloadOptionsOnChange)
                        void loadFormOptions(nextForm)
                    }}
                  />
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving && <LoaderCircle className="animate-spin" />}保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(viewRow)}
        onOpenChange={(open) => {
          if (!open) setViewRow(null)
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>数据详情</DialogTitle>
            <DialogDescription>{config.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {viewRow &&
              (
                config.detailFields ??
                Object.keys(viewRow).map((key) => ({ key, label: key }))
              ).map(({ key, label }) => (
                <div key={key} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm break-all whitespace-pre-wrap">
                    {typeof viewRow[key] === "object"
                      ? JSON.stringify(viewRow[key], null, 2)
                      : toText(viewRow[key])}
                  </p>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
