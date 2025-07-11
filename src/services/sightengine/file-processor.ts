import { ImageData, ProcessingState } from '@/types/image-types';
import { makeSightengineRequestFromFile, createFormData } from './api-client';
import { fileToDataUrl } from './utils';
import { updateUsageStats, addUsageEntry } from '@/services/usage-tracker';

const QUALITY_THRESHOLD = 0.82;

export const processImagesWithSightengine = async (
  files: File[],
  onProgressUpdate: (state: ProcessingState) => void
): Promise<ImageData[]> => {
  const results: ImageData[] = [];
  const totalImages = files.length;
  let successfulApiCalls = 0;

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

      console.log(`Processing image: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
      
      const qualityScore = await assessImageQuality(file);
      imageData.qualityScore = qualityScore;
      imageData.isHighQuality = qualityScore >= QUALITY_THRESHOLD;
      successfulApiCalls++;

      console.log(`Image ${file.name} - Quality: ${qualityScore}, High Quality: ${imageData.isHighQuality}, Threshold: ${QUALITY_THRESHOLD}`);
      
      results.push(imageData);
    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      
      const imageData: ImageData = {
        id: `img-${Date.now()}-${i}`,
        name: file.name,
        originalFile: file,
        dataUrl: await fileToDataUrl(file),
        error: error instanceof Error ? error.message : 'Failed to assess quality',
        isHighQuality: false,
      };
      
      results.push(imageData);
    }

    // Small delay to prevent overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Update usage tracking
  updateUsageStats(successfulApiCalls, results.length);
  addUsageEntry(successfulApiCalls, results.length, 'file');

  onProgressUpdate({
    isProcessing: false,
    currentImage: totalImages,
    totalImages,
    processedImages: totalImages,
  });

  return results;
};

const assessImageQuality = async (file: File): Promise<number> => {
  console.log(`Starting API call for ${file.name}`);
  console.log(`File details - Name: ${file.name}, Size: ${file.size}, Type: ${file.type}, Last Modified: ${new Date(file.lastModified)}`);
  
  const maxSizeInMB = 10;
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    throw new Error(`File too large. Maximum size is ${maxSizeInMB}MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Supported types: ${supportedTypes.join(', ')}`);
  }

  const formData = createFormData(file);
  const data = await makeSightengineRequestFromFile(formData);

  const qualityScore = data.quality!.score;
  console.log(`Successfully extracted quality score for ${file.name}: ${qualityScore}`);
  
  return qualityScore;
};
