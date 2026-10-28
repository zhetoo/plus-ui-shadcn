"use client"

import * as React from "react"

import {
  addData,
  delData,
  getData,
  listData,
  updateData,
} from "@/api/system/dict/data"
import { optionselect, refreshCache } from "@/api/system/dict/type"
import { CrudPage } from "@/components/crud-page"
import { CRUD_CONFIGS } from "@/lib/crud-configs"
import { api, type CrudConfig } from "@/lib/crud"

export function DictPage() {
  const [dictType, setDictType] = React.useState("")
  const [dictId, setDictId] = React.useState("")

  React.useEffect(() => {
    void optionselect().then((response) => {
      if (response.data?.[0]) {
        setDictType(response.data[0].dictType)
        setDictId(String(response.data[0].dictId))
      }
    })
  }, [])

  const dataConfig = React.useMemo<CrudConfig | null>(
    () =>
      dictType
        ? {
            path: `/system/dict/data/${dictType}`,
            title: "字典数据",
            description: `维护 ${dictType} 的标签和键值`,
            idKey: "dictCode",
            permissionPrefix: "system:dict",
            list: api(listData),
            detail: api(getData),
            create: api(addData),
            update: api(updateData),
            remove: api(delData),
            exportUrl: "/system/dict/data/export",
            fixedQuery: { dictType },
            queryFields: [{ key: "dictLabel", label: "字典标签" }],
            columns: [
              { key: "dictCode", label: "编码" },
              { key: "dictLabel", label: "数据标签" },
              { key: "dictValue", label: "数据键值" },
              { key: "dictSort", label: "排序" },
              { key: "listClass", label: "回显样式" },
              { key: "remark", label: "备注" },
              { key: "createTime", label: "创建时间", format: "datetime" },
            ],
            formFields: [
              { key: "dictLabel", label: "数据标签", required: true },
              { key: "dictValue", label: "数据键值", required: true },
              { key: "cssClass", label: "样式属性" },
              { key: "dictSort", label: "显示排序", type: "number" },
              {
                key: "listClass",
                label: "回显样式",
                type: "select",
                options: [
                  { label: "默认", value: "primary" },
                  { label: "成功", value: "success" },
                  { label: "信息", value: "info" },
                  { label: "警告", value: "warning" },
                  { label: "危险", value: "danger" },
                ],
              },
              { key: "remark", label: "备注", type: "textarea" },
            ],
            defaultForm: { dictType, dictSort: 0, listClass: "primary" },
          }
        : null,
    [dictType]
  )

  const typeConfig = React.useMemo<CrudConfig>(
    () => ({
      ...CRUD_CONFIGS["/system/dict"],
      toolbarActions: [
        {
          label: "刷新缓存",
          permission: "system:dict:remove",
          confirm: "确认刷新字典缓存吗？",
          run: refreshCache,
        },
      ],
    }),
    []
  )

  return (
    <div className="grid items-start gap-4 2xl:grid-cols-2">
      <CrudPage
        config={typeConfig}
        selectedRowId={dictId}
        onRowClick={(row) => {
          setDictId(String(row.dictId))
          setDictType(String(row.dictType))
        }}
      />
      {dataConfig ? (
        <CrudPage key={dictType} config={dataConfig} />
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">
          暂无字典类型
        </p>
      )}
    </div>
  )
}
