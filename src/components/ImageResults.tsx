
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ImageData } from '@/types/image-types';
import { Download, RotateCcw, CheckCircle, XCircle, Star, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ImageResultsProps {
  images: ImageData[];
  onReset: () => void;
}

export const ImageResults: React.FC<ImageResultsProps> = ({ images, onReset }) => {
  const [showOnlyHighQuality, setShowOnlyHighQuality] = useState(false);
  
  const highQualityImages = images.filter(img => img.isHighQuality);
  const lowQualityImages = images.filter(img => !img.isHighQuality);
  const displayImages = showOnlyHighQuality ? highQualityImages : images;

  const downloadHighQualityUrls = () => {
    if (highQualityImages.length === 0) {
      toast({
        title: "No high-quality images",
        description: "There are no high-quality images to download.",
        variant: "destructive",
      });
      return;
    }

    const urls = highQualityImages
      .filter(img => img.url)
      .map(img => img.url)
      .join('\n');
    
    const blob = new Blob([urls], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'high-quality-image-urls.txt';
    link.click();
    
    toast({
      title: "Download started",
      description: `Downloading ${highQualityImages.length} high-quality image URLs as a text file.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Processing Results
          </CardTitle>
          <CardDescription>
            Quality assessment complete for {images.length} images (Score ≥ 0.8 required)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {highQualityImages.length}
              </div>
              <div className="text-sm text-green-700">High Quality</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {lowQualityImages.length}
              </div>
              <div className="text-sm text-red-700">Low Quality</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {images.length}
              </div>
              <div className="text-sm text-blue-700">Total Processed</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={downloadHighQualityUrls}
              className="flex items-center gap-2"
              disabled={highQualityImages.length === 0}
            >
              <Download className="h-4 w-4" />
              Download High Quality URLs ({highQualityImages.length})
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowOnlyHighQuality(!showOnlyHighQuality)}
            >
              {showOnlyHighQuality ? 'Show All Images' : 'Show Only High Quality'}
            </Button>
            
            <Button
              variant="outline"
              onClick={onReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Upload New File
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayImages.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <CardContent className="p-0">
              <AspectRatio ratio={1}>
                <img
                  src={image.url || image.dataUrl}
                  alt={image.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </AspectRatio>
              
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate" title={image.name}>
                    {image.name}
                  </p>
                  
                  {image.isHighQuality ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      High
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      <XCircle className="h-3 w-3 mr-1" />
                      Low
                    </Badge>
                  )}
                </div>
                
                {image.qualityScore !== undefined && (
                  <p className="text-xs text-gray-600">
                    Quality Score: {image.qualityScore.toFixed(3)}
                  </p>
                )}
                
                {image.url && (
                  <a
                    href={image.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Original
                  </a>
                )}
                
                {image.error && (
                  <p className="text-xs text-red-600">
                    Error: {image.error}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
