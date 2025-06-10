
export interface ImageData {
  id: string;
  name: string;
  originalFile?: File;
  dataUrl?: string;
  url?: string;
  qualityScore?: number;
  isHighQuality?: boolean;
  error?: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  currentImage: number;
  totalImages: number;
  processedImages: number;
  phase?: 'parsing' | 'processing';
}

export interface SightengineResponse {
  status: string;
  request: {
    id: string;
    timestamp: number;
    operations: number;
  };
  quality?: {
    score: number;
  };
  media?: {
    id: string;
    uri: string;
  };
}

export interface ParsedExcelData {
  urls: string[];
  invalidUrls: string[];
  totalUrls: number;
}
