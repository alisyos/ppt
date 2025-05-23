import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const PROMPTS_FILE = join(process.cwd(), 'config', 'prompts.json')

// 프롬프트 조회 (GET)
export async function GET() {
  try {
    if (!existsSync(PROMPTS_FILE)) {
      return NextResponse.json(
        { success: false, error: '프롬프트 설정 파일을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const promptsData = await readFile(PROMPTS_FILE, 'utf-8')
    const prompts = JSON.parse(promptsData)

    return NextResponse.json({
      success: true,
      data: prompts
    })
  } catch (error: any) {
    console.error('프롬프트 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '프롬프트를 불러올 수 없습니다: ' + error.message },
      { status: 500 }
    )
  }
}

// 프롬프트 수정 (PUT)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { systemMessage, filePromptTemplate, textPromptTemplate } = body

    // 유효성 검사
    if (!systemMessage || !filePromptTemplate || !textPromptTemplate) {
      return NextResponse.json(
        { success: false, error: '모든 프롬프트 필드가 필요합니다' },
        { status: 400 }
      )
    }

    const updatedPrompts = {
      systemMessage,
      filePromptTemplate,
      textPromptTemplate,
      updatedAt: new Date().toISOString()
    }

    await writeFile(PROMPTS_FILE, JSON.stringify(updatedPrompts, null, 2), 'utf-8')

    return NextResponse.json({
      success: true,
      message: '프롬프트가 성공적으로 업데이트되었습니다',
      data: updatedPrompts
    })
  } catch (error: any) {
    console.error('프롬프트 저장 오류:', error)
    return NextResponse.json(
      { success: false, error: '프롬프트를 저장할 수 없습니다: ' + error.message },
      { status: 500 }
    )
  }
} 