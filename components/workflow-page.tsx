"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { listByIds } from "@/api/system/oss"
import { optionSelect as userOptionSelect } from "@/api/system/user"
import { flowHisTaskList } from "@/api/workflow/instance"
import { addLeave, getLeave, updateLeave } from "@/api/workflow/leave"
import type { LeaveForm } from "@/api/workflow/leave/types"
import {
  backProcess,
  completeTask,
  currentTaskAllUser,
  getBackTaskNode,
  getNextNodeList,
  getTask,
  startWorkFlow,
  taskOperation,
  terminationTask,
} from "@/api/workflow/task"
import type { FlowTaskVO } from "@/api/workflow/task/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { env } from "@/lib/env"
import { getToken } from "@/utils/auth"
import request, { downloadGet } from "@/utils/request"

interface NextNode {
  nodeCode: string
  nodeName: string
  permissionFlag?: Array<string | number>
}

interface HistoryItem extends Partial<FlowTaskVO> {
  message?: string
  nickName?: string
  approveName?: string
  runDuration?: string
  ext?: string
  attachments?: Array<{
    ossId: string | number
    originalName?: string
    fileName?: string
  }>
}

const leaveTypes = [
  ["1", "事假"],
  ["2", "调休"],
  ["3", "病假"],
  ["4", "婚假"],
] as const

const flowCodes = [
  ["leave1", "请假申请-普通"],
  ["leave2", "请假申请-排他网关"],
  ["leave3", "请假申请-并行网关"],
  ["leave4", "请假申请-会签"],
  ["leave5", "请假申请-并行会签网关"],
  ["leave6", "请假申请-排他并行会签"],
] as const

const EMPTY_VARIABLES: Record<string, unknown> = {}

export function WorkflowDesignPage() {
  const router = useRouter()
  const query = useSearchParams()
  const definitionId = query.get("definitionId") ?? ""
  const activeName = query.get("activeName") ?? "published"
  const src = `${env.baseApi}/warm-flow-ui/index.html?id=${encodeURIComponent(definitionId)}&onlyDesignShow=true&Authorization=${encodeURIComponent(`Bearer ${getToken() ?? ""}`)}&clientid=${encodeURIComponent(env.clientId)}`
  React.useEffect(() => {
    const close = (event: MessageEvent<{ method?: string }>) => {
      if (event.data?.method === "close")
        router.push(
          `/workflow/processDefinition?activeName=${encodeURIComponent(activeName)}`
        )
    }
    window.addEventListener("message", close)
    return () => window.removeEventListener("message", close)
  }, [activeName, router])
  return (
    <Card className="h-[calc(100svh-8rem)] overflow-hidden">
      <CardContent className="h-full p-0">
        <iframe title="流程设计器" src={src} className="size-full border-0" />
      </CardContent>
    </Card>
  )
}

export function ApprovalHistory({ businessId }: { businessId: string }) {
  const [rows, setRows] = React.useState<HistoryItem[]>([])
  const [instanceId, setInstanceId] = React.useState("")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!businessId) return setLoading(false)
    void flowHisTaskList(businessId)
      .then(async (response) => {
        const payload = response.data as unknown as {
          list?: HistoryItem[]
          instanceId?: string
        }
        const list = payload.list ?? []
        setInstanceId(String(payload.instanceId ?? ""))
        setRows(
          await Promise.all(
            list.map(async (item) => {
              if (!item.ext) return { ...item, attachments: [] }
              const attachmentResponse = await listByIds(item.ext)
              return { ...item, attachments: attachmentResponse.data }
            })
          )
        )
      })
      .finally(() => setLoading(false))
  }, [businessId])

  const chartUrl = instanceId
    ? `${env.baseApi}/warm-flow-ui/index.html?id=${encodeURIComponent(instanceId)}&type=FlowChart&Authorization=${encodeURIComponent(`Bearer ${getToken() ?? ""}`)}&clientid=${encodeURIComponent(env.clientId)}`
    : ""
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">审批记录</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoaderCircle className="mx-auto my-8 animate-spin" />
        ) : (
          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">审批信息</TabsTrigger>
              <TabsTrigger value="chart" disabled={!chartUrl}>
                流程图
              </TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>节点</TableHead>
                    <TableHead>办理人</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>审批意见</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>结束时间</TableHead>
                    <TableHead>运行时长</TableHead>
                    <TableHead>附件</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        暂无审批记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, index) => (
                      <TableRow key={String(row.id ?? index)}>
                        <TableCell>{row.nodeName}</TableCell>
                        <TableCell>
                          {row.approveName ?? row.nickName ?? "-"}
                        </TableCell>
                        <TableCell>{row.flowStatus}</TableCell>
                        <TableCell>{row.message ?? "-"}</TableCell>
                        <TableCell>
                          {row.createTime
                            ? new Date(row.createTime).toLocaleString("zh-CN", {
                                hour12: false,
                              })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {row.updateTime
                            ? new Date(row.updateTime).toLocaleString("zh-CN", {
                                hour12: false,
                              })
                            : "-"}
                        </TableCell>
                        <TableCell>{row.runDuration ?? "-"}</TableCell>
                        <TableCell>
                          {row.attachments?.map((attachment) => (
                            <Button
                              key={String(attachment.ossId)}
                              size="sm"
                              variant="link"
                              onClick={() =>
                                void downloadGet(
                                  `/resource/oss/download/${attachment.ossId}`,
                                  attachment.originalName ||
                                    attachment.fileName ||
                                    "attachment"
                                )
                              }
                            >
                              {attachment.originalName ||
                                attachment.fileName ||
                                attachment.ossId}
                            </Button>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="chart">
              {chartUrl && (
                <iframe
                  title="流程图"
                  src={chartUrl}
                  className="h-[65svh] w-full rounded-lg border"
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

export function WorkflowTaskPanel({
  taskId,
  variables = EMPTY_VARIABLES,
  onDone,
}: {
  taskId: string
  variables?: Record<string, unknown>
  onDone?: () => void
}) {
  const [task, setTask] = React.useState<FlowTaskVO | null>(null)
  const [nextNodes, setNextNodes] = React.useState<NextNode[]>([])
  const [assignees, setAssignees] = React.useState<Record<string, string>>({})
  const [message, setMessage] = React.useState("")
  const [copyUsers, setCopyUsers] = React.useState("")
  const [backNodes, setBackNodes] = React.useState<NextNode[]>([])
  const [backNode, setBackNode] = React.useState("")
  const [busy, setBusy] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [fileId, setFileId] = React.useState("")
  const [messageTypes, setMessageTypes] = React.useState(["1"])

  React.useEffect(() => {
    void getTask(taskId)
      .then(async (taskResponse) => {
        setTask(taskResponse.data)
        const nodeResponse = await getNextNodeList({ taskId, variables })
        setNextNodes(nodeResponse.data as unknown as NextNode[])
      })
      .catch(() => setLoadError("任务办理信息加载失败，请刷新后重试"))
      .finally(() => setBusy(false))
  }, [taskId, variables])

  const buttons = new Set(
    task?.buttonList?.filter((item) => item.show).map((item) => item.code) ?? []
  )

  async function approve() {
    const required =
      buttons.has("pop") && nextNodes.some((node) => !assignees[node.nodeCode])
    if (required) return toast.error("请填写下一步审批人用户 ID")
    const invalidAssignee = nextNodes.some(
      (node) =>
        node.permissionFlag?.length &&
        assignees[node.nodeCode]
          ?.split(",")
          .some((id) => !node.permissionFlag!.map(String).includes(id.trim()))
    )
    if (invalidAssignee)
      return toast.error("下一步审批人不在该节点允许的用户范围内")
    setSubmitting(true)
    try {
      const copyIds = copyUsers
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
      const copyResponse = copyIds.length
        ? await userOptionSelect(copyIds)
        : null
      const flowCopyList =
        copyResponse?.data.map((user) => ({
          userId: user.userId,
          nickName: user.nickName,
        })) ?? []
      await completeTask({
        taskId,
        variables,
        message,
        fileId: fileId || undefined,
        assigneeMap: assignees,
        messageType: messageTypes,
        flowCopyList,
      })
      toast.success("任务提交成功")
      onDone?.()
    } finally {
      setSubmitting(false)
    }
  }

  async function loadBackNodes() {
    if (!task) return
    const response = await getBackTaskNode(taskId, task.nodeCode)
    const nodes = response.data as unknown as NextNode[]
    setBackNodes(nodes)
    setBackNode(nodes[0]?.nodeCode ?? "")
  }

  async function back() {
    if (!backNode) return toast.error("请选择退回节点")
    setSubmitting(true)
    try {
      await backProcess({
        taskId,
        nodeCode: backNode,
        message,
        fileId: fileId || undefined,
        variables,
        messageType: messageTypes,
      })
      toast.success("任务退回成功")
      onDone?.()
    } finally {
      setSubmitting(false)
    }
  }

  async function operate(
    operation: "transferTask" | "delegateTask" | "addSignature"
  ) {
    const label =
      operation === "transferTask"
        ? "转办"
        : operation === "delegateTask"
          ? "委托"
          : "加签"
    const value = window.prompt(
      `${label}用户 ID${operation === "addSignature" ? "（多个用逗号分隔）" : ""}`
    )
    if (!value) return
    setSubmitting(true)
    try {
      await taskOperation(
        {
          taskId,
          message,
          messageType: messageTypes,
          ...(operation === "addSignature"
            ? {
                userIds: value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              }
            : { userId: value }),
        },
        operation
      )
      toast.success(`${label}成功`)
      onDone?.()
    } finally {
      setSubmitting(false)
    }
  }

  async function terminate() {
    if (!window.confirm("确认终止当前流程吗？")) return
    setSubmitting(true)
    try {
      await terminationTask({ taskId, comment: message })
      toast.success("流程已终止")
      onDone?.()
    } finally {
      setSubmitting(false)
    }
  }

  async function reduceSignature() {
    const response = await currentTaskAllUser(taskId)
    const users = response.data as unknown as Array<{
      userId: string | number
      nickName?: string
    }>
    if (!users.length) return toast.error("当前任务没有可减签人员")
    const hint = users
      .map((user) => `${user.nickName || user.userId}:${user.userId}`)
      .join("，")
    const userId = window.prompt(`请输入减签用户 ID：${hint}`)
    if (!userId || !users.some((user) => String(user.userId) === userId)) return
    setSubmitting(true)
    try {
      await taskOperation(
        { taskId, userIds: [userId], message, messageType: messageTypes },
        "reductionSignature"
      )
      toast.success("减签成功")
      onDone?.()
    } finally {
      setSubmitting(false)
    }
  }

  async function uploadAttachment(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const suffix = file.name.split(".").pop()?.toLowerCase() ?? ""
    if (
      ![
        "png",
        "jpg",
        "jpeg",
        "doc",
        "docx",
        "xlsx",
        "xls",
        "ppt",
        "txt",
        "pdf",
      ].includes(suffix)
    )
      return toast.error("不支持该附件类型")
    if (file.size > 20 * 1024 * 1024) return toast.error("附件不能超过 20MB")
    const data = new FormData()
    data.append("file", file)
    const response = (await request.post(
      "/resource/oss/upload",
      data
    )) as unknown as { data: { ossId: string | number } }
    setFileId((current) =>
      [current, String(response.data.ossId)].filter(Boolean).join(",")
    )
    event.target.value = ""
    toast.success("审批附件上传成功")
  }

  if (busy) return <LoaderCircle className="mx-auto my-10 animate-spin" />
  if (loadError || !task)
    return (
      <p className="py-10 text-center text-sm text-destructive">
        {loadError || "任务不存在"}
      </p>
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">任务办理</CardTitle>
        <CardDescription>
          {task.nodeName} · {task.flowName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {buttons.has("pop") &&
          nextNodes.map((node) => (
            <div key={node.nodeCode} className="space-y-2">
              <Label>{node.nodeName}审批人用户 ID</Label>
              <Input
                value={assignees[node.nodeCode] ?? ""}
                placeholder="多个用户用英文逗号分隔"
                onChange={(event) =>
                  setAssignees((current) => ({
                    ...current,
                    [node.nodeCode]: event.target.value,
                  }))
                }
              />
              {node.permissionFlag?.length && (
                <p className="text-xs text-muted-foreground">
                  可选用户：{node.permissionFlag.join(", ")}
                </p>
              )}
            </div>
          ))}
        {buttons.has("copy") && (
          <div className="space-y-2">
            <Label>抄送用户 ID</Label>
            <Input
              value={copyUsers}
              placeholder="多个用户用英文逗号分隔"
              onChange={(event) => setCopyUsers(event.target.value)}
            />
          </div>
        )}
        {buttons.has("file") && (
          <div className="space-y-2">
            <Label>审批附件</Label>
            <Input
              type="file"
              accept=".png,.jpg,.jpeg,.doc,.docx,.xlsx,.xls,.ppt,.txt,.pdf"
              onChange={(event) => void uploadAttachment(event)}
            />
            {fileId && (
              <p className="text-xs text-muted-foreground">
                已上传，OSS ID：{fileId}
              </p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label>消息提醒</Label>
          <div className="flex flex-wrap gap-4">
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked disabled />
              站内信
            </Label>
            {[
              ["2", "邮件"],
              ["3", "短信"],
            ].map(([value, label]) => (
              <Label
                key={value}
                className="flex items-center gap-2 font-normal"
              >
                <Checkbox
                  checked={messageTypes.includes(value)}
                  onCheckedChange={(checked) =>
                    setMessageTypes((current) =>
                      checked
                        ? [...new Set([...current, value])]
                        : current.filter((item) => item !== value)
                    )
                  }
                />
                {label}
              </Label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>审批意见</Label>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
        {backNodes.length > 0 && (
          <div className="space-y-2">
            <Label>退回节点</Label>
            <Select
              value={backNode || null}
              onValueChange={(value) => setBackNode(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {backNodes.map((node) => (
                  <SelectItem key={node.nodeCode} value={node.nodeCode}>
                    {node.nodeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button disabled={submitting} onClick={() => void approve()}>
            提交
          </Button>
          {buttons.has("back") &&
            (backNodes.length ? (
              <Button
                disabled={submitting}
                variant="destructive"
                onClick={() => void back()}
              >
                确认退回
              </Button>
            ) : (
              <Button
                disabled={submitting}
                variant="outline"
                onClick={() => void loadBackNodes()}
              >
                退回
              </Button>
            ))}
          {buttons.has("transfer") && (
            <Button
              disabled={submitting}
              variant="outline"
              onClick={() => void operate("transferTask")}
            >
              转办
            </Button>
          )}
          {buttons.has("trust") && (
            <Button
              disabled={submitting}
              variant="outline"
              onClick={() => void operate("delegateTask")}
            >
              委托
            </Button>
          )}
          {Number(task.nodeRatio) > 0 && buttons.has("addSign") && (
            <Button
              disabled={submitting}
              variant="outline"
              onClick={() => void operate("addSignature")}
            >
              加签
            </Button>
          )}
          {Number(task.nodeRatio) > 0 && buttons.has("subSign") && (
            <Button
              disabled={submitting}
              variant="outline"
              onClick={() => void reduceSignature()}
            >
              减签
            </Button>
          )}
          {buttons.has("termination") && (
            <Button
              disabled={submitting}
              variant="destructive"
              onClick={() => void terminate()}
            >
              终止
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function LeaveEditPage() {
  const router = useRouter()
  const query = useSearchParams()
  const id = query.get("id") ?? ""
  const type = query.get("type") ?? "add"
  const taskId = query.get("taskId") ?? ""
  const readonly = type === "view"
  const [form, setForm] = React.useState<LeaveForm>({
    leaveType: "1",
    startDate: "",
    endDate: "",
    leaveDays: 1,
    remark: "",
  })
  const [flowCode, setFlowCode] = React.useState("leave1")
  const [loading, setLoading] = React.useState(Boolean(id))
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!id) return
    void getLeave(id)
      .then((response) => setForm(response.data))
      .finally(() => setLoading(false))
  }, [id])

  function updateDate(key: "startDate" | "endDate", value: string) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (next.startDate && next.endDate) {
        const days =
          Math.floor(
            (new Date(next.endDate).getTime() -
              new Date(next.startDate).getTime()) /
              86400000
          ) + 1
        next.leaveDays = days
      }
      return next
    })
  }

  function valid() {
    if (
      !form.leaveType ||
      !form.startDate ||
      !form.endDate ||
      !form.leaveDays
    ) {
      toast.error("请完整填写请假信息")
      return false
    }
    const start = new Date(form.startDate).getTime()
    const end = new Date(form.endDate).getTime()
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
      toast.error("请填写有效的请假时间范围")
      return false
    }
    return true
  }

  async function persist() {
    if (!valid()) return null
    const response = form.id ? await updateLeave(form) : await addLeave(form)
    setForm(response.data)
    return response.data
  }

  async function saveDraft() {
    setBusy(true)
    try {
      if (await persist()) {
        toast.success("暂存成功")
        router.push("/workflow/leave")
      }
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    setBusy(true)
    try {
      const data = await persist()
      if (!data) return
      const response = await startWorkFlow({
        businessId: data.id,
        flowCode,
        variables: { leaveDays: data.leaveDays, userList: ["1", "3", "4"] },
        bizExt: { businessTitle: "请假申请", businessCode: data.applyCode },
      })
      const newTaskId = String(response.data.taskId)
      router.replace(
        `/workflow/leaveEdit/index?id=${data.id}&type=approval&taskId=${newTaskId}`
      )
      toast.success("流程已发起，请完成任务提交")
    } finally {
      setBusy(false)
    }
  }

  const variables = React.useMemo(
    () => ({ leaveDays: form.leaveDays, userList: ["1", "3", "4"] }),
    [form.leaveDays]
  )

  if (loading) return <LoaderCircle className="mx-auto my-20 animate-spin" />
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {readonly ? "查看" : form.id ? "编辑" : "新增"}请假申请
          </CardTitle>
          <CardDescription>业务表单字段与原请假 API 保持一致。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {type === "add" && (
            <div className="space-y-2 sm:col-span-2">
              <Label>流程定义</Label>
              <Select
                value={flowCode}
                onValueChange={(value) => setFlowCode(value ?? "leave1")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {flowCodes.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>请假类型</Label>
            <Select
              disabled={readonly}
              value={form.leaveType}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, leaveType: value ?? "1" }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>请假天数</Label>
            <Input disabled value={String(form.leaveDays ?? "")} />
          </div>
          <div className="space-y-2">
            <Label>开始时间</Label>
            <Input
              disabled={readonly}
              placeholder="YYYY-MM-DD HH:mm:ss"
              value={form.startDate ?? ""}
              onChange={(event) => updateDate("startDate", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>结束时间</Label>
            <Input
              disabled={readonly}
              placeholder="YYYY-MM-DD HH:mm:ss"
              value={form.endDate ?? ""}
              onChange={(event) => updateDate("endDate", event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>请假原因</Label>
            <Textarea
              disabled={readonly}
              value={form.remark ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  remark: event.target.value,
                }))
              }
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
            <Button
              variant="outline"
              onClick={() => router.push("/workflow/leave")}
            >
              返回
            </Button>
            {!readonly && !taskId && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void saveDraft()}
                >
                  暂存
                </Button>
                <Button disabled={busy} onClick={() => void submit()}>
                  发起流程
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      {taskId && type === "approval" && (
        <WorkflowTaskPanel
          taskId={taskId}
          variables={variables}
          onDone={() => router.push("/workflow/leave")}
        />
      )}{" "}
      {id && <ApprovalHistory businessId={id} />}
    </div>
  )
}
