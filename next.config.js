/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mammoth', 'pdf-parse']
  },
  // API 경로별 설정
  async rewrites() {
    return []
  },
  // 파일 업로드 크기 제한
  serverRuntimeConfig: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  // 클라이언트 런타임 설정
  publicRuntimeConfig: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  // 웹팩 설정
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 서버 사이드에서 mammoth와 pdf-parse 패키지 최적화
      config.externals.push('mammoth', 'pdf-parse')
    }
    return config
  },
  // 빌드 최적화
  swcMinify: true,
  // 이미지 최적화 비활성화 (필요에 따라)
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig 