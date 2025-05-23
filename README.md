# GPT 슬라이드 생성기

OpenAI GPT-4.1을 활용한 자동 PPT 슬라이드 생성 시스템입니다. 텍스트나 파일을 업로드하면 전문적인 프레젠테이션 슬라이드를 자동으로 생성합니다.

## 🚀 주요 기능

### 📝 다양한 입력 방식 지원
- **텍스트 입력**: 직접 텍스트를 입력하여 슬라이드 생성
- **파일 업로드**: TXT, DOCX, PDF 파일 지원
- **드래그 앤 드롭**: 직관적인 파일 업로드 인터페이스

### 🎯 맞춤형 슬라이드 생성
- **발표 목적별 최적화**: 회의, 교육, 마케팅 등
- **대상 청중 고려**: 일반인, 전문가, 학생 등
- **다양한 톤/스타일**: 격식체, 친근한 톤, 전문적
- **언어 선택**: 한국어/영어 지원

### 💼 관리자 프롬프트 시스템
- **실시간 프롬프트 편집**: 웹 인터페이스를 통한 손쉬운 수정
- **템플릿 변수 지원**: 동적 콘텐츠 생성
- **시스템 메시지 관리**: AI 동작 방식 세밀 조정
- **버전 관리**: 수정 내역 추적

### 📊 슬라이드 미리보기 & 내보내기
- **실시간 미리보기**: 생성된 슬라이드 즉시 확인
- **네비게이션**: 슬라이드 간 이동
- **PPTX 내보내기**: PowerPoint 호환 파일 생성
- **텍스트 복사**: 클립보드로 즉시 복사

### 🎨 스마트 포매팅
- **섹션 제목 자동 감지**: 콜론으로 끝나는 제목 구분
- **계층적 구조**: 자동 들여쓰기 및 불릿 포인트
- **시각적 구조화**: 화살표, 콜론 등 활용

## 🛠️ 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI GPT-4.1
- **파일 처리**: 
  - `mammoth` (DOCX 파일)
  - `pdf-parse` (PDF 파일)
- **내보내기**: `pptxgenjs` (PowerPoint 생성)

## 📦 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/alisyos/ppt.git
cd ppt
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 OpenAI API 키를 설정하세요:
```
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000`에 접속하세요.

## 📁 프로젝트 구조

```
├── app/
│   ├── api/
│   │   ├── admin/prompts/     # 프롬프트 관리 API
│   │   ├── generate-slides/   # 슬라이드 생성 API
│   │   └── upload/           # 파일 업로드 API
│   ├── admin/                # 관리자 페이지
│   └── page.tsx              # 메인 페이지
├── components/
│   ├── InputForm.tsx         # 입력 폼 컴포넌트
│   └── SlidePreview.tsx      # 슬라이드 미리보기
├── config/
│   └── prompts.json          # 프롬프트 설정 파일
├── types/
│   └── slides.ts             # TypeScript 타입 정의
└── uploads/                  # 업로드 파일 저장소
```

## 🔧 사용법

### 1. 기본 슬라이드 생성
1. 메인 페이지에서 텍스트를 입력하거나 파일을 업로드
2. 발표 목적, 대상 청중, 슬라이드 수 등을 설정
3. "슬라이드 생성하기" 버튼 클릭
4. 생성된 슬라이드 미리보기 및 내보내기

### 2. 프롬프트 관리 (관리자)
1. 우측 상단의 "⚙️ 프롬프트 관리" 클릭
2. 시스템 메시지, 파일 프롬프트, 텍스트 프롬프트 편집
3. 변수 활용: `{fileName}`, `{purpose}`, `{audience}` 등
4. 저장하여 즉시 적용

## 🎯 프롬프트 변수

### 파일 프롬프트 템플릿
- `{fileName}`: 업로드된 파일명
- `{fileExt}`: 파일 확장자
- `{extractedText}`: 추출된 텍스트 내용
- `{purpose}`: 발표 목적
- `{audience}`: 대상 청중
- `{slidesCount}`: 슬라이드 수
- `{language}`: 언어 설정
- `{tone}`: 톤/스타일

### 텍스트 프롬프트 템플릿
- `{inputText}`: 입력된 텍스트
- `{purpose}`: 발표 목적
- `{audience}`: 대상 청중
- `{slidesCount}`: 슬라이드 수
- `{language}`: 언어 설정
- `{tone}`: 톤/스타일

## 🔒 보안

- 업로드된 파일은 서버에 임시 저장되며 처리 후 삭제 권장
- OpenAI API 키는 환경 변수로 안전하게 관리
- 관리자 페이지는 별도 인증 시스템 추가 가능

## 📈 향후 개선 계획

- [ ] 사용자 인증 시스템
- [ ] 슬라이드 템플릿 다양화
- [ ] 이미지/차트 자동 생성
- [ ] 다국어 지원 확장
- [ ] 클라우드 저장소 연동
- [ ] 협업 기능

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트 관련 문의나 버그 리포트는 [GitHub Issues](https://github.com/alisyos/ppt/issues)를 이용해 주세요.

---

**Made with ❤️ using OpenAI GPT-4.1 and Next.js** 