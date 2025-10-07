import { ImageData, ProcessingState } from '@/types/image-types';
import { makeSightengineRequestFromFile, createFormData } from './api-client';
import { fileToDataUrl } from './utils';
import { updateUsageStats, addUsageEntry } from '@/services/usage-tracker';

const QUALITY_THRESHOLD = 0.82;
const CONCURRENT_REQUESTS = 10; // Process 10 files at once

export const processImagesWithSightengine = async (
  files: File[],
  onProgressUpdate: (state: ProcessingState) => void
): Promise<ImageData[]> => {
  const totalImages = files.length;
  const results: ImageData[] = [];
  let processedCount = 0;

  onProgressUpdate({
    isProcessing: true,
    currentImage: 0,
    totalImages,
    processedImages: 0,
  });

  // Process files in batches
  for (let i = 0; i < files.length; i += CONCURRENT_REQUESTS) {
    const batch = files.slice(i, i + CONCURRENT_REQUESTS);
    const batchStartIndex = i;

    console.log(`Processing batch starting at index ${i}, size: ${batch.length}`);

    // Process batch in parallel
    const batchPromises = batch.map(async (file, batchIndex) => {
      const globalIndex = batchStartIndex + batchIndex;
      return processImageFile(file, globalIndex);
    });

    // Wait for all files in batch to complete
    const batchResults = await Promise.allSettled(batchPromises);

    // Process results and update progress after each item
    batchResults.forEach((result, batchIndex) => {
      const globalIndex = batchStartIndex + batchIndex;
      const file = batch[batchIndex];

      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`Failed to process ${file.name}:`, result.reason);
        results.push({
          id: `img-${Date.now()}-${globalIndex}`,
          name: file.name,
          originalFile: file,
          dataUrl: '',
          error: result.reason instanceof Error ? result.reason.message : 'Processing failed',
          isHighQuality: false,
        });
      }

      processedCount++;
      // Update progress after each item completes
      onProgressUpdate({
        isProcessing: true,
        currentImage: processedCount,
        totalImages,
        processedImages: processedCount,
      });
    });
  }

  // Update usage tracking
  const successfulApiCalls = results.filter(img => !img.error).length;
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

// Process single file
const processImageFile = async (file: File, index: number): Promise<ImageData> => {
  try {
    console.log(`Processing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Get data URL for preview
    const dataUrl = await fileToDataUrl(file);

    // Assess quality
    const qualityScore = await assessImageQuality(file);

    const imageData: ImageData = {
      id: `img-${Date.now()}-${index}`,
      name: file.name,
      originalFile: file,
      dataUrl: dataUrl,
      qualityScore: qualityScore,
      isHighQuality: qualityScore >= QUALITY_THRESHOLD,
    };

    console.log(`Image ${file.name} - Quality: ${qualityScore}, High Quality: ${imageData.isHighQuality}`);
    return imageData;
  } catch (error) {
    console.error(`Error processing ${file.name}:`, error);

    // Still get dataUrl for preview even on error
    let dataUrl = '';
    try {
      dataUrl = await fileToDataUrl(file);
    } catch {
      // Ignore dataUrl error
    }

    return {
      id: `img-${Date.now()}-${index}`,
      name: file.name,
      originalFile: file,
      dataUrl: dataUrl,
      error: error instanceof Error ? error.message : 'Failed to assess quality',
      isHighQuality: false,
    };
  }
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
