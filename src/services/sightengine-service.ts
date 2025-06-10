import { ImageData, ProcessingState, SightengineResponse, ParsedExcelData } from '@/types/image-types';
import { parseExcelFile } from './excel-service';

const API_USER = '10034372';
const API_SECRET = 'KuAaagxXHcJZWaQyAimxHWf4Mx5PmLq7';
const QUALITY_THRESHOLD = 0.8;

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

      console.log(`processExcelFile: Image ${url} - Quality: ${qualityScore}, High Quality: ${imageData.isHighQuality}`);
      
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
  
  // For URLs, we still use FormData but pass the URL as a string value
  // This ensures proper multipart/form-data encoding that Sightengine expects
  const formData = new FormData();
  formData.append('media', imageUrl);
  formData.append('models', 'quality');
  formData.append('api_user', API_USER);
  formData.append('api_secret', API_SECRET);

  console.log('Request details:', {
    url: 'https://api.sightengine.com/1.0/check.json',
    method: 'POST',
    imageUrl: imageUrl,
    models: 'quality',
    api_user: API_USER,
    api_secret: API_SECRET ? '***hidden***' : 'NOT SET'
  });

  let response: Response;
  
  try {
    console.log('Making fetch request...');
    response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      // Don't set Content-Type header - let FormData set it automatically with boundary
      body: formData,
    });
    console.log(`Fetch completed. Response status: ${response.status} ${response.statusText}`);
  } catch (fetchError) {
    console.error('Fetch error:', fetchError);
    throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`);
  }

  let responseText: string;
  try {
    responseText = await response.text();
    console.log(`Raw response text (first 500 chars): ${responseText.substring(0, 500)}`);
  } catch (textError) {
    console.error('Error reading response text:', textError);
    throw new Error('Failed to read API response');
  }

  if (!response.ok) {
    console.error(`API error - Status: ${response.status}, Response: ${responseText}`);
    
    try {
      const errorData = JSON.parse(responseText);
      console.error('Parsed error data:', errorData);
      throw new Error(`Sightengine API error (${response.status}): ${errorData.error?.message || errorData.message || 'Unknown error'}`);
    } catch (parseError) {
      throw new Error(`Sightengine API error (${response.status}): ${responseText || 'Unknown error'}`);
    }
  }

  let data: SightengineResponse;
  try {
    data = JSON.parse(responseText);
    console.log('Parsed API response:', JSON.stringify(data, null, 2));
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Response text that failed to parse:', responseText);
    throw new Error('Invalid JSON response from Sightengine API');
  }
  
  if (data.status !== 'success') {
    console.error('API returned non-success status:', data);
    const errorMessage = data.status === 'failure' ? 'API request failed' : `Unexpected status: ${data.status}`;
    throw new Error(errorMessage);
  }

  if (!data.quality || typeof data.quality.score !== 'number') {
    console.error('No quality data in response:', data);
    throw new Error('No quality score in API response');
  }

  const qualityScore = data.quality.score;
  console.log(`Successfully extracted quality score for ${imageUrl}: ${qualityScore}`);
  
  return qualityScore;
};

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

      console.log(`Processing image: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
      
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
        error: error instanceof Error ? error.message : 'Failed to assess quality',
        isHighQuality: false,
      };
      
      results.push(imageData);
    }

    // Small delay to prevent overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 200));
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

  const formData = new FormData();
  formData.append('media', file);
  formData.append('models', 'quality');
  formData.append('api_user', API_USER);
  formData.append('api_secret', API_SECRET);

  console.log('Request details:', {
    url: 'https://api.sightengine.com/1.0/check.json',
    method: 'POST',
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    models: 'quality',
    api_user: API_USER,
    api_secret: API_SECRET ? '***hidden***' : 'NOT SET'
  });

  let response: Response;
  
  try {
    console.log('Making fetch request...');
    response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: formData,
    });
    console.log(`Fetch completed. Response status: ${response.status} ${response.statusText}`);
  } catch (fetchError) {
    console.error('Fetch error:', fetchError);
    throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`);
  }

  let responseText: string;
  try {
    responseText = await response.text();
    console.log(`Raw response text (first 500 chars): ${responseText.substring(0, 500)}`);
  } catch (textError) {
    console.error('Error reading response text:', textError);
    throw new Error('Failed to read API response');
  }

  if (!response.ok) {
    console.error(`API error - Status: ${response.status}, Response: ${responseText}`);
    
    try {
      const errorData = JSON.parse(responseText);
      console.error('Parsed error data:', errorData);
      throw new Error(`Sightengine API error (${response.status}): ${errorData.error?.message || errorData.message || 'Unknown error'}`);
    } catch (parseError) {
      throw new Error(`Sightengine API error (${response.status}): ${responseText || 'Unknown error'}`);
    }
  }

  let data: SightengineResponse;
  try {
    data = JSON.parse(responseText);
    console.log('Parsed API response:', JSON.stringify(data, null, 2));
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Response text that failed to parse:', responseText);
    throw new Error('Invalid JSON response from Sightengine API');
  }
  
  if (data.status !== 'success') {
    console.error('API returned non-success status:', data);
    const errorMessage = data.status === 'failure' ? 'API request failed' : `Unexpected status: ${data.status}`;
    throw new Error(errorMessage);
  }

  if (!data.quality || typeof data.quality.score !== 'number') {
    console.error('No quality data in response:', data);
    throw new Error('No quality score in API response');
  }

  const qualityScore = data.quality.score;
  console.log(`Successfully extracted quality score for ${file.name}: ${qualityScore}`);
  
  return qualityScore;
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};
