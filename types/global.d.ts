declare global {
  interface BaseEntity {
    createBy?: unknown
    createDept?: unknown
    createTime?: string
    updateBy?: unknown
    updateTime?: string
  }

  interface PageQuery {
    pageNum: number
    pageSize: number
  }

  type ElTagType = "primary" | "success" | "info" | "warning" | "danger"
}

export {}
