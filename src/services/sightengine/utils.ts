
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};
