'use client'

import React, { useState, useEffect } from 'react'

interface PromptData {
  systemMessage: string
  filePromptTemplate: string
  textPromptTemplate: string
  updatedAt?: string
}

export default function AdminPage() {
  const [prompts, setPrompts] = useState<PromptData>({
    systemMessage: '',
    filePromptTemplate: '',
    textPromptTemplate: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'system' | 'file' | 'text'>('system')

  // 프롬프트 불러오기
  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/prompts')
      const result = await response.json()

      if (result.success) {
        setPrompts(result.data)
      } else {
        setMessage('프롬프트를 불러오는데 실패했습니다: ' + result.error)
      }
    } catch (error) {
      setMessage('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const savePrompts = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(prompts)
      })

      const result = await response.json()

      if (result.success) {
        setMessage('프롬프트가 성공적으로 저장되었습니다!')
        setPrompts(result.data)
      } else {
        setMessage('저장에 실패했습니다: ' + result.error)
      }
    } catch (error) {
      setMessage('네트워크 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const updatePrompt = (field: keyof PromptData, value: string) => {
    setPrompts(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getTabClass = (tab: string) => {
    return `px-4 py-2 rounded-lg transition ${
      activeTab === tab
        ? 'bg-blue-600 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>프롬프트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">프롬프트 관리</h1>
          <p className="text-gray-600 mt-2">
            슬라이드 생성에 사용되는 프롬프트를 확인하고 수정할 수 있습니다.
          </p>
        </div>

        {/* 메시지 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('성공') 
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message}
            <button 
              onClick={() => setMessage('')}
              className="ml-4 underline"
            >
              닫기
            </button>
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('system')}
              className={getTabClass('system')}
            >
              시스템 메시지
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={getTabClass('file')}
            >
              파일 프롬프트 템플릿
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={getTabClass('text')}
            >
              텍스트 프롬프트 템플릿
            </button>
          </div>
        </div>

        {/* 프롬프트 에디터 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            {activeTab === 'system' && (
              <div>
                <h3 className="text-xl font-semibold mb-4">시스템 메시지</h3>
                <p className="text-gray-600 mb-4">
                  AI에게 역할과 기본 동작 방식을 설명하는 시스템 메시지입니다.
                </p>
                <textarea
                  value={prompts.systemMessage}
                  onChange={(e) => updatePrompt('systemMessage', e.target.value)}
                  className="w-full h-40 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="시스템 메시지를 입력하세요..."
                />
              </div>
            )}

            {activeTab === 'file' && (
              <div>
                <h3 className="text-xl font-semibold mb-4">파일 프롬프트 템플릿</h3>
                <p className="text-gray-600 mb-4">
                  파일이 업로드된 경우 사용되는 프롬프트 템플릿입니다. 
                  {'{fileName}'}, {'{fileExt}'}, {'{extractedText}'} 등의 변수를 사용할 수 있습니다.
                </p>
                <textarea
                  value={prompts.filePromptTemplate}
                  onChange={(e) => updatePrompt('filePromptTemplate', e.target.value)}
                  className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="파일 프롬프트 템플릿을 입력하세요..."
                />
              </div>
            )}

            {activeTab === 'text' && (
              <div>
                <h3 className="text-xl font-semibold mb-4">텍스트 프롬프트 템플릿</h3>
                <p className="text-gray-600 mb-4">
                  텍스트 입력의 경우 사용되는 프롬프트 템플릿입니다. 
                  {'{inputText}'}, {'{purpose}'}, {'{audience}'} 등의 변수를 사용할 수 있습니다.
                </p>
                <textarea
                  value={prompts.textPromptTemplate}
                  onChange={(e) => updatePrompt('textPromptTemplate', e.target.value)}
                  className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="텍스트 프롬프트 템플릿을 입력하세요..."
                />
              </div>
            )}
          </div>

          {/* 하단 버튼 영역 */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {prompts.updatedAt && (
                <span>마지막 수정: {new Date(prompts.updatedAt).toLocaleString('ko-KR')}</span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={loadPrompts}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                disabled={loading}
              >
                새로고침
              </button>
              <button
                onClick={savePrompts}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">사용 가능한 변수:</h4>
          <div className="text-sm text-blue-800">
            <p><strong>파일 템플릿:</strong> {'{fileName}'}, {'{fileExt}'}, {'{extractedText}'}, {'{purpose}'}, {'{audience}'}, {'{slidesCount}'}, {'{language}'}, {'{tone}'}</p>
            <p><strong>텍스트 템플릿:</strong> {'{inputText}'}, {'{purpose}'}, {'{audience}'}, {'{slidesCount}'}, {'{language}'}, {'{tone}'}</p>
          </div>
        </div>

        {/* 뒤로가기 링크 */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition"
          >
            ← 슬라이드 생성 페이지로 돌아가기
          </a>
        </div>
      </div>
    </div>
  )
} 