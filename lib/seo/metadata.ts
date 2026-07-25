import type { Metadata } from 'next'
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  TWITTER_CARD,
  absoluteUrl,
} from './site'

type PageMetaInput = {
  title: string
  description?: string
  /** canonical이자 og:url. 루트는 '/'. */
  path: string
  /** 절대 경로 이미지. 없으면 루트 opengraph-image가 자동으로 붙는다. */
  image?: { url: string; width: number; height: number; alt: string }
  type?: 'website' | 'article'
  /** 로그인이 필요하거나 내용이 얕은 화면은 색인에서 뺀다. */
  noIndex?: boolean
}

/**
 * 페이지 메타데이터를 한 곳에서 만든다.
 * canonical·og·twitter를 손으로 세 번 적으면 반드시 한 군데가 어긋나기 때문이다.
 */
export function pageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  image,
  type = 'website',
  noIndex = false,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path)

  return {
    title,
    description,
    alternates: { canonical: url },
    ...(noIndex && { robots: { index: false, follow: true } }),
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type,
      ...(image && { images: [image] }),
    },
    twitter: {
      card: TWITTER_CARD,
      title: `${title} · ${SITE_NAME}`,
      description,
      ...(image && { images: [image.url] }),
    },
  }
}
