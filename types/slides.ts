export interface Slide {
  id: string;
  mainCopy: string;
  subCopy: string;
  body: {
    point: string;
    sub: string[];
  }[];
  visualSuggestion: string[];
  script?: string;
  type: 'title' | 'points' | 'comparison' | 'timeline' | 'conclusion';
}

export interface SlideData {
  title: string;
  purpose: string;
  audience: string;
  slides: Slide[];
}

export interface InputFormData {
  inputText: string;
  purpose: string;
  audience: string;
  slidesCount: number;
  language: 'ko' | 'en';
  tone: 'formal' | 'casual' | 'professional';
  inputType: 'text' | 'file';
  includeScript: boolean;
}

export interface ApiResponse {
  success: boolean;
  data?: SlideData;
  error?: string;
} 