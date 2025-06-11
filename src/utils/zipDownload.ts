
import JSZip from 'jszip';
import { ImageData } from '@/types/image-types';

export interface DownloadProgress {
  current: number;
  total: number;
  status: 'downloading' | 'zipping' | 'complete';
}

export const downloadImagesAsZip = async (
  images: ImageData[],
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> => {
  const zip = new JSZip();
  const total = images.length;
  
  console.log(`Starting zip download for ${total} images`);
  
  // Download images in batches to avoid overwhelming the browser
  const batchSize = 10;
  let downloadedCount = 0;
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    
    const downloadPromises = batch.map(async (image, batchIndex) => {
      const globalIndex = i + batchIndex;
      
      try {
        onProgress?.({
          current: downloadedCount + batchIndex + 1,
          total,
          status: 'downloading'
        });
        
        const url = image.url || image.dataUrl;
        if (!url) {
          throw new Error('No URL available for image');
        }
        
        let response: Response;
        
        if (url.startsWith('data:')) {
          // Handle data URLs (base64 images)
          const base64Data = url.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          
          // Determine file extension from original name or data URL
          const extension = getFileExtension(image.name) || getExtensionFromDataUrl(url);
          const filename = `Image ${globalIndex + 1}.${extension}`;
          
          zip.file(filename, bytes);
          console.log(`Added image ${globalIndex + 1} to zip (from data URL)`);
          return;
        }
        
        // Handle regular URLs
        response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        const blob = await response.blob();
        const extension = getFileExtension(image.name) || getExtensionFromUrl(url) || 'jpg';
        const filename = `Image ${globalIndex + 1}.${extension}`;
        
        zip.file(filename, blob);
        console.log(`Added image ${globalIndex + 1} to zip (from URL)`);
        
      } catch (error) {
        console.error(`Failed to download image ${globalIndex + 1}:`, error);
        // Add a placeholder text file for failed downloads
        const filename = `Image ${globalIndex + 1}_FAILED.txt`;
        zip.file(filename, `Failed to download: ${image.name}\nError: ${error instanceof Error ? error.message : 'Unknown error'}\nOriginal URL: ${image.url || 'N/A'}`);
      }
    });
    
    await Promise.all(downloadPromises);
    downloadedCount += batch.length;
    
    // Small delay between batches to prevent overwhelming the browser
    if (i + batchSize < images.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Generate zip file
  onProgress?.({
    current: total,
    total,
    status: 'zipping'
  });
  
  console.log('Generating zip file...');
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  // Download the zip file
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  link.download = 'high-quality-images.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up
  URL.revokeObjectURL(link.href);
  
  onProgress?.({
    current: total,
    total,
    status: 'complete'
  });
  
  console.log('Zip download complete');
};

const getFileExtension = (filename: string): string | null => {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : null;
};

const getExtensionFromUrl = (url: string): string | null => {
  try {
    const pathname = new URL(url).pathname;
    return getFileExtension(pathname);
  } catch {
    return null;
  }
};

const getExtensionFromDataUrl = (dataUrl: string): string => {
  const match = dataUrl.match(/data:image\/([^;]+)/);
  if (match) {
    const mimeType = match[1];
    switch (mimeType) {
      case 'jpeg':
      case 'jpg':
        return 'jpg';
      case 'png':
        return 'png';
      case 'gif':
        return 'gif';
      case 'webp':
        return 'webp';
      case 'bmp':
        return 'bmp';
      default:
        return 'jpg';
    }
  }
  return 'jpg';
};
