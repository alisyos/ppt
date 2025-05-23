import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI PPT 슬라이드 생성기',
  description: 'GPT를 활용한 자동 PPT 슬라이드 생성 시스템',
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