
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ProcessingState } from '@/types/image-types';
import { Loader2, FileText, Image } from 'lucide-react';

interface ProcessingProgressProps {
  state: ProcessingState;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ state }) => {
  const progressPercentage = state.totalImages > 0 
    ? (state.processedImages / state.totalImages) * 100 
    : 0;

  const getPhaseInfo = () => {
    switch (state.phase) {
      case 'parsing':
        return {
          icon: <FileText className="h-6 w-6 animate-pulse text-blue-600" />,
          title: 'Parsing Excel File',
          description: 'Reading and validating image URLs from the Excel file...'
        };
      case 'processing':
        return {
          icon: <Loader2 className="h-6 w-6 animate-spin text-blue-600" />,
          title: 'Processing Images',
          description: 'Assessing image quality with AI...'
        };
      default:
        return {
          icon: <Loader2 className="h-6 w-6 animate-spin text-blue-600" />,
          title: 'Processing Images',
          description: 'Assessing image quality with AI...'
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className="max-w-2xl mx-auto mb-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {phaseInfo.icon}
            {phaseInfo.title}
          </CardTitle>
          <CardDescription>
            {phaseInfo.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.phase === 'processing' && (
            <>
              <div className="text-center">
                <p className="text-lg font-medium">
                  Processing image {state.currentImage} of {state.totalImages}
                </p>
                <p className="text-sm text-gray-600">
                  {state.processedImages} completed
                </p>
              </div>
              
              <Progress value={progressPercentage} className="w-full h-3" />
              
              <div className="text-center text-sm text-gray-500">
                {progressPercentage.toFixed(0)}% complete
              </div>
            </>
          )}
          
          {state.phase === 'parsing' && (
            <div className="text-center">
              <p className="text-lg font-medium">Reading Excel file...</p>
              <p className="text-sm text-gray-600">Validating image URLs</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
