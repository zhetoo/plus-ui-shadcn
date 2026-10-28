"use client"

import * as React from "react"

import { getConfigKey, updateConfigByKey } from "@/api/system/config"
import { CrudPage } from "@/components/crud-page"
import type { CrudConfig } from "@/lib/crud"
import { CRUD_CONFIGS } from "@/lib/crud-configs"

const PREVIEW_KEY = "sys.oss.previewListResource"

export function OssPage() {
  const [preview, setPreview] = React.useState(true)

  React.useEffect(() => {
    void getConfigKey(PREVIEW_KEY).then((response) =>
      setPreview(response.data === undefined || response.data === "true")
    )
  }, [])

  const config = React.useMemo<CrudConfig>(() => {
    const base = CRUD_CONFIGS["/system/oss"]
    return {
      ...base,
      columns: base.columns.map((column) =>
        column.key === "url"
          ? { ...column, format: preview ? "resource" : "link" }
          : column
      ),
      toolbarActions: [
        ...(base.toolbarActions ?? []),
        {
          label: preview ? "停用图片预览" : "启用图片预览",
          permission: "system:oss:edit",
          confirm: `确认${preview ? "停用" : "启用"}文件列表图片预览吗？`,
          run: async () => {
            const next = !preview
            const response = await updateConfigByKey(PREVIEW_KEY, next)
            setPreview(next)
            return response
          },
        },
      ],
    }
  }, [preview])

  return <CrudPage config={config} />
}
