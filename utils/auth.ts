const TOKEN_KEY = "Admin-Token"

export const getToken = () => {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string) => {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export const removeToken = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}
