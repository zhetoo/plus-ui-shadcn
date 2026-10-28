export interface CrudOption {
  label: string
  value: string
}

export interface CrudTreeOption {
  id: string | number
  label: string
  children?: CrudTreeOption[]
  disabled?: boolean
}

export type CrudFieldType =
  | "text"
  | "password"
  | "number"
  | "date"
  | "daterange"
  | "textarea"
  | "richtext"
  | "select"
  | "boolean"
  | "array"
  | "tree"

export interface CrudField {
  key: string
  label: string
  type?: CrudFieldType
  required?: boolean | ((form: Record<string, unknown>) => boolean)
  visible?: (form: Record<string, unknown>) => boolean
  disabled?: boolean | ((form: Record<string, unknown>) => boolean)
  placeholder?: string
  options?: CrudOption[]
  loadOptions?: (form: Record<string, unknown>) => Promise<CrudOption[]>
  loadTreeOptions?: (form: Record<string, unknown>) => Promise<CrudTreeOption[]>
  linkedKey?: string
  /** 日期范围的结束日期字段，key 为开始日期字段 */
  endKey?: string
  reloadOptionsOnChange?: boolean
  resetFieldsOnChange?: Record<string, unknown>
}

export interface CrudColumn {
  key: string
  label: string
  format?:
    | "status"
    | "datetime"
    | "array"
    | "link"
    | "boolean"
    | "resource"
    | "activity"
    | "suspension"
  statusLabels?: [string, string]
}

export type CrudApi = (...args: unknown[]) => Promise<unknown>

export interface CrudRowAction {
  label: string
  permission?: string
  href?: (row: Record<string, unknown>) => string
  run?: (row: Record<string, unknown>) => Promise<unknown>
  confirm?: (row: Record<string, unknown>) => string
  visible?: (row: Record<string, unknown>) => boolean
  render?: (row: Record<string, unknown>) => "dialog"
  successMessage?: string | false
}

export interface CrudToolbarAction {
  label: string
  permission?: string
  run?: (...args: unknown[]) => Promise<unknown>
  href?: string
  confirm?: string
  successMessage?: string | false
}

export interface CrudConfig {
  path: string
  title: string
  description: string
  idKey: string
  permissionPrefix: string
  list: CrudApi
  detail?: CrudApi
  create?: CrudApi
  update?: CrudApi
  remove?: CrudApi
  uploadUrl?: string
  uploadPermission?: string
  uploadExtraFields?: () => Promise<Record<string, string> | null>
  uploadAction?: (data: FormData) => Promise<unknown>
  exportUrl?: string
  queryFields: CrudField[]
  columns: CrudColumn[]
  detailFields?: Array<{ key: string; label: string }>
  formFields: CrudField[]
  defaultForm?: Record<string, unknown>
  loadDefaultForm?: () => Promise<Record<string, unknown>>
  deriveForm?: (form: Record<string, unknown>) => Record<string, unknown>
  preparePayload?: (payload: Record<string, unknown>) => Record<string, unknown>
  fixedQuery?: Record<string, unknown>
  statusChange?: (
    row: Record<string, unknown>,
    status: string
  ) => Promise<unknown>
  rowActions?: CrudRowAction[]
  toolbarActions?: CrudToolbarAction[]
  bulkActions?: CrudToolbarAction[]
  createHref?: string
  editHref?: (row: Record<string, unknown>) => string
  canEditRow?: (row: Record<string, unknown>) => boolean
  canRemoveRow?: (row: Record<string, unknown>) => boolean
  removeLabel?: string
  removeConfirm?: (row: Record<string, unknown>) => string
  bulkRemove?: boolean
}

export const STATUS_OPTIONS: CrudOption[] = [
  { label: "正常", value: "0" },
  { label: "停用", value: "1" },
]

export const api = (value: unknown) => value as CrudApi
