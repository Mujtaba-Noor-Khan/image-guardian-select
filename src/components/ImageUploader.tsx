
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, FileImage } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageData, ProcessingState } from '@/types/image-types';
import { processImagesWithSightengine, processExcelFile } from '@/services/sightengine-service';
import { toast } from '@/hooks/use-toast';
import { ApiCredentialsInput } from './ApiCredentialsInput';
import { hasStoredCredentials, storeCredentials } from '@/services/sightengine/api-client';

interface ImageUploaderProps {
  onImagesUploaded: (images: ImageData[]) => void;
  onProcessingUpdate: (state: ProcessingState) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesUploaded,
  onProcessingUpdate,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [credentialsSet, setCredentialsSet] = useState(hasStoredCredentials());

  const handleCredentialsSet = (apiUser: string, apiSecret: string) => {
    storeCredentials(apiUser, apiSecret);
    setCredentialsSet(true);
    toast({
      title: "Credentials set successfully",
      description: "You can now upload and process images.",
    });
  };

  const processExcelFileHandler = async (file: File) => {
    console.log(`ImageUploader: Starting to process Excel file: ${file.name}`);
    setIsProcessing(true);
    
    try {
      console.log('ImageUploader: Calling processExcelFile');
      const { parsedData, images } = await processExcelFile(file, onProcessingUpdate);
      
      console.log('ImageUploader: Excel processing completed:', images);
      onImagesUploaded(images);
      
      const highQualityCount = images.filter(img => img.isHighQuality).length;
      
      let description = `${highQualityCount} high-quality images out of ${images.length} from ${parsedData.urls.length}.`;
      
      if (parsedData.invalidUrls.length > 0) {
        description += ` ${parsedData.invalidUrls.length} images were skipped (likely headers or invalid image URLs).`;
      }
      
      toast({
        title: "Processing complete!",
        description,
      });
    } catch (error) {
      console.error('ImageUploader: Excel processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Processing failed",
        description: errorMessage.includes('No valid .jpg URLs') 
          ? "No valid .jpg image URLs found in column A. Please check your Excel file format."
          : "There was an error processing your Excel file. Please check the file format and try again.",
        variant: "destructive",
      });
    } finally {
      console.log('ImageUploader: Setting isProcessing to false');
      setIsProcessing(false);
    }
  };

  const processImageFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast({
        title: "No images found",
        description: "Please upload valid image files.",
        variant: "destructive",
      });
      return;
    }

    console.log(`Starting to process ${imageFiles.length} images`);
    setIsProcessing(true);
    
    try {
      const processedImages = await processImagesWithSightengine(
        imageFiles,
        onProcessingUpdate
      );
      
      console.log('Processing completed:', processedImages);
      onImagesUploaded(processedImages);
      
      const highQualityCount = processedImages.filter(img => img.isHighQuality).length;
      toast({
        title: "Processing complete!",
        description: `Found ${highQualityCount} high-quality images out of ${processedImages.length} processed.`,
      });
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing failed",
        description: "There was an error processing your images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const excelFiles = acceptedFiles.filter(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.name.endsWith('.xlsx')
    );
    
    if (excelFiles.length > 0) {
      await processExcelFileHandler(excelFiles[0]);
      return;
    }
    
    await processImageFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    disabled: isProcessing,
  });

  // Show credentials input if not set
  if (!credentialsSet) {
    return (
      <div className="max-w-4xl mx-auto">
        <ApiCredentialsInput onCredentialsSet={handleCredentialsSet} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <FileText className="h-8 w-8 text-blue-600" />
            Upload an Excel doc or Image files for Quality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`p-12 text-center cursor-pointer rounded-lg transition-colors ${
              isDragActive
                ? 'bg-blue-50 border-blue-300'
                : 'bg-gray-50 hover:bg-gray-100'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            
            {isDragActive ? (
              <p className="text-xl text-blue-600 font-medium">
                Drop your files here...
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xl text-gray-600 font-medium">
                  {isProcessing ? 'Processing...' : 'Choose files to upload'}
                </p>
                <p className="text-gray-500">
                  Supports: Excel files (.xlsx) with image URLs, or individual images (JPEG, PNG, GIF, BMP, WebP)
                </p>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled={isProcessing}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) processExcelFileHandler(file);
                };
                input.click();
              }}
            >
              <FileText className="h-5 w-5" />
              Select Excel File (.xlsx)
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled={isProcessing}
              onClick={() => {
                const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                input?.click();
              }}
            >
              <FileImage className="h-5 w-5" />
              Select Individual Images
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Rules when uploading an Excel File with image links:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Place image links in column A (no header required)</li>
              <li>• Links must point to .jpg or .jpeg files</li>
              <li>• Up to 400 images supported</li>
              <li>• Other columns will be ignored</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
