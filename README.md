# GPT 기반 PPT 슬라이드 구성 지원 시스템

GPT 기반 자연어 처리 기술을 활용하여, 사용자가 입력한 문장 또는 줄글 형태의 텍스트를 자동으로 PPT용 슬라이드 구성으로 변환하는 시스템입니다.

## 주요 기능

- 텍스트 직접 입력 또는 파일 업로드(.txt, .docx, .pdf)
- 발표 목적, 대상 청중, 슬라이드 수 등 사전 설정 가능
- GPT를 통한 텍스트 분석 및 슬라이드 형식으로 변환
- PDF, PPTX 형식으로 결과물 다운로드

## 시작하기

1. 환경 설정
```bash
# .env.local 파일 생성 및 OpenAI API 키 설정
OPENAI_API_KEY=your_openai_api_key_here
```

2. 의존성 설치
```bash
npm install
# 또는
yarn install
```

3. 개발 서버 실행
```bash
npm run dev
# 또는
yarn dev
```

4. 브라우저에서 http://localhost:3000 접속

## 기술 스택

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- OpenAI API
- 파일 처리: mammoth(docx), pdf-parse(pdf)
- 출력 형식: jsPDF(PDF), pptxgenjs(PPTX) 