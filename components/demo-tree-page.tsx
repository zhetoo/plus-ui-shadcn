"use client"

import { TreeCrudPage } from "@/components/tree-crud-page"
import type { CrudConfig } from "@/lib/crud"
import { CRUD_CONFIGS } from "@/lib/crud-configs"

const config: CrudConfig = {
  ...CRUD_CONFIGS["/demo/tree"],
  columns: [
    { key: "parentId", label: "父 ID" },
    { key: "deptId", label: "部门 ID" },
    { key: "userId", label: "用户 ID" },
    { key: "treeName", label: "树节点名" },
  ],
}

export function DemoTreePage() {
  return <TreeCrudPage config={config} nameKey="treeName" />
}
