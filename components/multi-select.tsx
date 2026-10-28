"use client"

import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface MultiSelectOption {
  label: string
  value: string
  disabled?: boolean
}

interface MultiSelectProps {
  value: string[]
  options: MultiSelectOption[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
}

export function MultiSelect({
  value,
  options,
  onChange,
  placeholder = "请选择",
  disabled,
}: MultiSelectProps) {
  const selected = new Set(value.map(String))
  const selectedLabels = options
    .filter((option) => selected.has(option.value))
    .map((option) => option.label)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-between px-3 font-normal"
          />
        }
      >
        <span className="truncate text-left">
          {selectedLabels.length ? selectedLabels.join("、") : placeholder}
        </span>
        <ChevronDown className="size-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-64 min-w-(--anchor-width) overflow-y-auto">
        {options.length ? (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.has(option.value)}
              disabled={option.disabled}
              onCheckedChange={(checked) => {
                const next = new Set(selected)
                if (checked) next.add(option.value)
                else next.delete(option.value)
                onChange([...next])
              }}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">暂无选项</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
