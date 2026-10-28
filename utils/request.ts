import axios, {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"
import FileSaver from "file-saver"
import { toast } from "sonner"

import { HttpStatus } from "@/enums/RespEnum"
import { env } from "@/lib/env"
import {
  decryptBase64,
  decryptWithAes,
  encryptBase64,
  encryptWithAes,
  generateAesKey,
} from "@/utils/crypto"
import { errorCode } from "@/utils/errorCode"
import { getToken } from "@/utils/auth"
import { decrypt, encrypt } from "@/utils/jsencrypt"
import { blobValidate, tansParams } from "@/utils/ruoyi"

const ENCRYPT_HEADER = "encrypt-key"

export const isRelogin = { show: false }

export const globalHeaders = () => ({
  Authorization: `Bearer ${getToken() ?? ""}`,
  clientid: env.clientId,
})

const service = axios.create({
  baseURL: env.baseApi,
  timeout: 50_000,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
    clientid: env.clientId,
  },
  transitional: { clarifyTimeoutError: true },
})

service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers["Content-Language"] =
    (typeof window !== "undefined" &&
      window.localStorage.getItem("language")) ||
    "zh_CN"

  const isToken = config.headers.isToken === false
  const allowRepeat = config.headers.repeatSubmit === false
  const isEncrypt = config.headers.isEncrypt === "true"
  const token = getToken()

  if (token && !isToken) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (config.method === "get" && config.params) {
    const query = tansParams(config.params)
    config.url = `${config.url}?${query.slice(0, -1)}`
    config.params = undefined
  }

  if (
    !allowRepeat &&
    (config.method === "post" || config.method === "put") &&
    typeof window !== "undefined"
  ) {
    const requestData =
      typeof config.data === "object"
        ? JSON.stringify(config.data)
        : String(config.data ?? "")
    const requestRecord = {
      url: config.url,
      data: requestData,
      time: Date.now(),
    }
    const previous = window.sessionStorage.getItem("sessionObj")
    if (previous) {
      const last = JSON.parse(previous) as typeof requestRecord
      if (
        last.url === requestRecord.url &&
        last.data === requestRecord.data &&
        requestRecord.time - last.time < 500
      ) {
        return Promise.reject(new Error("数据正在处理，请勿重复提交"))
      }
    }
    window.sessionStorage.setItem("sessionObj", JSON.stringify(requestRecord))
  }

  if (
    env.encrypt &&
    isEncrypt &&
    (config.method === "post" || config.method === "put")
  ) {
    const aesKey = generateAesKey()
    const encryptedKey = encrypt(encryptBase64(aesKey))
    if (encryptedKey) config.headers[ENCRYPT_HEADER] = encryptedKey
    const source =
      typeof config.data === "object"
        ? JSON.stringify(config.data)
        : String(config.data ?? "")
    config.data = encryptWithAes(source, aesKey)
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"]
  }

  return config
})

service.interceptors.response.use(
  (response: AxiosResponse) => {
    if (env.encrypt) {
      const encryptedKey = response.headers[ENCRYPT_HEADER]
      if (encryptedKey) {
        const base64Key = decrypt(encryptedKey)
        if (base64Key) {
          const aesKey = decryptBase64(base64Key)
          response.data = JSON.parse(decryptWithAes(response.data, aesKey))
        }
      }
    }

    if (
      response.config.responseType === "blob" ||
      response.config.responseType === "arraybuffer"
    ) {
      return response.data
    }

    const code = response.data.code || HttpStatus.SUCCESS
    const message = errorCode[code] || response.data.msg || errorCode.default

    if (code === HttpStatus.UNAUTHORIZED) {
      if (!isRelogin.show && typeof window !== "undefined") {
        isRelogin.show = true
        window.dispatchEvent(new CustomEvent("auth:expired"))
      }
      return Promise.reject(
        new Error("无效的会话，或者会话已过期，请重新登录。")
      )
    }
    if (code === HttpStatus.SERVER_ERROR || code === HttpStatus.WARN) {
      toast.error(message)
      return Promise.reject(new Error(message))
    }
    if (code !== HttpStatus.SUCCESS) {
      toast.error(message)
      return Promise.reject(new Error(message))
    }
    return response.data
  },
  (error: Error) => {
    let message = error.message
    if (message === "Network Error") message = "后端接口连接异常"
    else if (message.includes("timeout")) message = "系统接口请求超时"
    else if (message.includes("Request failed with status code"))
      message = `系统接口${message.slice(-3)}异常`
    toast.error(message)
    return Promise.reject(error)
  }
)

export async function download(url: string, params: unknown, fileName: string) {
  const response = await service.post(url, tansParams(params), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    responseType: "blob",
  })
  const blob = response as unknown as Blob
  if (blobValidate(blob)) {
    FileSaver.saveAs(blob, fileName)
    return
  }
  const text = await blob.text()
  const result = JSON.parse(text) as { code: number; msg?: string }
  toast.error(errorCode[result.code] || result.msg || errorCode.default)
}

export async function downloadGet(url: string, fileName: string) {
  const response = await service.get(url, { responseType: "blob" })
  const blob = response as unknown as Blob
  if (blobValidate(blob)) {
    FileSaver.saveAs(blob, fileName)
    return
  }
  const text = await blob.text()
  const result = JSON.parse(text) as { code: number; msg?: string }
  toast.error(errorCode[result.code] || result.msg || errorCode.default)
}

export default service
