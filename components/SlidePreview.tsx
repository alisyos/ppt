'use client'

import React, { useState, useEffect } from 'react'
import { SlideData } from '../types/slides'

// SlidePreview 컴포넌트의 props 타입
interface SlidePreviewProps {
  slideData: SlideData
}

export default function SlidePreview({ slideData }: SlidePreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [pptxgenLoaded, setPptxgenLoaded] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')

  // pptxgenjs 라이브러리를 동적으로 로드
  useEffect(() => {
    import('pptxgenjs').then((module) => {
      setPptxgenLoaded(true)
      console.log('pptxgenjs 로드 완료')
    }).catch(err => {
      console.error('pptxgenjs 로드 실패:', err)
    })
  }, [])

  const nextSlide = () => {
    setCurrentSlide(current => 
      current < slideData.slides.length - 1 ? current + 1 : current
    )
  }

  const prevSlide = () => {
    setCurrentSlide(current => 
      current > 0 ? current - 1 : current
    )
  }

  const copyToClipboard = async () => {
    try {
      let textContent = `${slideData.title}\n\n`
      
      slideData.slides.forEach((slide, index) => {
        textContent += `슬라이드 ${index + 1}: ${slide.title}\n`
        slide.content.forEach(item => {
          const isSectionTitle = item.trim().endsWith(':')
          if (isSectionTitle) {
            textContent += `${item}\n`
          } else {
            textContent += `• ${item}\n`
          }
        })
        textContent += '\n'
      })
      
      await navigator.clipboard.writeText(textContent)
      setCopyMessage('텍스트가 클립보드에 복사되었습니다!')
      
      // 3초 후 메시지 제거
      setTimeout(() => {
        setCopyMessage('')
      }, 3000)
    } catch (error) {
      console.error('클립보드 복사 오류:', error)
      setCopyMessage('복사에 실패했습니다. 다시 시도해주세요.')
      setTimeout(() => {
        setCopyMessage('')
      }, 3000)
    }
  }

  const downloadPPTX = async () => {
    try {
      if (!pptxgenLoaded) {
        alert('PPTX 생성 모듈을 로드 중입니다. 잠시 후 다시 시도해주세요.')
        return
      }
      
      const pptxgenModule = await import('pptxgenjs')
      const pptxgen = pptxgenModule.default
      
      const pptx = new pptxgen()
      
      slideData.slides.forEach(slide => {
        const newSlide = pptx.addSlide()
        
        // 제목
        newSlide.addText(slide.title, { 
          x: 0.5, 
          y: 0.5, 
          fontSize: 24,
          bold: true,
          color: '363636'
        })
        
        // 내용
        slide.content.forEach((item, i) => {
          const isSectionTitle = item.trim().endsWith(':')
          if (isSectionTitle) {
            newSlide.addText(item, { 
              x: 0.5, 
              y: 1.2 + (i * 0.3), 
              fontSize: 16,
              bold: true,
              color: '363636'
            })
          } else {
            newSlide.addText(`• ${item}`, { 
              x: 0.7, 
              y: 1.2 + (i * 0.3), 
              fontSize: 14,
              color: '484848'
            })
          }
        })
      })
      
      pptx.writeFile({ fileName: '슬라이드.pptx' })
    } catch (error) {
      console.error('PPTX 생성 오류:', error)
      alert('PPTX 생성 중 오류가 발생했습니다.')
    }
  }

  const getSlideContentClass = (type: string) => {
    switch(type) {
      case 'title':
        return 'bg-primary/10 text-center'
      case 'conclusion':
        return 'bg-secondary/10'
      default:
        return 'bg-white'
    }
  }

  return (
    <div className="bg-white shadow-xl rounded-xl overflow-hidden flex flex-col h-full">
      <div className="bg-gray-100 p-3 border-b flex justify-between items-center">
        <h2 className="text-lg font-bold">생성된 슬라이드</h2>
        <div className="flex items-center space-x-1 text-sm">
          <span className="font-medium">{currentSlide + 1}</span>
          <span>/ {slideData.slides.length}</span>
        </div>
      </div>
      
      <div className="p-4 flex-grow overflow-auto">
        <div className="border rounded-lg overflow-hidden h-full">
          {/* 슬라이드 미리보기 */}
          <div className={`p-6 ${getSlideContentClass(slideData.slides[currentSlide].type)} h-full flex flex-col`}>
            <h3 className="text-xl font-bold mb-4">
              {slideData.slides[currentSlide].title}
            </h3>
            <ul className="space-y-2 flex-grow">
              {slideData.slides[currentSlide].content.map((item, i) => {
                // 섹션 제목인지 확인 (콜론으로 끝나는 경우)
                const isSectionTitle = item.trim().endsWith(':')
                
                if (isSectionTitle) {
                  return (
                    <li key={i} className="font-semibold text-gray-800 mt-3 first:mt-0">
                      {item}
                    </li>
                  )
                } else {
                  return (
                    <li key={i} className="flex items-start ml-4">
                      <span className="mr-2 flex-shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  )
                }
              })}
            </ul>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg disabled:opacity-50 text-sm"
          >
            이전
          </button>
          <button
            onClick={nextSlide}
            disabled={currentSlide === slideData.slides.length - 1}
            className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg disabled:opacity-50 text-sm"
          >
            다음
          </button>
        </div>
        
        <div className="flex space-x-2 items-center">
          {copyMessage && (
            <span className="text-sm text-green-600 mr-2">{copyMessage}</span>
          )}
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
          >
            텍스트 복사
          </button>
          <button
            onClick={downloadPPTX}
            className="px-3 py-1.5 bg-secondary text-white rounded-lg text-sm hover:bg-secondary/90 transition"
          >
            PPTX 저장
          </button>
        </div>
      </div>
    </div>
  )
} 