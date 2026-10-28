"use client"

import { listDept } from "@/api/system/dept"
import { cascadeDelMenu, listMenu } from "@/api/system/menu"
import { TreeCrudPage } from "@/components/tree-crud-page"
import { api, type CrudConfig } from "@/lib/crud"
import { CRUD_CONFIGS } from "@/lib/crud-configs"

const deptConfig: CrudConfig = {
  ...CRUD_CONFIGS["/system/dept"],
  list: api(listDept),
  columns: [
    { key: "deptName", label: "部门名称" },
    { key: "deptCategory", label: "类别" },
    { key: "orderNum", label: "排序" },
    { key: "status", label: "状态", format: "status" },
    { key: "createTime", label: "创建时间", format: "datetime" },
  ],
}

const menuConfig: CrudConfig = {
  ...CRUD_CONFIGS["/system/menu"],
  list: api(listMenu),
  columns: [
    { key: "menuName", label: "菜单名称" },
    { key: "icon", label: "图标" },
    { key: "orderNum", label: "排序" },
    { key: "perms", label: "权限标识" },
    { key: "component", label: "组件路径" },
    { key: "status", label: "状态", format: "status" },
    { key: "createTime", label: "创建时间", format: "datetime" },
  ],
  formFields: CRUD_CONFIGS["/system/menu"].formFields.map((field) => {
    if (["icon", "path", "isFrame", "visible"].includes(field.key))
      return { ...field, visible: (form) => form.menuType !== "F" }
    if (["component", "queryParam", "isCache"].includes(field.key))
      return { ...field, visible: (form) => form.menuType === "C" }
    if (field.key === "perms")
      return { ...field, visible: (form) => form.menuType !== "M" }
    return field
  }),
}

export function MenuManagementPage() {
  return (
    <TreeCrudPage
      config={menuConfig}
      nameKey="menuName"
      defaultExpanded={false}
      cascadeRemove={async (ids) => cascadeDelMenu(ids)}
    />
  )
}

export function DepartmentManagementPage() {
  return <TreeCrudPage config={deptConfig} nameKey="deptName" />
}
