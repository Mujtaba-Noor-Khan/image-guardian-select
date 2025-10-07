import { ImageData, ProcessingState, ParsedExcelData } from '@/types/image-types';
import { parseExcelFile } from '../excel-service';
import { makeSightengineRequestFromUrl } from './api-client';
import { updateUsageStats, addUsageEntry } from '@/services/usage-tracker';

const QUALITY_THRESHOLD = 0.82;
const CONCURRENT_REQUESTS = 10; // Process 10 images at once

export const processExcelFile = async (
  file: File,
  onProgressUpdate: (state: ProcessingState) => void
): Promise<{ parsedData: ParsedExcelData; images: ImageData[] }> => {
  console.log('processExcelFile: Starting Excel file processing for:', file.name);
  
  // Step 1: Parse Excel file
  console.log('processExcelFile: Setting parsing phase');
  onProgressUpdate({
    isProcessing: true,
    currentImage: 0,
    totalImages: 0,
    processedImages: 0,
    phase: 'parsing'
  });

  console.log('processExcelFile: Calling parseExcelFile');
  let parsedData: ParsedExcelData;
  try {
    parsedData = await parseExcelFile(file);
    console.log('processExcelFile: Excel parsing completed successfully:', parsedData);
  } catch (error) {
    console.error('processExcelFile: Excel parsing failed:', error);
    throw error;
  }
  
  // Only throw error for actual problematic URLs, not header rows
  if (parsedData.invalidUrls.length > 0) {
    console.log('processExcelFile: Invalid URLs found:', parsedData.invalidUrls);
    // Log but don't throw error - let the user know but continue processing
    console.warn('processExcelFile: Some invalid URLs were found but will be skipped:', parsedData.invalidUrls);
  }

  if (parsedData.urls.length === 0) {
    console.log('processExcelFile: No valid URLs found, throwing error');
    throw new Error('No valid .jpg URLs found in column A of the Excel file.');
  }

  console.log('processExcelFile: Starting image processing phase');
  // Step 2: Process URLs with batched parallelization
  const results = await processUrlsInParallel(parsedData.urls, onProgressUpdate);

  // Update usage tracking
  const successfulApiCalls = results.filter(img => !img.error).length;
  updateUsageStats(successfulApiCalls, results.length);
  addUsageEntry(successfulApiCalls, results.length, 'excel', file.name);

  console.log('processExcelFile: Processing complete, returning results');
  return { parsedData, images: results };
};

// Process URLs in parallel batches
const processUrlsInParallel = async (
  urls: string[],
  onProgressUpdate: (state: ProcessingState) => void
): Promise<ImageData[]> => {
  const totalImages = urls.length;
  const results: ImageData[] = [];
  let processedCount = 0;

  onProgressUpdate({
    isProcessing: true,
    currentImage: 0,
    totalImages,
    processedImages: 0,
    phase: 'processing'
  });

  // Process URLs in batches
  for (let i = 0; i < urls.length; i += CONCURRENT_REQUESTS) {
    const batch = urls.slice(i, i + CONCURRENT_REQUESTS);
    const batchStartIndex = i;

    console.log(`processExcelFile: Processing batch starting at index ${i}, size: ${batch.length}`);

    // Process batch in parallel
    const batchPromises = batch.map(async (url, batchIndex) => {
      const globalIndex = batchStartIndex + batchIndex;
      return processImageUrl(url, globalIndex);
    });

    // Wait for all URLs in batch to complete
    const batchResults = await Promise.allSettled(batchPromises);

    // Process results and update progress after each item
    batchResults.forEach((result, batchIndex) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        const globalIndex = batchStartIndex + batchIndex;
        const url = batch[batchIndex];
        console.error(`Failed to process ${url}:`, result.reason);
        results.push({
          id: `img-${Date.now()}-${globalIndex}`,
          name: url.split('/').pop() || `image-${globalIndex + 1}.jpg`,
          url: url,
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
        phase: 'processing'
      });
    });
  }

  console.log('processExcelFile: All images processed, updating final state');
  onProgressUpdate({
    isProcessing: false,
    currentImage: totalImages,
    totalImages,
    processedImages: totalImages,
    phase: 'processing'
  });

  return results;
};

// Process single image URL
const processImageUrl = async (url: string, index: number): Promise<ImageData> => {
  try {
    console.log(`Processing image ${index + 1}: ${url}`);
    const qualityScore = await assessImageQualityFromUrl(url);

    const imageData: ImageData = {
      id: `img-${Date.now()}-${index}`,
      name: url.split('/').pop() || `image-${index + 1}.jpg`,
      url: url,
      qualityScore: qualityScore,
      isHighQuality: qualityScore >= QUALITY_THRESHOLD,
    };

    console.log(`Image ${url} - Quality: ${qualityScore}, High Quality: ${imageData.isHighQuality}`);
    return imageData;
  } catch (error) {
    console.error(`Error processing ${url}:`, error);
    return {
      id: `img-${Date.now()}-${index}`,
      name: url.split('/').pop() || `image-${index + 1}.jpg`,
      url: url,
      error: error instanceof Error ? error.message : 'Failed to assess quality',
      isHighQuality: false,
    };
  }
};

const assessImageQualityFromUrl = async (imageUrl: string): Promise<number> => {
  console.log(`Starting API call for URL: ${imageUrl}`);
  
  const data = await makeSightengineRequestFromUrl(imageUrl);

  const qualityScore = data.quality!.score;
  console.log(`Successfully extracted quality score for ${imageUrl}: ${qualityScore}`);
  
  return qualityScore;
};
