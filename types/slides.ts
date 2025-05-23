export interface SlideItem {
  id: string;
  title: string;
  content: string[];
  type: 'title' | 'points' | 'comparison' | 'timeline' | 'conclusion';
}

export interface SlideData {
  title: string;
  purpose: string;
  audience: string;
  slides: SlideItem[];
}

export interface InputFormData {
  inputText: string;
  purpose: string;
  audience: string;
  slidesCount: number;
  language: 'ko' | 'en';
  tone: 'formal' | 'casual' | 'professional';
  inputType: 'text' | 'file';
}

export interface ApiResponse {
  success: boolean;
  data?: SlideData;
  error?: string;
} 