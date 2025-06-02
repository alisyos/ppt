'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import InputForm from '../components/InputForm'
import { SlideData } from '../types/slides'

// 클라이언트 사이드에서만 동적으로 로드하여 SSR 문제 방지
const SlidePreview = dynamic(() => import('../components/SlidePreview'), {
  ssr: false,
  loading: () => (
    <div className="bg-white shadow-xl rounded-xl p-6 h-full flex items-center justify-center">
      <div className="animate-pulse">
        <p className="text-lg font-medium text-gray-600">슬라이드 컴포넌트 로딩 중...</p>
      </div>
    </div>
  )
})

export default function Home() {
  const [slideData, setSlideData] = useState<SlideData | null>(null)
  const [loading, setLoading] = useState(false)
  
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mb-8 text-center">
        <div className="flex justify-between items-start mb-4">
          <div></div>
          <a 
            href="/admin" 
            className="text-sm text-gray-500 hover:text-blue-600 transition px-3 py-1 rounded-lg hover:bg-gray-100"
          >
            ⚙️ 프롬프트 관리
          </a>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">AI PPT 슬라이드 생성기</h1>
        <p className="text-base md:text-lg text-gray-600">텍스트를 입력하면 PPT 슬라이드 구성을 자동으로 생성해드립니다</p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 좌측: 입력 영역 (2/5) */}
        <div className="lg:w-2/5">
          <InputForm setSlideData={setSlideData} setLoading={setLoading} loading={loading} />
        </div>
        
        {/* 우측: 결과물 영역 (3/5) */}
        <div className="lg:w-3/5">
          {slideData ? (
            <SlidePreview slideData={slideData} />
          ) : (
            <div className="bg-white shadow-xl rounded-xl p-6 md:p-8 h-full flex items-center justify-center">
              <div className="text-center">
                {loading ? (
                  <div className="animate-pulse">
                    <svg className="mx-auto h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg font-medium text-gray-600">슬라이드 생성 중...</p>
                  </div>
                ) : (
                  <div>
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p className="mt-4 text-xl font-medium text-gray-500">슬라이드 미리보기</p>
                    <p className="mt-2 text-gray-400">왼쪽 입력 폼에 내용을 입력하고<br />슬라이드 생성하기 버튼을 클릭하세요</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
} 