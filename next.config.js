/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mammoth', 'pdf-parse']
  },
  // Vercel 배포 최적화
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
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
  
  // 웹팩 설정 - Vercel 환경 고려
  webpack: (config, { isServer, dev }) => {
    if (isServer && !dev) {
      // 프로덕션 서버 사이드에서 외부 패키지 처리
      config.externals = config.externals || []
      config.externals.push({
        'mammoth': 'commonjs mammoth',
        'pdf-parse': 'commonjs pdf-parse'
      })
    }
    
    // 파일 처리 최적화
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    }
    
    return config
  },
  
  // 빌드 최적화
  swcMinify: true,
  
  // 이미지 최적화
  images: {
    domains: [],
    unoptimized: process.env.NODE_ENV === 'production'
  },
  
  // 환경 변수 설정
  env: {
    VERCEL_ENV: process.env.VERCEL_ENV || 'development',
    VERCEL_URL: process.env.VERCEL_URL || 'localhost:3000'
  },
  
  // 헤더 설정
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  }
}

module.exports = nextConfig 