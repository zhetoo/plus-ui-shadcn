"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

export interface TreeOption {
  id: string | number
  label: string
  children?: TreeOption[]
  disabled?: boolean
}

function collectIds(nodes: TreeOption[]): string[] {
  return nodes.flatMap((node) => [
    String(node.id),
    ...collectIds(node.children ?? []),
  ])
}

function findLabel(nodes: TreeOption[], value?: string): string | undefined {
  for (const node of nodes) {
    if (String(node.id) === value) return node.label
    const child = findLabel(node.children ?? [], value)
    if (child) return child
  }
}

function flattenOptions(
  nodes: TreeOption[],
  depth = 0
): Array<TreeOption & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenOptions(node.children ?? [], depth + 1),
  ])
}

function filterTree(nodes: TreeOption[], keyword: string): TreeOption[] {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return nodes
  return nodes.flatMap((node) => {
    const children = filterTree(node.children ?? [], keyword)
    return node.label.toLowerCase().includes(normalized) || children.length
      ? [{ ...node, children }]
      : []
  })
}

function reconcileParents(nodes: TreeOption[], selected: Set<string>): boolean {
  let branchSelected = false
  for (const node of nodes) {
    const id = String(node.id)
    const childSelected = reconcileParents(node.children ?? [], selected)
    if (node.children?.length) {
      if (childSelected) selected.add(id)
      else selected.delete(id)
      branchSelected ||= childSelected
    } else {
      branchSelected ||= selected.has(id)
    }
  }
  return branchSelected
}

export function TreeSelect({
  nodes,
  value,
  onChange,
  placeholder = "请选择",
  disabled,
}: {
  nodes: TreeOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const label = findLabel(nodes, value)
  return (
    <Select
      value={value ?? null}
      disabled={disabled}
      onValueChange={(nextValue) => nextValue && onChange(nextValue)}
    >
      <SelectTrigger className="w-full">
        <span className={label ? "" : "text-muted-foreground"}>
          {label || placeholder}
        </span>
      </SelectTrigger>
      <SelectContent>
        {flattenOptions(nodes).map((node) => (
          <SelectItem
            key={String(node.id)}
            value={String(node.id)}
            disabled={node.disabled}
          >
            {"　".repeat(node.depth)}
            {node.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function NavigationNode({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: TreeOption
  selectedId?: string
  onSelect: (id: string) => void
  depth?: number
}) {
  const id = String(node.id)
  return (
    <div>
      <button
        type="button"
        className={`flex min-h-8 w-full items-center rounded-md px-2 text-left text-sm transition-colors hover:bg-accent ${
          selectedId === id
            ? "bg-accent font-medium text-accent-foreground"
            : ""
        }`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => onSelect(id)}
      >
        <span className="truncate">{node.label}</span>
      </button>
      {node.children?.map((child) => (
        <NavigationNode
          key={String(child.id)}
          node={child}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export function TreeNavigation({
  nodes,
  selectedId,
  onSelect,
  placeholder = "请输入名称",
}: {
  nodes: TreeOption[]
  selectedId?: string
  onSelect: (id: string) => void
  placeholder?: string
}) {
  const [keyword, setKeyword] = React.useState("")
  const visibleNodes = React.useMemo(
    () => filterTree(nodes, keyword),
    [keyword, nodes]
  )
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          value={keyword}
          placeholder={placeholder}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>
      <div className="max-h-[34rem] overflow-y-auto">
        {visibleNodes.length ? (
          visibleNodes.map((node) => (
            <NavigationNode
              key={String(node.id)}
              node={node}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            暂无匹配部门
          </p>
        )}
      </div>
    </div>
  )
}

function CheckboxTreeNode({
  node,
  selected,
  expanded,
  linked,
  onSelectedChange,
  onExpandedChange,
  depth = 0,
}: {
  node: TreeOption
  selected: Set<string>
  expanded: Set<string>
  linked: boolean
  onSelectedChange: (selected: Set<string>) => void
  onExpandedChange: (expanded: Set<string>) => void
  depth?: number
}) {
  const id = String(node.id)
  const hasChildren = Boolean(node.children?.length)
  const isExpanded = expanded.has(id)

  function toggleNode(checked: boolean) {
    const next = new Set(selected)
    const ids = linked ? collectIds([node]) : [id]
    ids.forEach((item) => (checked ? next.add(item) : next.delete(item)))
    if (linked) reconcileParents([node], next)
    onSelectedChange(next)
  }

  return (
    <div>
      <div
        className="flex min-h-8 items-center gap-1 rounded-md px-1 hover:bg-accent/60"
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          disabled={!hasChildren}
          aria-label={isExpanded ? "收起节点" : "展开节点"}
          onClick={() => {
            const next = new Set(expanded)
            if (isExpanded) next.delete(id)
            else next.add(id)
            onExpandedChange(next)
          }}
        >
          {hasChildren && (isExpanded ? <ChevronDown /> : <ChevronRight />)}
        </Button>
        <Checkbox
          checked={selected.has(id)}
          disabled={node.disabled}
          onCheckedChange={(checked) => toggleNode(Boolean(checked))}
        />
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-sm"
          disabled={node.disabled}
          onClick={() => toggleNode(!selected.has(id))}
        >
          {node.label}
        </button>
      </div>
      {hasChildren &&
        isExpanded &&
        node.children?.map((child) => (
          <CheckboxTreeNode
            key={String(child.id)}
            node={child}
            selected={selected}
            expanded={expanded}
            linked={linked}
            onSelectedChange={onSelectedChange}
            onExpandedChange={onExpandedChange}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}

export function CheckboxTree({
  nodes,
  value,
  onChange,
  linked = true,
  onLinkedChange,
  maxHeight = "18rem",
}: {
  nodes: TreeOption[]
  value: string[]
  onChange: (value: string[]) => void
  linked?: boolean
  onLinkedChange?: (linked: boolean) => void
  maxHeight?: string
}) {
  const allIds = React.useMemo(() => collectIds(nodes), [nodes])
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(allIds))
  const selected = React.useMemo(() => new Set(value.map(String)), [value])
  const allExpanded = allIds.length > 0 && expanded.size === allIds.length
  const allSelected = allIds.length > 0 && selected.size === allIds.length

  React.useEffect(() => setExpanded(new Set(allIds)), [allIds])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-sm">
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox
            checked={allExpanded}
            onCheckedChange={(checked) =>
              setExpanded(checked ? new Set(allIds) : new Set())
            }
          />
          展开/折叠
        </Label>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onChange(checked ? allIds : [])}
          />
          全选/全不选
        </Label>
        {onLinkedChange && (
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox
              checked={linked}
              onCheckedChange={(checked) => onLinkedChange(Boolean(checked))}
            />
            父子联动
          </Label>
        )}
      </div>
      <div
        className="overflow-y-auto rounded-lg border p-2"
        style={{ maxHeight }}
      >
        {nodes.length ? (
          nodes.map((node) => (
            <CheckboxTreeNode
              key={String(node.id)}
              node={node}
              selected={selected}
              expanded={expanded}
              linked={linked}
              onSelectedChange={(next) => {
                if (linked) reconcileParents(nodes, next)
                onChange([...next])
              }}
              onExpandedChange={setExpanded}
            />
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            暂无数据
          </p>
        )}
      </div>
    </div>
  )
}
