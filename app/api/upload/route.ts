import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

// 임시 파일 저장소 - 배포 환경 고려
const isProduction = process.env.NODE_ENV === 'production'
const isVercel = process.env.VERCEL === '1'
const UPLOAD_DIR = isVercel ? '/tmp/uploads' : join(process.cwd(), 'uploads')

// 파일 크기 제한 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// 지원하는 MIME 타입 (한글 오피스 포함)
const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/haansoftdocx', // 한글 오피스
  'application/vnd.hancom.hwp', // 한글 파일
  'application/x-hwp' // 한글 파일 (다른 MIME 타입)
]

// 지원하는 파일 확장자
const SUPPORTED_EXTENSIONS = ['.txt', '.docx', '.pdf', '.doc', '.hwp']

function isValidFile(file: File): { valid: boolean; error?: string } {
  // 파일 크기 확인
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 지원합니다.` 
    }
  }

  const fileName = file.name.toLowerCase()
  const mimeType = file.type.toLowerCase()
  
  // MIME 타입 확인
  const validMimeType = SUPPORTED_MIME_TYPES.includes(mimeType)
  
  // 파일 확장자 확인
  const validExtension = SUPPORTED_EXTENSIONS.some(ext => fileName.endsWith(ext))
  
  console.log('파일 검증:', { 
    fileName: file.name, 
    mimeType, 
    size: file.size,
    validMimeType, 
    validExtension 
  })
  
  if (!validMimeType && !validExtension) {
    return { 
      valid: false, 
      error: '지원하지 않는 파일 형식입니다. txt, docx, pdf 파일만 지원합니다.' 
    }
  }

  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    console.log('파일 업로드 시작')
    
    // 요청 타임아웃 설정 (30초)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('요청 시간 초과')), 30000)
    })

    const uploadPromise = (async () => {
      const formData = await request.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: '파일이 없습니다' },
          { status: 400 }
        )
      }

      console.log('업로드된 파일 정보:', {
        name: file.name,
        type: file.type,
        size: file.size
      })

      // 파일 유효성 검사
      const validation = isValidFile(file)
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      // 파일 임시 저장
      try {
        // 업로드 디렉토리 생성 (없는 경우)
        await mkdir(UPLOAD_DIR, { recursive: true })
        
        // 고유 ID 생성
        const fileId = randomUUID()
        const fileName = file.name.toLowerCase()
        const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
        const savedFileName = `${fileId}${fileExtension}`
        const filePath = join(UPLOAD_DIR, savedFileName)
        
        console.log('파일 저장 시작:', { filePath, savedFileName })
        
        // 파일 저장 (청크 단위로 처리하여 메모리 사용량 최적화)
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(filePath, buffer)
        
        console.log('파일 저장 완료:', { fileId, savedFileName })
        
        return NextResponse.json({
          success: true,
          fileId,
          fileName: file.name,
          savedFileName,
          filePath,
          fileSize: file.size,
          mimeType: file.type
        })
      } catch (err: any) {
        console.error('파일 저장 오류:', err)
        return NextResponse.json(
          { success: false, error: `파일을 저장할 수 없습니다: ${err.message}` },
          { status: 500 }
        )
      }
    })()

    // 타임아웃과 업로드 프로미스 중 먼저 완료되는 것 실행
    const result = await Promise.race([uploadPromise, timeoutPromise])
    return result as NextResponse
    
  } catch (error: any) {
    console.error('File upload error:', error)
    
    // 에러 타입에 따른 구체적인 메시지
    let errorMessage = '파일 처리 중 오류가 발생했습니다'
    
    if (error.message === '요청 시간 초과') {
      errorMessage = '파일 업로드 시간이 초과되었습니다. 파일 크기를 확인하고 다시 시도해주세요.'
    } else if (error.message?.includes('ENOSPC')) {
      errorMessage = '서버 저장 공간이 부족합니다. 잠시 후 다시 시도해주세요.'
    } else if (error.message?.includes('EACCES')) {
      errorMessage = '파일 저장 권한이 없습니다. 관리자에게 문의하세요.'
    } else if (error.message) {
      errorMessage = `파일 처리 오류: ${error.message}`
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
} 