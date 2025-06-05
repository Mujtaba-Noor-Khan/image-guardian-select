
import { ImageData, ProcessingState, SightengineResponse } from '@/types/image-types';

const API_USER = '10034372';
const API_SECRET = 'KuAaagxXHcJZWaQyAimxHWf4Mx5PmLq7';
const QUALITY_THRESHOLD = 0.8;
const BLUR_THRESHOLD = 0.5; // Images with blur score > 0.5 are considered blurry

export const processImagesWithSightengine = async (
  files: File[],
  onProgressUpdate: (state: ProcessingState) => void
): Promise<ImageData[]> => {
  const results: ImageData[] = [];
  const totalImages = files.length;

  onProgressUpdate({
    isProcessing: true,
    currentImage: 0,
    totalImages,
    processedImages: 0,
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    onProgressUpdate({
      isProcessing: true,
      currentImage: i + 1,
      totalImages,
      processedImages: i,
    });

    try {
      const imageData: ImageData = {
        id: `img-${Date.now()}-${i}`,
        name: file.name,
        originalFile: file,
        dataUrl: await fileToDataUrl(file),
      };

      // Call Sightengine API for both quality and blur detection
      const assessmentResult = await assessImageQualityAndBlur(file);
      imageData.qualityScore = assessmentResult.qualityScore;
      imageData.isBlurry = assessmentResult.isBlurry;
      
      // Image is high quality only if score >= 0.8 AND not blurry
      imageData.isHighQuality = assessmentResult.qualityScore >= QUALITY_THRESHOLD && !assessmentResult.isBlurry;

      results.push(imageData);
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      
      const imageData: ImageData = {
        id: `img-${Date.now()}-${i}`,
        name: file.name,
        originalFile: file,
        dataUrl: await fileToDataUrl(file),
        error: 'Failed to assess quality',
        isHighQuality: false,
      };
      
      results.push(imageData);
    }

    // Small delay to prevent API rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  onProgressUpdate({
    isProcessing: false,
    currentImage: totalImages,
    totalImages,
    processedImages: totalImages,
  });

  return results;
};

const assessImageQualityAndBlur = async (file: File): Promise<{
  qualityScore: number;
  isBlurry: boolean;
}> => {
  const formData = new FormData();
  formData.append('media', file);
  formData.append('models', 'quality,blur');
  formData.append('api_user', API_USER);
  formData.append('api_secret', API_SECRET);

  const response = await fetch('https://api.sightengine.com/1.0/check.json', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Sightengine API error: ${response.status}`);
  }

  const data: SightengineResponse = await response.json();
  
  if (data.status !== 'success') {
    throw new Error('Sightengine API returned error status');
  }

  const qualityScore = data.quality?.score ?? 0;
  const blurScore = data.blur?.score ?? 0;
  const isBlurry = blurScore > BLUR_THRESHOLD;

  return {
    qualityScore,
    isBlurry
  };
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
