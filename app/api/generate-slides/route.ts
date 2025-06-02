import { NextRequest, NextResponse } from 'next/server'
import { SlideData, InputFormData } from '../../../types/slides'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { ChatCompletionMessageParam } from 'openai/resources'
import { createReadStream } from 'fs'

// 업로드 디렉토리 경로 - 배포 환경 고려
const isVercel = process.env.VERCEL === '1'
const UPLOAD_DIR = isVercel ? '/tmp/uploads' : join(process.cwd(), 'uploads')
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
          } else if (fileExt === 'docx' || fileExt === 'doc') {
            // DOCX/DOC 파일 처리 (한글 오피스 포함)
            try {
              const mammoth = await import('mammoth')
              const result = await mammoth.extractRawText({ path: filePath })
              extractedText = result.value
              console.log('DOCX/DOC 파일 추출 완료:', { textLength: extractedText.length })
            } catch (docxError) {
              console.error('DOCX/DOC 처리 오류:', docxError)
              // 한글 오피스 파일인 경우 대체 메시지
              if (fileName?.includes('한글') || fileName?.includes('hangul')) {
                extractedText = `한글 오피스 문서 파일: ${fileName}\n\n이 파일의 내용을 기반으로 프레젠테이션 슬라이드를 생성해주세요. 한글 오피스 파일 형식으로 인해 텍스트를 직접 추출할 수 없어 파일명을 기반으로 합니다.`
              } else {
                extractedText = `DOCX/DOC 파일을 읽을 수 없습니다: ${fileName}`
              }
            }
          } else if (fileExt === 'hwp') {
            // 한글 파일 처리 (현재는 지원하지 않으므로 안내 메시지)
            extractedText = `한글 파일: ${fileName}\n\n한글 파일(.hwp) 형식은 현재 텍스트 추출을 지원하지 않습니다. 파일명을 기반으로 프레젠테이션 슬라이드를 생성해주세요.`
            console.log('한글 파일 안내 메시지 생성')
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
            try {
              const fileData = await readFile(filePath)
              extractedText = `파일명: ${fileName}\n파일 크기: ${Math.round(fileData.length / 1024)}KB\n파일 형식: ${fileExt.toUpperCase()}\n\n이 파일의 내용을 기반으로 슬라이드를 생성해주세요.`
              console.log('기타 파일 정보 생성 완료')
            } catch (readError) {
              console.error('파일 읽기 오류:', readError)
              extractedText = `파일명: ${fileName}\n파일 형식: ${fileExt.toUpperCase()}\n\n파일을 읽을 수 없어 파일명을 기반으로 슬라이드를 생성해주세요.`
            }
          }
          
          // 추출된 텍스트가 너무 긴 경우 일부만 사용 (토큰 제한 고려)
          const maxTextLength = 8000 // 배포 환경을 고려하여 조금 더 보수적으로 설정
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
            tone: tone === 'formal' ? '격식체' : tone === 'casual' ? '친근한' : '전문적',
            includeScript: body.includeScript ? '예' : '아니오',
            scriptInstruction: body.includeScript 
              ? '\n- script 필드는 각 슬라이드별 발표용 스크립트를 3-7문장으로 자연스럽게 작성 (청중과의 소통, 전환 문구 포함)'
              : ''
          })
          
          console.log('OpenAI API 요청 준비 (파일 텍스트 포함):', { 
            model: 'gpt-4.1',
            promptLength: filePrompt.length,
            extractedTextLength: extractedText.length
          })
          
          // OpenAI API 호출 (Chat Completions API 사용) - 모델명 수정
          const completion = await Promise.race([
            openai.chat.completions.create({
              model: "gpt-4.1",
              messages: [systemMessage, { role: "user", content: filePrompt }],
              temperature: 0.7,
              max_tokens: 2500,
              response_format: { type: "json_object" }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('OpenAI API 타임아웃')), 45000)
            )
          ]) as any
          
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
          try {
            const slideData = JSON.parse(responseText) as SlideData
            console.log('슬라이드 생성 완료 (파일 기반):', {
              title: slideData.title,
              slideCount: slideData.slides.length
            })
            
            return NextResponse.json({
              success: true,
              data: slideData
            })
          } catch (jsonError) {
            console.error('JSON 파싱 오류:', jsonError)
            return NextResponse.json(
              { success: false, error: 'AI 응답을 처리할 수 없습니다. 다시 시도해주세요.' },
              { status: 500 }
            )
          }
          
        } catch (fileError: any) {
          console.error('파일 처리 오류:', fileError)
          
          // 특정 오류에 대한 구체적인 메시지
          let errorMessage = '파일을 처리할 수 없습니다'
          
          if (fileError.message?.includes('타임아웃') || fileError.message?.includes('timeout')) {
            errorMessage = '파일 처리 시간이 초과되었습니다. 더 작은 파일로 시도해보세요.'
          } else if (fileError.message?.includes('ENOENT')) {
            errorMessage = '업로드된 파일을 찾을 수 없습니다. 파일을 다시 업로드해주세요.'
          } else if (fileError.message?.includes('insufficient_quota')) {
            errorMessage = 'AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.'
          } else if (fileError.message) {
            errorMessage = `파일 처리 오류: ${fileError.message}`
          }
          
          return NextResponse.json(
            { success: false, error: errorMessage },
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
        tone: tone === 'formal' ? '격식체' : tone === 'casual' ? '친근한' : '전문적',
        includeScript: body.includeScript ? '예' : '아니오',
        scriptInstruction: body.includeScript 
          ? '\n- script 필드는 각 슬라이드별 발표용 스크립트를 3-7문장으로 자연스럽게 작성 (청중과의 소통, 전환 문구 포함)'
          : ''
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
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4.1", // GPT 모델 지정 (최신 모델 사용)
          messages: [systemMessage, userMessage],
          temperature: 0.7,
          max_tokens: 2500,
          response_format: { type: "json_object" }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API 타임아웃')), 45000)
        )
      ]) as any
      
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
    title: `${body.purpose} 프레젠테이션`,
    purpose: `${body.purpose} → 효과적 전달`,
    audience: `${body.audience} 대상 맞춤 발표`,
    slides: [
      {
        id: 'slide-1',
        mainCopy: '프레젠테이션 개요',
        subCopy: '사용자 입력 기반 자동 생성 슬라이드',
        body: [
          '발표 목적: ' + body.purpose,
          '대상 청중: ' + body.audience,
          '총 슬라이드 수: ' + body.slidesCount + '개',
          '자동 생성 시스템 활용'
        ],
        visualSuggestion: ['아이콘(프레젠테이션 화면)', '표(행: 항목, 열: 내용)'],
        script: body.includeScript ? '안녕하세요. 오늘 발표를 시작하겠습니다. 이번 프레젠테이션은 여러분이 입력해주신 내용을 바탕으로 자동 생성된 슬라이드입니다. 함께 살펴보시죠.' : undefined,
        type: 'title'
      },
      {
        id: 'slide-2',
        mainCopy: '주요 내용 분석',
        subCopy: '입력 텍스트 → 구조화된 슬라이드 변환',
        body: [
          '텍스트 자동 분석 → 슬라이드 변환',
          '목적별 최적화 → 맞춤형 구성',
          '스타일 자동 조정 → 톤 반영',
          '시각적 제안 → 효과적 프레젠테이션'
        ],
        visualSuggestion: ['그래프(막대: X=단계, Y=효율성)', '이미지(AI 분석 과정을 보여주는 플로우차트와 데이터 변환 과정)'],
        script: body.includeScript ? '이제 주요 내용을 살펴보겠습니다. 우리 시스템은 입력된 텍스트를 분석하여 자동으로 슬라이드를 생성합니다. 각 슬라이드는 발표 목적과 청중에 맞게 최적화되어 제공됩니다.' : undefined,
        type: 'points'
      },
      {
        id: 'slide-3',
        mainCopy: body.fileName ? '파일 기반 분석' : '텍스트 내용 미리보기',
        subCopy: body.fileName 
          ? '업로드 파일 → 내용 분석 → 슬라이드 구성'
          : '입력 텍스트 → 핵심 요약 → 구조화',
        body: body.fileName 
          ? [
              '파일명: ' + body.fileName,
              '내용 분석 → 슬라이드 변환',
              '상세 파일 → 풍부한 슬라이드',
              '다양한 형식 지원: TXT, DOCX, PDF'
            ]
          : [
              '입력 내용: ' + (body.inputText?.substring(0, 30) + '...' || '텍스트'),
              '상세 텍스트 → 정교한 슬라이드',
              'OpenAI API → 고품질 생성',
              '구체적 내용 → 전문적 결과'
            ],
        visualSuggestion: body.fileName 
          ? ['아이콘(파일 업로드)', '표(행: 파일 정보, 열: 상세 내용)']
          : ['그래프(원형: 텍스트 분석 비율)', '이미지(텍스트 입력창과 분석 결과를 보여주는 인터페이스 화면)'],
        script: body.includeScript ? (body.fileName 
          ? '업로드해주신 파일을 분석한 결과입니다. 파일의 내용이 체계적으로 분석되어 의미있는 슬라이드로 구성되었습니다. 파일 기반 분석의 장점을 확인해보세요.'
          : '입력해주신 텍스트의 핵심 내용입니다. 더 상세한 내용을 입력하실수록 더욱 풍부하고 전문적인 슬라이드가 생성됩니다.') : undefined,
        type: 'points'
      },
      {
        id: 'slide-4',
        mainCopy: '결론 및 다음 단계',
        subCopy: '테스트 완료 → 실제 서비스 안내',
        body: [
          '현재 상태: 테스트 모드 실행',
          '실제 서비스: 맞춤화된 고품질 슬라이드',
          '기술 기반: OpenAI GPT-4.1 활용',
          '결과: 전문적 콘텐츠 제공'
        ],
        visualSuggestion: ['아이콘(체크 완료 표시)', '표(행: 서비스 특징, 열: 장점)'],
        script: body.includeScript ? '이상으로 테스트 프레젠테이션을 마치겠습니다. 실제 서비스에서는 더욱 정교하고 전문적인 슬라이드와 스크립트가 제공됩니다. 질문이 있으시면 언제든 말씀해주세요. 감사합니다.' : undefined,
        type: 'conclusion'
      }
    ]
  }
} 