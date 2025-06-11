
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ImageData } from '@/types/image-types';
import { Download, RotateCcw, CheckCircle, XCircle, Star, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { downloadImagesAsZip, DownloadProgress } from '@/utils/zipDownload';

interface ImageResultsProps {
  images: ImageData[];
  onReset: () => void;
}

export const ImageResults: React.FC<ImageResultsProps> = ({ images, onReset }) => {
  const [showOnlyHighQuality, setShowOnlyHighQuality] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  
  const highQualityImages = images.filter(img => img.isHighQuality);
  const lowQualityImages = images.filter(img => !img.isHighQuality);
  const displayImages = showOnlyHighQuality ? highQualityImages : images;

  const downloadHighQualityImages = async () => {
    if (highQualityImages.length === 0) {
      toast({
        title: "No high-quality images",
        description: "There are no high-quality images to download.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    setDownloadProgress({ current: 0, total: highQualityImages.length, status: 'downloading' });

    try {
      await downloadImagesAsZip(highQualityImages, setDownloadProgress);
      
      toast({
        title: "Download complete!",
        description: `Successfully downloaded ${highQualityImages.length} high-quality images as a zip file.`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const getProgressText = () => {
    if (!downloadProgress) return '';
    
    switch (downloadProgress.status) {
      case 'downloading':
        return `Downloading ${downloadProgress.current}/${downloadProgress.total} images...`;
      case 'zipping':
        return 'Creating zip file...';
      case 'complete':
        return 'Download complete!';
      default:
        return '';
    }
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
            Quality assessment complete for {images.length} images (Score ≥ 0.82 required)
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
              onClick={downloadHighQualityImages}
              className="flex items-center gap-2"
              disabled={highQualityImages.length === 0 || isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isDownloading ? 'Downloading...' : `Download High Quality Images (${highQualityImages.length})`}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowOnlyHighQuality(!showOnlyHighQuality)}
              disabled={isDownloading}
            >
              {showOnlyHighQuality ? 'Show All Images' : 'Show Only High Quality'}
            </Button>
            
            <Button
              variant="outline"
              onClick={onReset}
              className="flex items-center gap-2"
              disabled={isDownloading}
            >
              <RotateCcw className="h-4 w-4" />
              Upload New File
            </Button>
          </div>
          
          {isDownloading && downloadProgress && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">{getProgressText()}</span>
              </div>
              <div className="mt-2 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(downloadProgress.current / downloadProgress.total) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}
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
