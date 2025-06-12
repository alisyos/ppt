'use client'

import React, { useState } from 'react'
import { SlideData } from '../types/slides'
import PptxGenJS from 'pptxgenjs'

// SlidePreview 컴포넌트의 props 타입
interface SlidePreviewProps {
  slideData: SlideData
}

export default function SlidePreview({ slideData }: SlidePreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isExporting, setIsExporting] = useState(false)

  const handlePrevSlide = () => {
    setCurrentSlide(prev => Math.max(0, prev - 1))
  }

  const handleNextSlide = () => {
    setCurrentSlide(prev => Math.min(slideData.slides.length - 1, prev + 1))
  }

  const handleExportPPTX = async () => {
    setIsExporting(true)
    try {
      const pptx = new PptxGenJS()
      
      slideData.slides.forEach((slide, index) => {
        const pptxSlide = pptx.addSlide()
        
        // 메인 카피 (제목)
        pptxSlide.addText(slide.mainCopy, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 1,
          fontSize: 24,
          bold: true,
          color: '363636'
        })
        
        // 서브 카피
        if (slide.subCopy) {
          pptxSlide.addText(slide.subCopy, {
            x: 0.5,
            y: 1.5,
            w: 9,
            h: 0.8,
            fontSize: 16,
            color: '666666'
          })
        }
        
        // 본문 내용
        if (slide.body && slide.body.length > 0) {
          let bodyText = ''
          slide.body.forEach((item, idx) => {
            bodyText += `• ${item.point}\n`
            if (item.sub && item.sub.length > 0) {
              item.sub.forEach(subItem => {
                bodyText += `  - ${subItem}\n`
              })
            }
            if (idx < slide.body.length - 1) bodyText += '\n'
          })
          pptxSlide.addText(bodyText, {
            x: 0.5,
            y: slide.subCopy ? 2.5 : 2,
            w: 9,
            h: 4,
            fontSize: 14,
            color: '333333',
            valign: 'top'
          })
        }
        
        // 시각적 제안 (본문 하단에 명확하게 구분하여 추가)
        if (slide.visualSuggestion && slide.visualSuggestion.length > 0) {
          const visualText = `💡 시각적 제안:\n${slide.visualSuggestion.map(item => `• ${item}`).join('\n')}`
          pptxSlide.addText(visualText, {
            x: 0.5,
            y: 5.8,
            w: 9,
            h: 2,
            fontSize: 12,
            color: '0066CC',
            bold: true,
            valign: 'top',
            fill: { color: 'F0F8FF' }
          })
        }
        
        // 발표 스크립트 (노트 섹션에 추가)
        if (slide.script) {
          pptxSlide.addNotes(slide.script)
        }
      })
      
      await pptx.writeFile({ fileName: `${slideData.title || 'presentation'}.pptx` })
    } catch (error) {
      console.error('PPTX 내보내기 오류:', error)
      alert('PPTX 파일 생성 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportScript = () => {
    // 스크립트가 있는 슬라이드들만 필터링
    const slidesWithScript = slideData.slides.filter(slide => slide.script)
    
    if (slidesWithScript.length === 0) {
      alert('발표 스크립트가 없습니다.')
      return
    }

    // 스크립트 텍스트 생성
    let scriptContent = `${slideData.title}\n발표 스크립트\n\n`
    scriptContent += `발표 목적: ${slideData.purpose}\n`
    scriptContent += `대상 청중: ${slideData.audience}\n`
    scriptContent += `생성일: ${new Date().toLocaleDateString('ko-KR')}\n\n`
    scriptContent += '='.repeat(50) + '\n\n'

    slidesWithScript.forEach((slide, index) => {
      const slideNumber = slideData.slides.indexOf(slide) + 1
      scriptContent += `[슬라이드 ${slideNumber}] ${slide.mainCopy}\n`
      scriptContent += `${'-'.repeat(30)}\n`
      scriptContent += `${slide.script}\n\n`
    })

    // 파일 다운로드
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${slideData.title || 'presentation'}_script.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 스크립트가 있는 슬라이드가 하나라도 있는지 확인
  const hasAnyScript = slideData.slides.some(slide => slide.script)

  const currentSlideData = slideData.slides[currentSlide]

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{slideData.title}</h2>
          <div className="text-sm text-gray-600 mt-2 space-y-1">
            <div>• 목적: {slideData.purpose}</div>
            <div>• 대상: {slideData.audience}</div>
            <div>• 슬라이드수: {slideData.slides.length}개</div>
          </div>
        </div>
        <div className="flex space-x-2">
          {hasAnyScript && (
            <button
              onClick={handleExportScript}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm"
            >
              📝 스크립트 다운로드
            </button>
          )}
          <button
            onClick={handleExportPPTX}
            disabled={isExporting}
            className={`px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm ${
              isExporting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isExporting ? '생성 중...' : '📄 PPTX 내보내기'}
          </button>
        </div>
      </div>

      {/* 슬라이드 내용 */}
      <div className="bg-gray-50 rounded-lg p-6 min-h-[400px] mb-6">
        <div className="bg-white rounded-lg p-6 h-full shadow-sm">
          {/* 메인 카피 */}
          <h3 className="text-xl font-bold text-gray-800 mb-3">
            {currentSlideData.mainCopy}
          </h3>
          
          {/* 서브 카피 */}
          {currentSlideData.subCopy && (
            <p className="text-gray-600 mb-4 text-sm">
              {currentSlideData.subCopy}
            </p>
          )}
          
          {/* 본문 내용 */}
          {currentSlideData.body && currentSlideData.body.length > 0 && (
            <div className="space-y-4 mb-6">
              {currentSlideData.body.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-gray-700 text-sm font-medium leading-relaxed">{item.point}</span>
                  </div>
                  {item.sub && item.sub.length > 0 && (
                    <div className="ml-6 space-y-1">
                      {item.sub.map((subItem, subIndex) => (
                        <div key={subIndex} className="flex items-start space-x-2">
                          <span className="text-gray-400 mt-1">-</span>
                          <span className="text-gray-600 text-xs leading-relaxed">{subItem}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* 시각적 제안 */}
          {currentSlideData.visualSuggestion && currentSlideData.visualSuggestion.length > 0 && (
            <div className="border-t pt-4 mt-6">
              <h4 className="text-xs font-medium text-gray-500 mb-2">💡 시각적 제안</h4>
              <div className="flex flex-wrap gap-2">
                {currentSlideData.visualSuggestion.map((suggestion, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                  >
                    {suggestion}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 발표 스크립트 */}
          {currentSlideData.script && (
            <div className="border-t pt-4 mt-6">
              <h4 className="text-xs font-medium text-gray-500 mb-2">🎤 발표 스크립트</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {currentSlideData.script}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrevSlide}
          disabled={currentSlide === 0}
          className={`px-4 py-2 rounded-lg transition ${
            currentSlide === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          ← 이전
        </button>

        <div className="flex space-x-2">
          {slideData.slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition ${
                index === currentSlide ? 'bg-primary' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNextSlide}
          disabled={currentSlide === slideData.slides.length - 1}
          className={`px-4 py-2 rounded-lg transition ${
            currentSlide === slideData.slides.length - 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          다음 →
        </button>
      </div>

      {/* 슬라이드 번호 */}
      <div className="text-center mt-4">
        <span className="text-sm text-gray-500">
          {currentSlide + 1} / {slideData.slides.length}
        </span>
      </div>
    </div>
  )
} 