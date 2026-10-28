/**
 * 后台页面切换过渡，template 在每次路由切换时重新挂载，从而重播进入动画
 * @param children 当前路由页面
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="animate-in duration-300 ease-out fade-in-0 fill-mode-both slide-in-from-bottom-2">
      {children}
    </div>
  )
}
