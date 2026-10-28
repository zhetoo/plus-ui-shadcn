import { FeaturePage } from "@/components/feature-page"

interface DynamicPageProps {
  params: Promise<{ slug: string[] }>
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const { slug } = await params
  return <FeaturePage pathname={`/${slug.join("/")}`} />
}
