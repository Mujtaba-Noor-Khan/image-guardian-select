
import { SightengineResponse } from '@/types/image-types';

const API_USER = '10034372';
const API_SECRET = 'KuAaagxXHcJZWaQyAimxHWf4Mx5PmLq7';

export const makeSightengineRequest = async (
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

export const createFormData = (media: string | File): FormData => {
  const API_USER = '10034372';
  const API_SECRET = 'KuAaagxXHcJZWaQyAimxHWf4Mx5PmLq7';
  
  const formData = new FormData();
  
  // Handle URL strings vs File objects properly
  if (typeof media === 'string') {
    // For URL strings, pass directly as string value
    formData.append('media', media);
    console.log('Added URL string to FormData:', media);
  } else {
    // For File objects, pass the file directly
    formData.append('media', media);
    console.log('Added File object to FormData:', media.name);
  }
  
  formData.append('models', 'quality');
  formData.append('api_user', API_USER);
  formData.append('api_secret', API_SECRET);
  
  return formData;
};
