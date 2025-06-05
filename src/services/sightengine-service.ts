
import { ImageData, ProcessingState, SightengineResponse } from '@/types/image-types';

const API_USER = '10034372';
const API_SECRET = 'KuAaagxXHcJZWaQyAimxHWf4Mx5PmLq7';
const QUALITY_THRESHOLD = 0.8;

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

      console.log(`Processing image: ${file.name}`);
      
      const qualityScore = await assessImageQuality(file);
      imageData.qualityScore = qualityScore;
      imageData.isHighQuality = qualityScore >= QUALITY_THRESHOLD;

      console.log(`Image ${file.name} - Quality: ${qualityScore}, High Quality: ${imageData.isHighQuality}`);
      
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

const assessImageQuality = async (file: File): Promise<number> => {
  console.log(`Making API call for ${file.name}`);
  
  const formData = new FormData();
  formData.append('media', file);
  formData.append('models', 'quality');
  formData.append('api_user', API_USER);
  formData.append('api_secret', API_SECRET);

  console.log('FormData contents:', {
    media: file.name,
    models: 'quality',
    api_user: API_USER
  });

  const response = await fetch('https://api.sightengine.com/1.0/check.json', {
    method: 'POST',
    body: formData,
  });

  console.log(`API response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Sightengine API error: ${response.status} - ${errorText}`);
    throw new Error(`Sightengine API error: ${response.status}`);
  }

  const data: SightengineResponse = await response.json();
  console.log('API response data:', data);
  
  if (data.status !== 'success') {
    console.error('Sightengine API returned error status:', data);
    throw new Error('Sightengine API returned error status');
  }

  const qualityScore = data.quality?.score ?? 0;
  console.log(`Quality score for ${file.name}: ${qualityScore}`);
  
  return qualityScore;
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
