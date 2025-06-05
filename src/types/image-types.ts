
export interface ImageData {
  id: string;
  name: string;
  originalFile: File;
  dataUrl: string;
  qualityScore?: number;
  isHighQuality?: boolean;
  error?: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  currentImage: number;
  totalImages: number;
  processedImages: number;
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
