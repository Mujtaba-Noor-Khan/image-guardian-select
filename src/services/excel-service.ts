
import * as XLSX from 'xlsx';
import { ParsedExcelData } from '@/types/image-types';

export const parseExcelFile = async (file: File): Promise<ParsedExcelData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with header: 1 to get array of arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Extract URLs from column A (index 0)
        const allUrls: string[] = [];
        const invalidUrls: string[] = [];
        
        jsonData.forEach((row: any, index: number) => {
          if (Array.isArray(row) && row[0]) {
            const url = String(row[0]).trim();
            if (url) {
              // Validate that URL points to .jpg file
              if (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')) {
                // Basic URL validation
                try {
                  new URL(url);
                  allUrls.push(url);
                } catch {
                  invalidUrls.push(`Row ${index + 1}: Invalid URL format - ${url}`);
                }
              } else {
                invalidUrls.push(`Row ${index + 1}: Not a .jpg file - ${url}`);
              }
            }
          }
        });
        
        resolve({
          urls: allUrls,
          invalidUrls,
          totalUrls: allUrls.length + invalidUrls.length
        });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};
