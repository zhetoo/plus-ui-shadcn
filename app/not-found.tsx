import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-7xl font-bold">404</p>
      <h1 className="text-2xl font-semibold">页面不存在</h1>
      <p className="text-muted-foreground">请检查访问地址，或返回系统首页。</p>
      <Button render={<Link href="/" />}>返回首页</Button>
    </main>
  )
}
