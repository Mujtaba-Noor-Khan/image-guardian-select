
import { SightengineResponse } from '@/types/image-types';

const API_USER = '10034372';
const API_SECRET = 'KuAaagxXHcJZWaQyAimxHWf4Mx5PmLq7';

export const makeSightengineRequest = async (
  formData: FormData,
  isUrl: boolean = false
): Promise<SightengineResponse> => {
  const requestType = isUrl ? 'URL' : 'file';
  console.log(`Starting API call for ${requestType}`);

  let body: string | FormData;
  let headers: HeadersInit = {};

  if (isUrl) {
    // For URLs, manually construct multipart/form-data body
    const boundary = '----formdata-lovable-' + Math.random().toString(36).substr(2, 9);
    
    body = '';
    for (const [key, value] of formData.entries()) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${value}\r\n`;
    }
    body += `--${boundary}--\r\n`;

    headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
  } else {
    // For files, let FormData handle the encoding
    body = formData;
  }

  console.log('Request details:', {
    url: 'https://api.sightengine.com/1.0/check.json',
    method: 'POST',
    models: 'quality',
    api_user: API_USER,
    api_secret: API_SECRET ? '***hidden***' : 'NOT SET',
    requestType
  });

  let response: Response;
  
  try {
    console.log(`Making fetch request for ${requestType}...`);
    response = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      headers,
      body,
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

export const createFormData = (media: string | File, isUrl: boolean = false): FormData => {
  const API_USER = '10034372';
  const API_SECRET = 'KuAaagxXHcJZWaQyAimxHWf4Mx5PmLq7';
  
  const formData = new FormData();
  formData.append('media', media);
  formData.append('models', 'quality');
  formData.append('api_user', API_USER);
  formData.append('api_secret', API_SECRET);
  
  return formData;
};
