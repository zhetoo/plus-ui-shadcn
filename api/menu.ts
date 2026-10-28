import request from "@/utils/request"
import { AxiosPromise } from "axios"
import { AppRoute } from "@/types/route"

// 获取路由
export function getRouters(): AxiosPromise<AppRoute[]> {
  return request({
    url: "/system/menu/getRouters",
    method: "get",
  })
}
