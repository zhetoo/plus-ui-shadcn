import { AuthLayout } from "@/components/auth-layout"
import { LoginForm } from "@/components/login-form"

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams
  const value = Array.isArray(query.redirect)
    ? query.redirect[0]
    : query.redirect
  let redirectTo = value || "/"
  try {
    redirectTo = decodeURIComponent(redirectTo)
  } catch {
    redirectTo = "/"
  }

  return (
    <AuthLayout>
      <LoginForm redirectTo={redirectTo} />
    </AuthLayout>
  )
}
