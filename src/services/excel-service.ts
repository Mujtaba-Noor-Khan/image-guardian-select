
import * as XLSX from 'xlsx';
import { ParsedExcelData } from '@/types/image-types';

export const parseExcelFile = async (file: File): Promise<ParsedExcelData> => {
  console.log('parseExcelFile: Starting to parse Excel file:', file.name, 'Size:', file.size);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      console.log('parseExcelFile: FileReader onload triggered');
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        console.log('parseExcelFile: Data converted to Uint8Array, length:', data.length);
        
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('parseExcelFile: Workbook created, sheet names:', workbook.SheetNames);
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        console.log('parseExcelFile: Using sheet:', firstSheetName);
        
        // Convert to JSON with header: 1 to get array of arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('parseExcelFile: JSON data extracted, rows:', jsonData.length);
        console.log('parseExcelFile: First 3 rows:', jsonData.slice(0, 3));
        
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
                  console.log(`parseExcelFile: Valid URL found at row ${index + 1}: ${url}`);
                } catch {
                  invalidUrls.push(`Row ${index + 1}: Invalid URL format - ${url}`);
                  console.log(`parseExcelFile: Invalid URL format at row ${index + 1}: ${url}`);
                }
              } else {
                invalidUrls.push(`Row ${index + 1}: Not a .jpg file - ${url}`);
                console.log(`parseExcelFile: Not a .jpg file at row ${index + 1}: ${url}`);
              }
            }
          }
        });
        
        console.log('parseExcelFile: Parsing complete. Valid URLs:', allUrls.length, 'Invalid URLs:', invalidUrls.length);
        
        resolve({
          urls: allUrls,
          invalidUrls,
          totalUrls: allUrls.length + invalidUrls.length
        });
      } catch (error) {
        console.error('parseExcelFile: Error during parsing:', error);
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = (error) => {
      console.error('parseExcelFile: FileReader error:', error);
      reject(new Error('Failed to read Excel file'));
    };
    
    console.log('parseExcelFile: Starting to read file as ArrayBuffer');
    reader.readAsArrayBuffer(file);
  });
};
