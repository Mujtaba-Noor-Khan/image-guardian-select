import * as XLSX from 'xlsx';
import { ParsedExcelData } from '@/types/image-types';

export const parseCosmeticExcelFile = async (file: File): Promise<ParsedExcelData> => {
  console.log('parseCosmeticExcelFile: Starting to parse Excel file:', file.name, 'Size:', file.size);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      console.log('parseCosmeticExcelFile: FileReader onload triggered');
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        console.log('parseCosmeticExcelFile: Data converted to Uint8Array, length:', data.length);
        
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('parseCosmeticExcelFile: Workbook created, sheet names:', workbook.SheetNames);
        
        const allUrls: string[] = [];
        const invalidUrls: string[] = [];
        let totalPlaceColumnsFound = 0;
        
        // Process all sheets
        workbook.SheetNames.forEach((sheetName) => {
          console.log('parseCosmeticExcelFile: Processing sheet:', sheetName);
          const worksheet = workbook.Sheets[sheetName];
          
          // Get the range of the sheet
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          
          // Find the header row (first non-empty row)
          let headerRow = -1;
          for (let row = range.s.r; row <= range.e.r; row++) {
            let hasContent = false;
            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = worksheet[cellAddress];
              if (cell && cell.v) {
                hasContent = true;
                break;
              }
            }
            if (hasContent) {
              headerRow = row;
              console.log(`parseCosmeticExcelFile: Found header row at ${row} in sheet ${sheetName}`);
              break;
            }
          }
          
          if (headerRow === -1) {
            console.log(`parseCosmeticExcelFile: No header row found in sheet ${sheetName}, skipping`);
            return;
          }
          
          // Extract headers from header row
          const headers: string[] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
            const cell = worksheet[cellAddress];
            headers.push(cell && cell.v ? String(cell.v).trim() : '');
          }
          
          console.log(`parseCosmeticExcelFile: Headers in sheet ${sheetName}:`, headers);
          
          // Find columns where header contains "Place" (case-insensitive)
          const placeColumns: number[] = [];
          headers.forEach((header, index) => {
            if (header.toLowerCase().includes('place')) {
              placeColumns.push(index);
              totalPlaceColumnsFound++;
              console.log(`parseCosmeticExcelFile: Found "Place" column at index ${index} (${header}) in sheet ${sheetName}`);
            }
          });
          
          if (placeColumns.length === 0) {
            console.log(`parseCosmeticExcelFile: No "Place" columns found in sheet ${sheetName}`);
            return;
          }
          
          // Process rows after the header
          for (let row = headerRow + 1; row <= range.e.r; row++) {
            placeColumns.forEach((col) => {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
              const cell = worksheet[cellAddress];
              
              // Check if cell has a hyperlink
              if (cell && cell.l && cell.l.Target) {
                const url = String(cell.l.Target).trim();
                console.log(`parseCosmeticExcelFile: Found hyperlink at ${cellAddress} in sheet ${sheetName}: ${url}`);
                
                // Validate URL
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                  invalidUrls.push(`Sheet "${sheetName}", Row ${row + 1}: URL must start with http:// or https:// - ${url}`);
                  console.log(`parseCosmeticExcelFile: Invalid protocol at ${cellAddress}: ${url}`);
                  return;
                }
                
                // Validate URL format
                try {
                  new URL(url);
                  allUrls.push(url);
                  console.log(`parseCosmeticExcelFile: Valid URL found at ${cellAddress}: ${url}`);
                } catch {
                  invalidUrls.push(`Sheet "${sheetName}", Row ${row + 1}: Invalid URL format - ${url}`);
                  console.log(`parseCosmeticExcelFile: Invalid URL format at ${cellAddress}: ${url}`);
                }
              }
            });
          }
        });
        
        console.log('parseCosmeticExcelFile: Parsing complete. Valid URLs:', allUrls.length, 'Invalid URLs:', invalidUrls.length, 'Place columns found:', totalPlaceColumnsFound);
        
        if (totalPlaceColumnsFound === 0) {
          reject(new Error('No columns with a header containing \'Place\' were found.'));
          return;
        }
        
        if (allUrls.length === 0 && invalidUrls.length === 0) {
          reject(new Error('No image links detected in \'Place\' columns.'));
          return;
        }
        
        resolve({
          urls: allUrls,
          invalidUrls,
          totalUrls: allUrls.length + invalidUrls.length
        });
      } catch (error) {
        console.error('parseCosmeticExcelFile: Error during parsing:', error);
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = (error) => {
      console.error('parseCosmeticExcelFile: FileReader error:', error);
      reject(new Error('Failed to read Excel file'));
    };
    
    console.log('parseCosmeticExcelFile: Starting to read file as ArrayBuffer');
    reader.readAsArrayBuffer(file);
  });
};
