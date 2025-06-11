import { ImageData, ProcessingState, ParsedExcelData } from '@/types/image-types';
import { parseExcelFile } from '../excel-service';
import { makeSightengineRequestFromUrl } from './api-client';

const QUALITY_THRESHOLD = 0.82;

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
  // Step 2: Process URLs
  const results: ImageData[] = [];
  const totalImages = parsedData.urls.length;

  onProgressUpdate({
    isProcessing: true,
    currentImage: 0,
    totalImages,
    processedImages: 0,
    phase: 'processing'
  });

  for (let i = 0; i < parsedData.urls.length; i++) {
    const url = parsedData.urls[i];
    
    console.log(`processExcelFile: Processing image ${i + 1}/${totalImages}: ${url}`);
    onProgressUpdate({
      isProcessing: true,
      currentImage: i + 1,
      totalImages,
      processedImages: i,
      phase: 'processing'
    });

    try {
      const imageData: ImageData = {
        id: `img-${Date.now()}-${i}`,
        name: url.split('/').pop() || `image-${i + 1}.jpg`,
        url: url,
      };

      console.log(`processExcelFile: Assessing quality for: ${url}`);
      
      const qualityScore = await assessImageQualityFromUrl(url);
      imageData.qualityScore = qualityScore;
      imageData.isHighQuality = qualityScore >= QUALITY_THRESHOLD;

      console.log(`processExcelFile: Image ${url} - Quality: ${qualityScore}, High Quality: ${imageData.isHighQuality}, Threshold: ${QUALITY_THRESHOLD}`);
      
      results.push(imageData);
    } catch (error) {
      console.error(`processExcelFile: Error processing ${url}:`, error);
      
      const imageData: ImageData = {
        id: `img-${Date.now()}-${i}`,
        name: url.split('/').pop() || `image-${i + 1}.jpg`,
        url: url,
        error: error instanceof Error ? error.message : 'Failed to assess quality',
        isHighQuality: false,
      };
      
      results.push(imageData);
    }

    // Small delay to prevent overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('processExcelFile: All images processed, updating final state');
  onProgressUpdate({
    isProcessing: false,
    currentImage: totalImages,
    totalImages,
    processedImages: totalImages,
    phase: 'processing'
  });

  console.log('processExcelFile: Processing complete, returning results');
  return { parsedData, images: results };
};

const assessImageQualityFromUrl = async (imageUrl: string): Promise<number> => {
  console.log(`Starting API call for URL: ${imageUrl}`);
  
  const data = await makeSightengineRequestFromUrl(imageUrl);

  const qualityScore = data.quality!.score;
  console.log(`Successfully extracted quality score for ${imageUrl}: ${qualityScore}`);
  
  return qualityScore;
};
