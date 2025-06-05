
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
  
  // Validate file size (Sightengine has limits)
  const maxSizeInMB = 10;
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    throw new Error(`File too large. Maximum size is ${maxSizeInMB}MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  // Validate file type
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
    
    // Try to parse error details
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
