
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageData, ProcessingState } from '@/types/image-types';
import { processImagesWithSightengine } from '@/services/sightengine-service';
import { toast } from '@/components/ui/use-toast';

interface ImageUploaderProps {
  onImagesUploaded: (images: ImageData[]) => void;
  onProcessingUpdate: (state: ProcessingState) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesUploaded,
  onProcessingUpdate,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast({
        title: "No images found",
        description: "Please upload valid image files.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const processedImages = await processImagesWithSightengine(
        imageFiles,
        onProcessingUpdate
      );
      
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

  const handleZipFile = async (zipFile: File) => {
    // For now, we'll show a message that zip processing needs additional setup
    toast({
      title: "Zip file upload",
      description: "Zip file processing will be implemented in the next update. Please extract and upload individual images for now.",
      variant: "default",
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const zipFiles = acceptedFiles.filter(file => 
      file.type === 'application/zip' || file.name.endsWith('.zip')
    );
    
    if (zipFiles.length > 0) {
      await handleZipFile(zipFiles[0]);
      return;
    }
    
    await processFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp'],
      'application/zip': ['.zip'],
    },
    disabled: isProcessing,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <FileImage className="h-8 w-8 text-blue-600" />
            Upload Images for Quality Assessment
          </CardTitle>
          <CardDescription className="text-lg">
            Drag & drop images or zip files, or click to browse
          </CardDescription>
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
                Drop your images here...
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xl text-gray-600 font-medium">
                  {isProcessing ? 'Processing images...' : 'Choose images to upload'}
                </p>
                <p className="text-gray-500">
                  Supports: JPEG, PNG, GIF, BMP, WebP, and ZIP files
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
                const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                input?.click();
              }}
            >
              <FileImage className="h-5 w-5" />
              Select Individual Images
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
              disabled={isProcessing}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.zip';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleZipFile(file);
                };
                input.click();
              }}
            >
              <Archive className="h-5 w-5" />
              Upload ZIP File
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
