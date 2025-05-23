import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GPT 슬라이드 생성기',
  description: 'GPT 기반 PPT 슬라이드 구성 지원 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
} 