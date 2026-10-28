export interface AppRouteMeta {
  title?: string
  icon?: string
  noCache?: boolean
  link?: string
  activeMenu?: string
}

export interface AppRoute {
  path: string
  name?: string
  component?: string
  hidden?: boolean
  redirect?: string
  alwaysShow?: boolean
  query?: string
  meta?: AppRouteMeta
  children?: AppRoute[]
}
