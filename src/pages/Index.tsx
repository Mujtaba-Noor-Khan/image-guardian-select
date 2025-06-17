
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { ImageResults } from '@/components/ImageResults';
import { ProcessingProgress } from '@/components/ProcessingProgress';
import { UsageWarning } from '@/components/UsageWarning';
import { ImageData, ProcessingState } from '@/types/image-types';

const Index = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    currentImage: 0,
    totalImages: 0,
    processedImages: 0,
  });

  const handleImagesUploaded = (uploadedImages: ImageData[]) => {
    setImages(uploadedImages);
  };

  const handleProcessingUpdate = (state: ProcessingState) => {
    setProcessingState(state);
  };

  const handleReset = () => {
    setImages([]);
    setProcessingState({
      isProcessing: false,
      currentImage: 0,
      totalImages: 0,
      processedImages: 0,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-between items-start mb-4">
            <div></div>
            <h1 className="text-4xl font-bold text-gray-900">
              Image Quality Filter
            </h1>
            <Link to="/settings">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload your images and let AI assess their technical quality.
          </p>
        </div>

        <UsageWarning />

        {processingState.isProcessing && (
          <ProcessingProgress state={processingState} />
        )}

        {images.length === 0 && !processingState.isProcessing ? (
          <ImageUploader 
            onImagesUploaded={handleImagesUploaded}
            onProcessingUpdate={handleProcessingUpdate}
          />
        ) : !processingState.isProcessing ? (
          <ImageResults 
            images={images} 
            onReset={handleReset}
          />
        ) : null}
      </div>
    </div>
  );
};

export default Index;
