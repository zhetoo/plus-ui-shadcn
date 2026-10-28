import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // 后端部分接口依赖尾斜杠（如新增用户时 GET /system/user/），关闭重定向避免被改成其他接口
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const target = process.env.API_PROXY_TARGET
    const baseApi = process.env.NEXT_PUBLIC_APP_BASE_API
    if (!target || !baseApi) return []

    return [
      // :path* 不包含尾斜杠，带尾斜杠的请求需单独转发并保留斜杠
      {
        source: `${baseApi}/:path*/`,
        destination: `${target}/:path*/`,
      },
      {
        source: `${baseApi}/:path*`,
        destination: `${target}/:path*`,
      },
    ]
  },
}

export default nextConfig
