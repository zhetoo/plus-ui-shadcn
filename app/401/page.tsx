import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-7xl font-bold">401</p>
      <h1 className="text-2xl font-semibold">无权访问</h1>
      <p className="text-muted-foreground">当前账号没有访问该页面的权限。</p>
      <Button render={<Link href="/" />}>返回首页</Button>
    </main>
  )
}
