import "axios"

declare module "axios" {
  interface AxiosResponse<T = any> {
    code: number
    msg: string
    rows: T
    total: number
  }

  interface HeadersDefaults {
    isToken?: boolean
    isEncrypt?: string
    repeatSubmit?: boolean
  }
}
