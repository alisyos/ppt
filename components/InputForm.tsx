'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { InputFormData, SlideData } from '../types/slides'

interface InputFormProps {
  setSlideData: (data: SlideData | null) => void
  setLoading: (loading: boolean) => void
  loading: boolean
  setIncludeScript: (includeScript: boolean) => void
}

export default function InputForm({ setSlideData, setLoading, loading, setIncludeScript }: InputFormProps) {
  const [formData, setFormData] = useState<InputFormData>({
    inputText: '',
    purpose: '보고',
    audience: '내부 팀',
    slidesCount: 5,
    language: 'ko',
    tone: 'professional',
    inputType: 'text',
    includeScript: true
  })
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    fileId?: string,
    filePath?: string,
    fileName?: string
  } | null>(null)
  
  // 지원하는 파일 타입 정의
  const supportedFileTypes = {
    'text/plain': true,
    'application/pdf': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/msword': true,
    'application/haansoftdocx': true, // 한글 오피스
    'application/vnd.hancom.hwp': true, // 한글 파일
    'application/x-hwp': true // 한글 파일 (다른 MIME 타입)
  }
  
  // 지원하는 파일 확장자
  const supportedExtensions = ['.txt', '.docx', '.pdf', '.doc', '.hwp']
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleInputTypeChange = (type: 'text' | 'file') => {
    setFormData(prev => ({ ...prev, inputType: type }))
    if (type === 'text') {
      setFile(null)
      setUploadedFileInfo(null)
    }
  }

  const resetForm = () => {
    setFormData({
      inputText: '',
      purpose: '보고',
      audience: '내부 팀',
      slidesCount: 5,
      language: 'ko',
      tone: 'professional',
      inputType: 'text',
      includeScript: true
    })
    setSlideData(null)
    setFile(null)
    setUploadedFileInfo(null)
    setError(null)
  }

  // 파일 타입 확인 함수
  const isValidFileType = (file: File) => {
    // MIME 타입 확인
    if (supportedFileTypes[file.type as keyof typeof supportedFileTypes]) {
      return true
    }
    
    // 파일 확장자 확인
    const fileName = file.name.toLowerCase()
    return supportedExtensions.some(ext => fileName.endsWith(ext))
  }

  // 파일 드롭 영역 이벤트 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      console.log('선택된 파일 타입:', selectedFile.type, '파일명:', selectedFile.name)
      
      if (isValidFileType(selectedFile)) {
        setFile(selectedFile)
        setUploadedFileInfo(null) // 새 파일 선택 시 이전 업로드 정보 초기화
        setError(null)
      } else {
        setError('지원하지 않는 파일 형식입니다. txt, docx, pdf, doc, hwp 파일만 지원합니다.')
      }
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      console.log('드롭된 파일 타입:', droppedFile.type, '파일명:', droppedFile.name)
      
      // 파일 타입 검사
      if (isValidFileType(droppedFile)) {
        setFile(droppedFile)
        setUploadedFileInfo(null) // 새 파일 드롭 시 이전 업로드 정보 초기화
        setError(null)
      } else {
        setError('지원하지 않는 파일 형식입니다. txt, docx, pdf, doc, hwp 파일만 지원합니다.')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (formData.inputType === 'text' && !formData.inputText.trim()) {
      setError('텍스트를 입력해주세요')
      return
    }
    
    if (formData.inputType === 'file' && !file && !uploadedFileInfo) {
      setError('파일을 업로드해주세요')
      return
    }
    
    setLoading(true)
    
    try {
      // 파일 처리
      let fileInfo = uploadedFileInfo
      
      if (formData.inputType === 'file' && file && !uploadedFileInfo) {
        try {
          const formDataFile = new FormData()
          formDataFile.append('file', file)
          
          const fileResponse = await axios.post('/api/upload', formDataFile)
          
          if (fileResponse.data.success) {
            fileInfo = {
              fileId: fileResponse.data.fileId,
              filePath: fileResponse.data.filePath,
              fileName: fileResponse.data.fileName
            }
            setUploadedFileInfo(fileInfo)
          } else {
            throw new Error(fileResponse.data.error || '파일 처리 중 오류가 발생했습니다')
          }
        } catch (err: any) {
          console.error('파일 처리 오류:', err)
          setError('파일을 처리할 수 없습니다. 다른 파일을 시도해보세요.')
          setLoading(false)
          return
        }
      }
      
      // API 요청
      const response = await axios.post('/api/generate-slides', {
        ...formData,
        ...(formData.inputType === 'file' && fileInfo 
          ? { filePath: fileInfo.filePath, fileName: fileInfo.fileName }
          : {})
      })
      
      if (response.data.success) {
        setSlideData(response.data.data)
      } else {
        setError(response.data.error || '슬라이드 생성 중 오류가 발생했습니다')
      }
    } catch (err: any) {
      setError('서버 오류가 발생했습니다. 나중에 다시 시도해주세요')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 md:p-8">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-3">입력 방식 선택</h2>
            <div className="flex space-x-2">
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg ${formData.inputType === 'text' ? 'bg-primary text-white' : 'bg-gray-100'}`}
                onClick={() => handleInputTypeChange('text')}
              >
                텍스트 입력
              </button>
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg ${formData.inputType === 'file' ? 'bg-primary text-white' : 'bg-gray-100'}`}
                onClick={() => handleInputTypeChange('file')}
              >
                파일 업로드
              </button>
            </div>
          </div>
          
          {formData.inputType === 'text' ? (
            <div>
              <label htmlFor="inputText" className="block text-sm font-medium text-gray-700 mb-1">
                텍스트 입력
              </label>
              <textarea
                id="inputText"
                name="inputText"
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="PPT로 변환할 내용을 입력해주세요..."
                value={formData.inputText}
                onChange={handleFormChange}
              />
            </div>
          ) : (
            <div
              className={`border-2 border-dashed ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'} rounded-lg p-6 text-center cursor-pointer hover:border-primary h-[146px] flex items-center justify-center`}
              onClick={() => document.getElementById('fileInput')?.click()}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                id="fileInput"
                type="file"
                accept=".txt,.docx,.pdf,.doc,.hwp"
                className="hidden"
                onChange={handleFileSelect}
              />
              {file ? (
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">({Math.round(file.size / 1024)} KB)</p>
                </div>
              ) : uploadedFileInfo ? (
                <div>
                  <p className="font-medium">{uploadedFileInfo.fileName}</p>
                  <p className="text-sm text-gray-500 text-green-600">업로드 완료</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">{isDragActive ? '여기에 파일을 놓으세요' : '파일을 끌어다 놓거나 클릭하여 업로드하세요'}</p>
                  <p className="text-sm text-gray-500 mt-1">텍스트(.txt), 워드(.docx), PDF(.pdf), 한글(.doc), 한글 파일(.hwp) 파일 지원</p>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
                발표 목적
              </label>
              <select
                id="purpose"
                name="purpose"
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                value={formData.purpose}
                onChange={handleFormChange}
              >
                <option value="보고">보고</option>
                <option value="발표">발표</option>
                <option value="소개">소개</option>
                <option value="제안">제안</option>
                <option value="교육">교육</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-1">
                대상 청중
              </label>
              <select
                id="audience"
                name="audience"
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                value={formData.audience}
                onChange={handleFormChange}
              >
                <option value="내부 팀">내부 팀</option>
                <option value="임원">임원</option>
                <option value="고객">고객</option>
                <option value="일반 대중">일반 대중</option>
                <option value="학생">학생</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="slidesCount" className="block text-sm font-medium text-gray-700 mb-1">
                슬라이드 수
              </label>
              <input
                type="number"
                id="slidesCount"
                name="slidesCount"
                min="3"
                max="20"
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                value={formData.slidesCount}
                onChange={handleFormChange}
              />
            </div>
            
            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
                톤/스타일
              </label>
              <select
                id="tone"
                name="tone"
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                value={formData.tone}
                onChange={handleFormChange}
              >
                <option value="formal">격식체</option>
                <option value="casual">친근한</option>
                <option value="professional">전문적</option>
              </select>
            </div>
            
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeScript"
                  name="includeScript"
                  checked={formData.includeScript}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setFormData(prev => ({ ...prev, includeScript: checked }))
                    setIncludeScript(checked)
                  }}
                  className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                />
                <label htmlFor="includeScript" className="text-sm font-medium text-gray-700">
                  발표 스크립트 생성 포함
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                각 슬라이드별 발표용 스크립트를 함께 생성합니다
              </p>
            </div>
          </div>
          
          {error && (
            <div className="text-red-600 text-sm p-2 bg-red-50 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              다시 작성하기
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 rounded-lg bg-primary text-white font-medium ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90'}`}
            >
              {loading ? '생성 중...' : '슬라이드 생성하기'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 