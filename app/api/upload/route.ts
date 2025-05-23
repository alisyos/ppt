import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

// 임시 파일 저장소
const UPLOAD_DIR = join(process.cwd(), 'uploads')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다' },
        { status: 400 }
      )
    }
    
    const fileName = file.name.toLowerCase()
    
    // 지원하는 파일 확장자 확인
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.docx') && !fileName.endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: '지원하지 않는 파일 형식입니다. txt, docx, pdf 파일만 지원합니다.' },
        { status: 400 }
      )
    }
    
    // 파일 임시 저장
    try {
      // 업로드 디렉토리 생성 (없는 경우)
      await mkdir(UPLOAD_DIR, { recursive: true })
      
      // 고유 ID 생성
      const fileId = randomUUID()
      const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
      const savedFileName = `${fileId}${fileExtension}`
      const filePath = join(UPLOAD_DIR, savedFileName)
      
      // 파일 저장
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)
      
      return NextResponse.json({
        success: true,
        fileId,
        fileName: file.name,
        savedFileName,
        filePath
      })
    } catch (err) {
      console.error('파일 저장 오류:', err)
      return NextResponse.json(
        { success: false, error: '파일을 저장할 수 없습니다.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { success: false, error: '파일 처리 중 오류가 발생했습니다: ' + (error.message || '') },
      { status: 500 }
    )
  }
} 