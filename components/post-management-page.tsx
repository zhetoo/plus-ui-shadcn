"use client"

import * as React from "react"

import { deptTreeSelect } from "@/api/system/post"
import { CrudPage } from "@/components/crud-page"
import { TreeNavigation, type TreeOption } from "@/components/tree-controls"
import { Card, CardContent } from "@/components/ui/card"
import { CRUD_CONFIGS } from "@/lib/crud-configs"
import type { CrudConfig } from "@/lib/crud"

export function PostManagementPage() {
  const [departments, setDepartments] = React.useState<TreeOption[]>([])
  const [departmentId, setDepartmentId] = React.useState("")

  React.useEffect(() => {
    void deptTreeSelect().then((response) =>
      setDepartments(response.data ?? [])
    )
  }, [])

  const config = React.useMemo<CrudConfig>(() => {
    const base = CRUD_CONFIGS["/system/post"]
    return {
      ...base,
      fixedQuery: departmentId ? { belongDeptId: departmentId } : undefined,
      queryFields: base.queryFields.filter((field) => field.key !== "deptId"),
    }
  }, [departmentId])

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <Card>
        <CardContent>
          <TreeNavigation
            nodes={[{ id: "", label: "全部部门" }, ...departments]}
            selectedId={departmentId}
            onSelect={setDepartmentId}
            placeholder="请输入部门名称"
          />
        </CardContent>
      </Card>
      <CrudPage key={departmentId || "all"} config={config} />
    </div>
  )
}
