"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Code2,
  Download,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import {
  delTable,
  getDataNames,
  getGenTable,
  importTable,
  listDbTable,
  listTable,
  previewTable,
  synchDb,
  updateGenTable,
} from "@/api/tool/gen"
import type { DbTableForm, DbTableVO, TableVO } from "@/api/tool/gen/types"
import { useAuth } from "@/components/auth-provider"
import { DataPagination } from "@/components/data-pagination"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { DateRangePicker } from "@/components/date-range-picker"
import {
  QUERY_GRID_CLASS,
  QueryActions,
  QueryField,
} from "@/components/query-field"
import {
  TableSkeleton,
  TABLE_ROW_ENTER_CLASS,
} from "@/components/table-skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { downloadGet } from "@/utils/request"

interface PageResponse<T> {
  rows?: T[]
  total?: number
  data?: unknown
}

const boolFields = [
  ["isInsert", "插入"],
  ["isEdit", "编辑"],
  ["isList", "列表"],
  ["isQuery", "查询"],
  ["isRequired", "必填"],
] as const

export function GenPage() {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [rows, setRows] = React.useState<TableVO[]>([])
  const [queryDraft, setQueryDraft] = React.useState({
    tableName: "",
    tableComment: "",
    dataName: "",
    beginTime: "",
    endTime: "",
  })
  const [query, setQuery] = React.useState({
    tableName: "",
    tableComment: "",
    dataName: "",
    beginTime: "",
    endTime: "",
  })
  const [loading, setLoading] = React.useState(true)
  const [pageNum, setPageNum] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [preview, setPreview] = React.useState<Record<string, string> | null>(
    null
  )
  const [previewFile, setPreviewFile] = React.useState("")
  const [importOpen, setImportOpen] = React.useState(false)
  const [dataNames, setDataNames] = React.useState<string[]>([])
  const [dbRows, setDbRows] = React.useState<DbTableVO[]>([])
  const [dbQuery, setDbQuery] = React.useState({
    dataName: "",
    tableName: "",
    tableComment: "",
  })
  const [dbPageNum, setDbPageNum] = React.useState(1)
  const [dbPageSize, setDbPageSize] = React.useState(10)
  const [dbTotal, setDbTotal] = React.useState(0)
  const [selectedTables, setSelectedTables] = React.useState<Set<string>>(
    new Set()
  )
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const { beginTime, endTime, ...filters } = query
      const params = {
        pageNum,
        pageSize,
        ...filters,
        params: { beginTime, endTime },
      }
      const response = await listTable(params)
      const body = response as unknown as PageResponse<TableVO>
      setRows(body.rows ?? [])
      setTotal(body.total ?? 0)
      setSelectedIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [pageNum, pageSize, query])

  React.useEffect(() => {
    void load()
  }, [load])

  async function openPreview(row: TableVO) {
    const response = await previewTable(row.tableId)
    const files = response.data as unknown as Record<string, string>
    setPreview(files)
    setPreviewFile(Object.keys(files)[0] ?? "")
  }

  async function openImport() {
    const response = await getDataNames()
    const names = response.data as unknown as string[]
    const dataName = query.dataName || names[0] || ""
    setDataNames(names)
    const nextQuery = { dataName, tableName: "", tableComment: "" }
    setDbQuery(nextQuery)
    setDbPageNum(1)
    await loadDbTables(nextQuery, 1)
    setSelectedTables(new Set())
    setImportOpen(true)
  }

  async function loadDbTables(
    nextQuery = dbQuery,
    nextPage = dbPageNum,
    nextPageSize = dbPageSize
  ) {
    const response = await listDbTable({
      pageNum: nextPage,
      pageSize: nextPageSize,
      ...nextQuery,
    })
    const body = response as unknown as PageResponse<DbTableVO>
    setDbRows(body.rows ?? [])
    setDbTotal(body.total ?? 0)
  }

  async function reloadDbTables(dataName: string) {
    const nextQuery = { ...dbQuery, dataName }
    setDbQuery(nextQuery)
    setDbPageNum(1)
    await loadDbTables(nextQuery, 1)
  }

  async function submitImport() {
    if (!selectedTables.size) return toast.error("请选择要导入的表")
    await importTable({
      tables: [...selectedTables].join(","),
      dataName: dbQuery.dataName,
    })
    toast.success("导入成功")
    setImportOpen(false)
    await load()
  }

  async function remove(row: TableVO) {
    if (!window.confirm(`确认删除“${row.tableName}”的生成配置吗？`)) return
    await delTable(row.tableId)
    toast.success("删除成功")
    await load()
  }

  async function sync(row: TableVO) {
    if (!window.confirm(`确认强制同步“${row.tableName}”的表结构吗？`)) return
    await synchDb(row.tableId)
    toast.success("同步成功")
    await load()
  }

  async function removeSelected() {
    if (
      !selectedIds.size ||
      !window.confirm(`确认删除选中的 ${selectedIds.size} 项生成配置吗？`)
    )
      return
    await delTable([...selectedIds])
    toast.success("批量删除成功")
    await load()
  }

  function generateSelected() {
    if (!selectedIds.size) return toast.error("请选择要生成的数据")
    void downloadGet(
      `/tool/gen/batchGenCode?tableIdStr=${[...selectedIds].join(",")}`,
      "ruoyi.zip"
    )
  }

  return (
    <div className="space-y-4">
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
            <QueryField label="表名称">
              <Input
                value={queryDraft.tableName}
                placeholder="请输入表名称"
                onChange={(event) =>
                  setQueryDraft((current) => ({
                    ...current,
                    tableName: event.target.value,
                  }))
                }
              />
            </QueryField>
            <QueryField label="表描述">
              <Input
                value={queryDraft.tableComment}
                placeholder="请输入表描述"
                onChange={(event) =>
                  setQueryDraft((current) => ({
                    ...current,
                    tableComment: event.target.value,
                  }))
                }
              />
            </QueryField>
            <QueryField label="数据源">
              <Input
                value={queryDraft.dataName}
                placeholder="请输入数据源"
                onChange={(event) =>
                  setQueryDraft((current) => ({
                    ...current,
                    dataName: event.target.value,
                  }))
                }
              />
            </QueryField>
            <QueryField label="创建时间" wide>
              <DateRangePicker
                value={[queryDraft.beginTime, queryDraft.endTime]}
                onChange={([beginTime, endTime]) =>
                  setQueryDraft((current) => ({
                    ...current,
                    beginTime,
                    endTime,
                  }))
                }
              />
            </QueryField>
            <QueryActions>
              <Button type="submit">
                <Search />
                查询
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const empty = {
                    tableName: "",
                    tableComment: "",
                    dataName: "",
                    beginTime: "",
                    endTime: "",
                  }
                  setQueryDraft(empty)
                  setQuery(empty)
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
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">生成表列表</CardTitle>
            <CardDescription>
              共 {total} 条记录，已选 {selectedIds.size} 条
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasPermission("tool:gen:code") && (
              <Button
                variant="outline"
                disabled={!selectedIds.size}
                onClick={generateSelected}
              >
                <Download />
                生成
              </Button>
            )}
            {hasPermission("tool:gen:edit") && (
              <Button
                variant="outline"
                disabled={selectedIds.size !== 1}
                onClick={() =>
                  router.push(`/tool/gen-edit/index/${[...selectedIds][0]}`)
                }
              >
                <Pencil />
                修改
              </Button>
            )}
            {hasPermission("tool:gen:remove") && (
              <Button
                variant="destructive"
                disabled={!selectedIds.size}
                onClick={() => void removeSelected()}
              >
                <Trash2 />
                删除
              </Button>
            )}
            {hasPermission("tool:gen:import") && (
              <Button onClick={() => void openImport()}>
                <Plus />
                导入表
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      rows.length > 0 && selectedIds.size === rows.length
                    }
                    onCheckedChange={(checked) =>
                      setSelectedIds(
                        checked
                          ? new Set(rows.map((row) => String(row.tableId)))
                          : new Set()
                      )
                    }
                  />
                </TableHead>
                <TableHead>编号</TableHead>
                <TableHead>数据源</TableHead>
                <TableHead>表名称</TableHead>
                <TableHead>表描述</TableHead>
                <TableHead>实体类</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton columns={8} rows={pageSize} />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-28 text-center text-muted-foreground"
                  >
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const rowId = String(row.tableId)
                  return (
                    <TableRow key={rowId} className={TABLE_ROW_ENTER_CLASS}>
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
                      <TableCell>{rowId}</TableCell>
                      <TableCell>{row.dataName}</TableCell>
                      <TableCell>{row.tableName}</TableCell>
                      <TableCell>{row.tableComment}</TableCell>
                      <TableCell>{row.className}</TableCell>
                      <TableCell>{String(row.updateTime ?? "-")}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {hasPermission("tool:gen:preview") && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="预览"
                              onClick={() => void openPreview(row)}
                            >
                              <Code2 />
                            </Button>
                          )}
                          {hasPermission("tool:gen:edit") && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="编辑"
                              onClick={() =>
                                router.push(
                                  `/tool/gen-edit/index/${row.tableId}`
                                )
                              }
                            >
                              <Pencil />
                            </Button>
                          )}
                          {hasPermission("tool:gen:edit") && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="同步"
                              onClick={() => void sync(row)}
                            >
                              <RefreshCw />
                            </Button>
                          )}
                          {hasPermission("tool:gen:code") && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title="生成"
                              onClick={() =>
                                void downloadGet(
                                  `/tool/gen/batchGenCode?tableIdStr=${row.tableId}`,
                                  "ruoyi.zip"
                                )
                              }
                            >
                              <Download />
                            </Button>
                          )}
                          {hasPermission("tool:gen:remove") && (
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

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>代码预览</DialogTitle>
            <DialogDescription>
              预览内容直接来自原代码生成 API。
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="grid min-h-0 gap-3 md:grid-cols-[220px_1fr]">
              <div className="max-h-[65svh] overflow-auto rounded-md border p-2">
                {Object.keys(preview).map((file) => (
                  <Button
                    key={file}
                    className="mb-1 w-full justify-start"
                    size="sm"
                    variant={previewFile === file ? "secondary" : "ghost"}
                    onClick={() => setPreviewFile(file)}
                  >
                    {file}
                  </Button>
                ))}
              </div>
              <pre className="max-h-[65svh] overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
                <code>{preview[previewFile]}</code>
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>导入数据库表</DialogTitle>
            <DialogDescription>选择数据源及需要导入的表。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <form
              className="grid gap-3 sm:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault()
                setDbPageNum(1)
                void loadDbTables(dbQuery, 1)
              }}
            >
              <div className="space-y-1.5">
                <Label>数据源</Label>
                <Select
                  value={dbQuery.dataName || null}
                  onValueChange={(value) => {
                    if (value) void reloadDbTables(value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="请选择数据源" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>表名称</Label>
                <Input
                  value={dbQuery.tableName}
                  onChange={(event) =>
                    setDbQuery((current) => ({
                      ...current,
                      tableName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>表描述</Label>
                <Input
                  value={dbQuery.tableComment}
                  onChange={(event) =>
                    setDbQuery((current) => ({
                      ...current,
                      tableComment: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Button type="submit">
                  <Search />
                  查询
                </Button>
              </div>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">选择</TableHead>
                  <TableHead>表名称</TableHead>
                  <TableHead>表描述</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dbRows.map((row) => {
                  const name = row.tableName
                  return (
                    <TableRow key={name}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTables.has(name)}
                          onCheckedChange={(checked) =>
                            setSelectedTables((current) => {
                              const next = new Set(current)
                              if (checked) next.add(name)
                              else next.delete(name)
                              return next
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>{name}</TableCell>
                      <TableCell>{row.tableComment}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <DataPagination
              pageNum={dbPageNum}
              pageSize={dbPageSize}
              total={dbTotal}
              onPageChange={(next) => {
                setDbPageNum(next)
                void loadDbTables(dbQuery, next, dbPageSize)
              }}
              onPageSizeChange={(size) => {
                setDbPageNum(1)
                setDbPageSize(size)
                void loadDbTables(dbQuery, 1, size)
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void submitImport()}>导入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const tableFields = [
  ["tableName", "表名称"],
  ["tableComment", "表描述"],
  ["className", "实体类名称"],
  ["functionAuthor", "作者"],
  ["packageName", "生成包路径"],
  ["moduleName", "模块名"],
  ["businessName", "业务名"],
  ["functionName", "功能名"],
  ["parentMenuId", "上级菜单 ID"],
] as const

export function GenEditPage({ tableId }: { tableId: string }) {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [info, setInfo] = React.useState<Record<string, unknown> | null>(null)
  const [columns, setColumns] = React.useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    void getGenTable(tableId).then((response) => {
      setInfo(response.data.info as unknown as Record<string, unknown>)
      setColumns(response.data.rows as unknown as Record<string, unknown>[])
    })
  }, [tableId])

  function updateColumn(index: number, key: string, value: unknown) {
    setColumns((current) =>
      current.map((column, columnIndex) =>
        columnIndex === index ? { ...column, [key]: value } : column
      )
    )
  }

  async function save() {
    if (!info) return
    for (const key of [
      "tableName",
      "tableComment",
      "className",
      "functionAuthor",
    ]) {
      if (!info[key]) return toast.error("请完整填写基本信息")
    }
    setSaving(true)
    try {
      const payload = {
        ...info,
        columns,
        params: {
          treeCode: info.treeCode,
          treeName: info.treeName,
          treeParentCode: info.treeParentCode,
          parentMenuId: info.parentMenuId,
        },
      }
      await updateGenTable(payload as unknown as DbTableForm)
      toast.success("生成配置保存成功")
      router.push("/tool/gen")
    } finally {
      setSaving(false)
    }
  }

  if (!info) return <LoaderCircle className="mx-auto my-20 animate-spin" />

  return (
    <Card>
      <CardHeader>
        <CardTitle>修改生成配置</CardTitle>
        <CardDescription>表编号：{tableId}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="columns">字段信息</TabsTrigger>
            <TabsTrigger value="generate">生成信息</TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="grid gap-4 pt-4 sm:grid-cols-2">
            {tableFields.slice(0, 4).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  value={String(info[key] ?? "")}
                  onChange={(event) =>
                    setInfo((current) => ({
                      ...current!,
                      [key]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <div className="space-y-2 sm:col-span-2">
              <Label>备注</Label>
              <Textarea
                value={String(info.remark ?? "")}
                onChange={(event) =>
                  setInfo((current) => ({
                    ...current!,
                    remark: event.target.value,
                  }))
                }
              />
            </div>
          </TabsContent>
          <TabsContent value="columns" className="overflow-x-auto pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>字段列名</TableHead>
                  <TableHead>字段描述</TableHead>
                  <TableHead>物理类型</TableHead>
                  <TableHead>Java 类型</TableHead>
                  <TableHead>Java 属性</TableHead>
                  {boolFields.map(([, label]) => (
                    <TableHead key={label}>{label}</TableHead>
                  ))}
                  <TableHead>查询方式</TableHead>
                  <TableHead>显示类型</TableHead>
                  <TableHead>字典类型</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((column, index) => (
                  <TableRow key={String(column.columnId ?? index)}>
                    <TableCell>{String(column.columnName ?? "")}</TableCell>
                    <TableCell>
                      <Input
                        className="min-w-28"
                        value={String(column.columnComment ?? "")}
                        onChange={(event) =>
                          updateColumn(
                            index,
                            "columnComment",
                            event.target.value
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>{String(column.columnType ?? "")}</TableCell>
                    <TableCell>
                      <Input
                        className="min-w-24"
                        value={String(column.javaType ?? "")}
                        onChange={(event) =>
                          updateColumn(index, "javaType", event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="min-w-28"
                        value={String(column.javaField ?? "")}
                        onChange={(event) =>
                          updateColumn(index, "javaField", event.target.value)
                        }
                      />
                    </TableCell>
                    {boolFields.map(([key]) => (
                      <TableCell key={key}>
                        <Checkbox
                          checked={String(column[key] ?? "0") === "1"}
                          onCheckedChange={(checked) =>
                            updateColumn(index, key, checked ? "1" : "0")
                          }
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Input
                        className="min-w-24"
                        value={String(column.queryType ?? "")}
                        onChange={(event) =>
                          updateColumn(index, "queryType", event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="min-w-28"
                        value={String(column.htmlType ?? "")}
                        onChange={(event) =>
                          updateColumn(index, "htmlType", event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="min-w-28"
                        value={String(column.dictType ?? "")}
                        onChange={(event) =>
                          updateColumn(index, "dictType", event.target.value)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent
            value="generate"
            className="grid gap-4 pt-4 sm:grid-cols-2"
          >
            {tableFields.slice(4).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  value={String(info[key] ?? "")}
                  onChange={(event) =>
                    setInfo((current) => ({
                      ...current!,
                      [key]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label>生成模板</Label>
              <Select
                value={String(info.tplCategory ?? "crud")}
                onValueChange={(value) =>
                  setInfo((current) => ({ ...current!, tplCategory: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crud">单表</SelectItem>
                  <SelectItem value="tree">树表</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {info.tplCategory === "tree" &&
              [
                ["treeCode", "树编码字段"],
                ["treeParentCode", "树父编码字段"],
                ["treeName", "树名称字段"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    value={String(info[key] ?? "")}
                    onChange={(event) =>
                      setInfo((current) => ({
                        ...current!,
                        [key]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
          </TabsContent>
        </Tabs>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.push("/tool/gen")}>
            返回
          </Button>
          {hasPermission("tool:gen:edit") && (
            <Button disabled={saving} onClick={() => void save()}>
              {saving && <LoaderCircle className="animate-spin" />}保存
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
