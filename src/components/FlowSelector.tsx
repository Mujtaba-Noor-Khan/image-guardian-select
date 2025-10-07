import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Package } from 'lucide-react';

interface FlowSelectorProps {
  onSelectFlow: (flow: 'blades' | 'cosmetic-and-shrouds') => void;
}

export const FlowSelector = ({ onSelectFlow }: FlowSelectorProps) => {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="p-8 bg-white/95 backdrop-blur-sm shadow-xl">
        <h2 className="text-2xl font-bold text-center mb-2">Select Processing Flow</h2>
        <p className="text-center text-muted-foreground mb-8">
          Choose how you want to process your Excel file
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Blades Flow */}
          <Card className="p-6 border-2 hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => onSelectFlow('blades')}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <FileSpreadsheet className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold">Blades</h3>
              <p className="text-sm text-muted-foreground">
                Extract image URLs from <strong>Column A</strong> of the first sheet
              </p>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFlow('blades');
                }}
                className="w-full"
              >
                Select Blades
              </Button>
            </div>
          </Card>

          {/* Cosmetic Decals & Shrouds Flow */}
          <Card className="p-6 border-2 hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => onSelectFlow('cosmetic-and-shrouds')}>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
                <Package className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold">Cosmetic Decals & Shrouds</h3>
              <p className="text-sm text-muted-foreground">
                Extract image links from <strong>'Place' columns</strong> across all sheets
              </p>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFlow('cosmetic-and-shrouds');
                }}
                className="w-full"
              >
                Select Cosmetic
              </Button>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
};
