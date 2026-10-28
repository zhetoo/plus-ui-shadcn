"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { unPublishList } from "@/api/workflow/definition"
import {
  deleteHisByInstanceIds,
  instanceVariable,
  pageByFinish,
  updateVariable,
} from "@/api/workflow/instance"
import {
  pageByAllTaskFinish,
  updateAssignee,
  urgeTask,
} from "@/api/workflow/task"
import { CrudPage } from "@/components/crud-page"
import { useAuth } from "@/components/auth-provider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { CRUD_CONFIGS } from "@/lib/crud-configs"
import type { CrudConfig } from "@/lib/crud"

export function ProcessDefinitionPage() {
  const query = useSearchParams()
  const [tab, setTab] = React.useState(() =>
    query.get("activeName") === "unpublished" ? "unpublished" : "published"
  )
  const config = React.useMemo<CrudConfig>(
    () =>
      tab === "published"
        ? CRUD_CONFIGS["/workflow/processDefinition"]
        : {
            ...CRUD_CONFIGS["/workflow/processDefinition"],
            title: "未发布流程定义",
            description: "维护尚未发布的流程定义",
            list: unPublishList as CrudConfig["list"],
          },
    [tab]
  )

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(value) => setTab(value ?? "published")}>
        <TabsList>
          <TabsTrigger value="published">已发布</TabsTrigger>
          <TabsTrigger value="unpublished">未发布</TabsTrigger>
        </TabsList>
      </Tabs>
      <CrudPage key={tab} config={config} />
    </div>
  )
}

export function ProcessInstancePage() {
  const { hasPermission } = useAuth()
  const [tab, setTab] = React.useState("running")
  const [variableOpen, setVariableOpen] = React.useState(false)
  const [variables, setVariables] = React.useState<Record<string, unknown>>({})
  const [instanceId, setInstanceId] = React.useState("")
  const [variableForm, setVariableForm] = React.useState({ key: "", value: "" })

  const loadVariables = React.useCallback(async (id: string) => {
    const response = await instanceVariable(id)
    setInstanceId(id)
    setVariables(response.data.variable as unknown as Record<string, unknown>)
    setVariableOpen(true)
  }, [])

  const config = React.useMemo<CrudConfig>(() => {
    const base = CRUD_CONFIGS["/workflow/processInstance"]
    const variableAction = {
      label: "流程变量",
      permission: "workflow:instance:variableQuery",
      successMessage: false as const,
      run: async (row: Record<string, unknown>) =>
        loadVariables(String(row.id)),
    }
    return tab === "running"
      ? { ...base, rowActions: [...(base.rowActions ?? []), variableAction] }
      : {
          ...base,
          title: "已结束流程实例",
          description: "查询已结束的工作流实例",
          list: pageByFinish as CrudConfig["list"],
          remove: deleteHisByInstanceIds as CrudConfig["remove"],
          rowActions: [
            ...(base.rowActions?.filter((action) => action.label === "查看") ??
              []),
            variableAction,
          ],
        }
  }, [loadVariables, tab])

  async function saveVariable() {
    if (!variableForm.key || !variableForm.value)
      return toast.error("请输入变量名称和值")
    let value: unknown = variableForm.value
    try {
      value = JSON.parse(variableForm.value)
    } catch {
      /* 普通字符串无需转换。 */
    }
    await updateVariable({ instanceId, key: variableForm.key, value })
    toast.success("流程变量修改成功")
    setVariableForm({ key: "", value: "" })
    await loadVariables(instanceId)
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(value) => setTab(value ?? "running")}>
        <TabsList>
          <TabsTrigger value="running">运行中</TabsTrigger>
          <TabsTrigger value="finished">已结束</TabsTrigger>
        </TabsList>
      </Tabs>
      <CrudPage key={tab} config={config} />
      <Dialog open={variableOpen} onOpenChange={setVariableOpen}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>流程变量</DialogTitle>
            <DialogDescription>实例编号：{instanceId}</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>变量名</TableHead>
                <TableHead>变量值</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(variables).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell>{key}</TableCell>
                  <TableCell className="max-w-lg break-all whitespace-pre-wrap">
                    {typeof value === "object"
                      ? JSON.stringify(value, null, 2)
                      : String(value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {tab === "running" && hasPermission("workflow:instance:variable") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>变量名</Label>
                <Input
                  value={variableForm.key}
                  onChange={(event) =>
                    setVariableForm((current) => ({
                      ...current,
                      key: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>变量值</Label>
                <Input
                  value={variableForm.value}
                  placeholder="支持 JSON"
                  onChange={(event) =>
                    setVariableForm((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {tab === "running" &&
              hasPermission("workflow:instance:variable") && (
                <Button onClick={() => void saveVariable()}>保存变量</Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function AllTaskPage() {
  const [tab, setTab] = React.useState("waiting")
  const base = CRUD_CONFIGS["/workflow/task/allTaskWaiting"]
  const config = React.useMemo<CrudConfig>(
    () =>
      tab === "waiting"
        ? {
            ...base,
            bulkActions: [
              {
                label: "催办",
                permission: "workflow:task:edit",
                confirm: "确认催办选中的任务吗？",
                run: async (ids) => {
                  const message =
                    window.prompt("请输入催办消息", "请尽快处理当前任务") ?? ""
                  await urgeTask({
                    taskIdList: ids,
                    message,
                    messageType: ["1"],
                  })
                },
              },
              {
                label: "修改办理人",
                permission: "workflow:task:edit",
                run: async (ids) => {
                  const userId = window.prompt("请输入新的办理人用户 ID")
                  if (!userId) return
                  await updateAssignee(ids as string[], userId)
                },
              },
            ],
          }
        : {
            ...base,
            title: "全部已办任务",
            description: "查询全部已结束任务",
            list: pageByAllTaskFinish as CrudConfig["list"],
            rowActions: base.rowActions?.map((action) => ({
              ...action,
              label: "查看",
            })),
          },
    [base, tab]
  )

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(value) => setTab(value ?? "waiting")}>
        <TabsList>
          <TabsTrigger value="waiting">待办任务</TabsTrigger>
          <TabsTrigger value="finished">已办任务</TabsTrigger>
        </TabsList>
      </Tabs>
      <CrudPage key={tab} config={config} />
    </div>
  )
}
