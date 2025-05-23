import { NextRequest, NextResponse } from 'next/server'
import { SlideData, InputFormData } from '../../../types/slides'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { ChatCompletionMessageParam } from 'openai/resources'
import { createReadStream } from 'fs'

// 업로드 디렉토리 경로
const UPLOAD_DIR = join(process.cwd(), 'uploads')
const PROMPTS_FILE = join(process.cwd(), 'config', 'prompts.json')

// 테스트용 더미 데이터를 사용 (OpenAI API 키가 없는 경우를 위함)
const useDummyData = false

// API 요청 시간 제한 (30초)
const API_TIMEOUT = 30000

// 프롬프트 불러오기 함수
async function loadPrompts() {
  try {
    if (existsSync(PROMPTS_FILE)) {
      const promptsData = await readFile(PROMPTS_FILE, 'utf-8')
      return JSON.parse(promptsData)
    }
  } catch (error) {
    console.error('프롬프트 파일 로드 오류:', error)
  }
  
  // 기본 프롬프트 (파일이 없거나 오류가 있는 경우)
  return {
    systemMessage: "당신은 전문적인 프레젠테이션 컨설턴트입니다. 텍스트나 문서를 분석하여 체계적이고 상세한 PPT 슬라이드를 생성하는 전문가입니다. 단순한 키워드 나열이 아닌, 구조화된 정보와 구체적인 설명을 포함한 고품질 슬라이드를 제작합니다. 항상 JSON 형식으로만 응답하세요.",
    filePromptTemplate: "파일 내용을 분석하여 슬라이드를 생성해주세요.",
    textPromptTemplate: "텍스트를 분석하여 슬라이드를 생성해주세요."
  }
}

// 템플릿 변수 교체 함수
function replaceTemplateVariables(template: string, variables: Record<string, string>) {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`
    result = result.replaceAll(placeholder, value)
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as InputFormData & { filePath?: string, fileName?: string }
    
    console.log('요청 받음:', {
      inputType: body.inputType,
      filePath: body.filePath,
      fileName: body.fileName,
      purpose: body.purpose,
      audience: body.audience,
      slidesCount: body.slidesCount
    })
    
    // 텍스트 입력이나 파일 경로 중 하나는 필요
    if ((!body.inputText || body.inputText.trim() === '') && !body.filePath) {
      return NextResponse.json(
        { success: false, error: '입력 텍스트나 파일이 필요합니다' },
        { status: 400 }
      )
    }

    // 테스트용 더미 데이터를 사용하는 경우 (API 키가 없는 경우)
    if (useDummyData) {
      const dummySlideData = generateDummySlideData(body)
      
      // 약간의 지연 추가 (실제 API 호출처럼 보이게)
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      return NextResponse.json({
        success: true,
        data: dummySlideData
      })
    }
    
    // OpenAI API를 사용하는 경우 (API 키가 있는 경우)
    try {
      // 동적으로 OpenAI 라이브러리 로드 (서버 컴포넌트에서도 문제 없도록)
      const { OpenAI } = await import('openai')
      
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'your-api-key',
      })

      const { inputText, purpose, audience, slidesCount, tone, language, filePath, fileName } = body
      
      // 파일이 있는 경우 - 파일 내용 직접 추출 및 텍스트 변환
      if (filePath && existsSync(filePath)) {
        try {
          console.log('파일 처리 시작 (텍스트 추출):', { filePath, fileName })
          
          // 파일 확장자 확인
          const fileExt = fileName?.split('.').pop()?.toLowerCase() || 'txt'
          
          let extractedText = ''
          
          console.log('파일 텍스트 추출 중...', { fileExtension: fileExt })
          
          if (fileExt === 'txt') {
            // 텍스트 파일인 경우 직접 읽기
            extractedText = await readFile(filePath, 'utf-8')
            console.log('텍스트 파일 추출 완료:', { textLength: extractedText.length })
          } else if (fileExt === 'docx') {
            // DOCX 파일 처리
            try {
              const mammoth = await import('mammoth')
              const result = await mammoth.extractRawText({ path: filePath })
              extractedText = result.value
              console.log('DOCX 파일 추출 완료:', { textLength: extractedText.length })
            } catch (docxError) {
              console.error('DOCX 처리 오류:', docxError)
              extractedText = `DOCX 파일을 읽을 수 없습니다: ${fileName}`
            }
          } else if (fileExt === 'pdf') {
            // PDF 파일 처리
            try {
              const pdfParse = await import('pdf-parse')
              const dataBuffer = await readFile(filePath)
              const pdfData = await pdfParse.default(dataBuffer)
              extractedText = pdfData.text
              console.log('PDF 파일 추출 완료:', { textLength: extractedText.length })
            } catch (pdfError) {
              console.error('PDF 처리 오류:', pdfError)
              extractedText = `PDF 파일을 읽을 수 없습니다: ${fileName}`
            }
          } else {
            // 기타 파일은 바이너리로 읽고 일부 정보만 포함
            const fileData = await readFile(filePath)
            extractedText = `파일명: ${fileName}\n파일 크기: ${Math.round(fileData.length / 1024)}KB\n파일 형식: ${fileExt.toUpperCase()}\n\n이 파일의 내용을 기반으로 슬라이드를 생성해주세요.`
            console.log('기타 파일 정보 생성 완료')
          }
          
          // 추출된 텍스트가 너무 긴 경우 일부만 사용 (토큰 제한 고려)
          const maxTextLength = 10000 // 약 40,000 토큰 제한을 고려하여 텍스트 길이 제한
          if (extractedText.length > maxTextLength) {
            extractedText = extractedText.substring(0, maxTextLength) + '\n\n... (텍스트가 길어서 일부만 포함됨)'
            console.log('텍스트 길이 제한 적용:', { originalLength: extractedText.length, truncatedLength: maxTextLength })
          }
          
          // 시스템 메시지
          const prompts = await loadPrompts()
          const systemMessage: ChatCompletionMessageParam = { 
            role: "system", 
            content: prompts.systemMessage
          }
          
          // GPT 요청을 위한 프롬프트 구성 (파일 내용 포함)
          const filePrompt = replaceTemplateVariables(prompts.filePromptTemplate, {
            fileName: fileName || 'unknown',
            fileExt: fileExt.toUpperCase(),
            extractedText,
            purpose,
            audience,
            slidesCount: slidesCount.toString(),
            language: language === 'ko' ? '한국어' : '영어',
            tone: tone === 'formal' ? '격식체' : tone === 'casual' ? '친근한' : '전문적'
          })
          
          console.log('OpenAI API 요청 준비 (파일 텍스트 포함):', { 
            model: 'gpt-4.1',
            promptLength: filePrompt.length,
            extractedTextLength: extractedText.length
          })
          
          // OpenAI API 호출 (Chat Completions API 사용)
          const completion = await openai.chat.completions.create({
            model: "gpt-4.1",
            messages: [systemMessage, { role: "user", content: filePrompt }],
            temperature: 0.7,
            max_tokens: 2500,
            response_format: { type: "json_object" }
          })
          
          const responseText = completion.choices[0].message.content
          
          console.log('OpenAI API 응답 받음 (파일 기반):', {
            responseLength: responseText?.length || 0,
            responsePreview: responseText?.substring(0, 100) + '...' || '없음'
          })
          
          if (!responseText) {
            return NextResponse.json(
              { success: false, error: '슬라이드 생성에 실패했습니다' },
              { status: 500 }
            )
          }
          
          // JSON 파싱
          const slideData = JSON.parse(responseText) as SlideData
          console.log('슬라이드 생성 완료 (파일 기반):', {
            title: slideData.title,
            slideCount: slideData.slides.length
          })
          
          return NextResponse.json({
            success: true,
            data: slideData
          })
          
        } catch (fileError: any) {
          console.error('파일 처리 오류:', fileError)
          return NextResponse.json(
            { success: false, error: '파일을 처리할 수 없습니다: ' + (fileError.message || '알 수 없는 오류') },
            { status: 500 }
          )
        }
      }
      
      // 텍스트 입력만 있는 경우 - Chat Completions API 사용
      console.log('텍스트 입력 처리:', { textLength: inputText?.length || 0 })
      
      // 시스템 메시지
      const prompts = await loadPrompts()
      const systemMessage: ChatCompletionMessageParam = { 
        role: "system", 
        content: prompts.systemMessage
      }
      
      // GPT 요청을 위한 프롬프트 구성
      const textPrompt = replaceTemplateVariables(prompts.textPromptTemplate, {
        inputText,
        purpose,
        audience,
        slidesCount: slidesCount.toString(),
        language: language === 'ko' ? '한국어' : '영어',
        tone: tone === 'formal' ? '격식체' : tone === 'casual' ? '친근한' : '전문적'
      })
      
      console.log('OpenAI API 요청 준비 (텍스트):', { 
        model: 'gpt-4.1',
        promptLength: textPrompt.length,
        promptPreview: textPrompt.substring(0, 200) + '...'
      })
      
      // 텍스트 입력용 메시지
      const userMessage: ChatCompletionMessageParam = { 
        role: "user", 
        content: textPrompt 
      }
      
      // OpenAI API 호출 (텍스트 입력 사용)
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1", // GPT 모델 지정 (최신 모델 사용)
        messages: [systemMessage, userMessage],
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: "json_object" }
      })
      
      const responseText = completion.choices[0].message.content
      
      console.log('OpenAI API 응답 받음 (텍스트):', {
        responseLength: responseText?.length || 0,
        responsePreview: responseText?.substring(0, 100) + '...' || '없음'
      })
      
      if (!responseText) {
        return NextResponse.json(
          { success: false, error: '슬라이드 생성에 실패했습니다' },
          { status: 500 }
        )
      }
      
      // JSON 파싱
      const slideData = JSON.parse(responseText) as SlideData
      console.log('슬라이드 생성 완료 (텍스트):', {
        title: slideData.title,
        slideCount: slideData.slides.length
      })
      
      return NextResponse.json({
        success: true,
        data: slideData
      })
    } catch (error: any) {
      console.error('OpenAI API 호출 오류:', error)
      
      // API 키가 없거나 잘못된 경우 더미 데이터로 대체
      if (error.message && (error.message.includes('API key') || error.message.includes('apiKey'))) {
        console.log('API 키 오류로 더미 데이터 사용')
        const dummySlideData = generateDummySlideData(body)
        
        return NextResponse.json({
          success: true,
          data: dummySlideData
        })
      }
      
      return NextResponse.json(
        { success: false, error: '슬라이드 생성 중 오류가 발생했습니다: ' + error.message },
        { status: 500 }
      )
    }
    
  } catch (error: any) {
    console.error('Generate slides error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다: ' + (error.message || '') },
      { status: 500 }
    )
  }
}

// 테스트용 더미 데이터 생성 함수
function generateDummySlideData(body: InputFormData & { filePath?: string, fileName?: string }): SlideData {
  const input = body.inputText || body.fileName || '입력 내용';
  
  return {
    title: `${body.purpose}: ${input.substring(0, 20)}...`,
    purpose: body.purpose,
    audience: body.audience,
    slides: [
      {
        id: 'slide-1',
        title: '소개',
        content: [
          '이 발표는 사용자가 입력한 내용을 바탕으로 생성되었습니다',
          `발표 목적: ${body.purpose}`,
          `대상 청중: ${body.audience}`,
          `총 슬라이드 수: ${body.slidesCount}개`
        ],
        type: 'title'
      },
      {
        id: 'slide-2',
        title: '주요 내용',
        content: [
          '입력하신 텍스트가 여러 슬라이드로 자동 변환됩니다',
          '각 슬라이드는 목적에 맞게 최적화됩니다',
          '스타일과 톤은 설정에 따라 자동 조정됩니다'
        ],
        type: 'points'
      },
      {
        id: 'slide-3',
        title: body.fileName ? '파일 입력' : '텍스트 미리보기',
        content: body.fileName 
          ? [
              `파일명: ${body.fileName}`,
              '파일 내용이 분석되어 슬라이드로 변환됩니다',
              '더 많은 내용이 포함된 파일일수록 상세한 슬라이드가 생성됩니다'
            ]
          : [
              body.inputText?.substring(0, 50) + '...',
              '더 많은 텍스트가 입력되면 더 상세한 슬라이드가 생성됩니다',
              '실제 환경에서는 OpenAI API를 통해 생성됩니다'
            ],
        type: 'points'
      },
      {
        id: 'slide-4',
        title: '결론',
        content: [
          '현재 테스트 모드로 실행 중입니다',
          '실제 서비스에서는 더 상세하고 맞춤화된 슬라이드가 생성됩니다',
          '감사합니다'
        ],
        type: 'conclusion'
      }
    ]
  }
} 