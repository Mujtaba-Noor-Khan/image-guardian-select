
import axios from 'axios';
import { SightengineResponse } from '@/types/image-types';

const API_USER = '10034372';
const API_SECRET = 'KuAaagxXHcJZWaQyAimxHWf4Mx5PmLq7';

export const makeSightengineRequestFromUrl = async (
  imageUrl: string
): Promise<SightengineResponse> => {
  console.log(`Starting API call with URL: ${imageUrl}`);

  // Validate URL format
  try {
    new URL(imageUrl);
  } catch (error) {
    throw new Error(`Invalid URL format: ${imageUrl}`);
  }

  // Check if URL points to a valid image format
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const urlLower = imageUrl.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => urlLower.includes(ext));
  
  if (!hasValidExtension) {
    throw new Error(`URL does not appear to point to a supported image format: ${imageUrl}`);
  }

  console.log('Request details:', {
    url: 'https://api.sightengine.com/1.0/check.json',
    method: 'GET',
    imageUrl,
    models: 'quality',
    api_user: API_USER,
    api_secret: API_SECRET ? '***hidden***' : 'NOT SET'
  });

  const params = {
    url: imageUrl,
    models: 'quality',
    api_user: API_USER,
    api_secret: API_SECRET
  };

  let response;
  
  try {
    console.log(`Making GET request...`);
    response = await axios.get('https://api.sightengine.com/1.0/check.json', {
      params: params,
      timeout: 30000 // 30 second timeout
    });
    console.log(`Request completed. Response status: ${response.status}`);
  } catch (axiosError: any) {
    console.error('Axios error:', axiosError);
    if (axiosError.response) {
      console.error('Error response data:', axiosError.response.data);
      throw new Error(`Sightengine API error (${axiosError.response.status}): ${axiosError.response.data?.error?.message || axiosError.response.data?.message || 'Unknown error'}`);
    } else if (axiosError.request) {
      throw new Error(`Network error: Unable to reach Sightengine API`);
    } else {
      throw new Error(`Request error: ${axiosError.message}`);
    }
  }

  const data = response.data;
  console.log('Parsed API response:', JSON.stringify(data, null, 2));
  
  if (data.status !== 'success') {
    console.error('API returned non-success status:', data);
    const errorMessage = data.status === 'failure' ? 'API request failed' : `Unexpected status: ${data.status}`;
    throw new Error(errorMessage);
  }

  if (!data.quality || typeof data.quality.score !== 'number') {
    console.error('No quality data in response:', data);
    throw new Error('No quality score in API response');
  }

  return data;
};

export const makeSightengineRequestFromFile = async (
  formData: FormData
): Promise<SightengineResponse> => {
  console.log(`Starting API call with FormData`);

  console.log('Request details:', {
    url: 'https://api.sightengine.com/1.0/check.json',
    method: 'POST',
    models: 'quality',
    api_user: API_USER,
    api_secret: API_SECRET ? '***hidden***' : 'NOT SET'
  });

  let response: Response;
  
  try {
    console.log(`Making fetch request...`);
    response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: formData, // Let browser handle multipart encoding automatically
      // DO NOT set Content-Type header - let browser set it with boundary
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

  return data;
};

export const createFormData = (file: File): FormData => {
  const formData = new FormData();
  
  formData.append('media', file);
  console.log('Added File object to FormData:', file.name);
  
  formData.append('models', 'quality');
  formData.append('api_user', API_USER);
  formData.append('api_secret', API_SECRET);
  
  return formData;
};
