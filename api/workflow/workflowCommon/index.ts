import { RouterJumpVo } from "@/api/workflow/workflowCommon/types"

interface RouterProxy {
  $route: unknown
  $tab: { closePage: (route: unknown) => void }
  $router: {
    push: (location: { path: string; query: Record<string, unknown> }) => void
  }
}

export default {
  routerJump(routerJumpVo: RouterJumpVo, proxy: RouterProxy) {
    proxy.$tab.closePage(proxy.$route)
    proxy.$router.push({
      path: routerJumpVo.formPath,
      query: {
        id: routerJumpVo.businessId,
        type: routerJumpVo.type,
        taskId: routerJumpVo.taskId,
      },
    })
  },
}
