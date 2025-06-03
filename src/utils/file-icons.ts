import { 
  FiFile, 
  FiFileText, 
  FiImage, 
  FiFilm, 
  FiMusic, 
  FiArchive,
  FiCode,
  FiTable
} from 'react-icons/fi';
import { IconType } from 'react-icons';

export interface FileTypeInfo {
  icon: IconType;
  color: string;
  category: string;
}

export const getFileTypeInfo = (fileName: string, mimeType?: string): FileTypeInfo => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // PDF files
  if (extension === 'pdf' || mimeType?.includes('pdf')) {
    return {
      icon: FiFileText,
      color: '#e74c3c',
      category: 'Document'
    };
  }
  
  // Word documents
  if (['doc', 'docx'].includes(extension) || mimeType?.includes('word')) {
    return {
      icon: FiFileText,
      color: '#2980b9',
      category: 'Document'
    };
  }
  
  // Excel/Spreadsheets
  if (['xls', 'xlsx', 'csv'].includes(extension) || mimeType?.includes('spreadsheet')) {
    return {
      icon: FiTable,
      color: '#27ae60',
      category: 'Spreadsheet'
    };
  }
  
  // PowerPoint
  if (['ppt', 'pptx'].includes(extension) || mimeType?.includes('presentation')) {
    return {
      icon: FiFilm,
      color: '#e67e22',
      category: 'Presentation'
    };
  }
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension) || mimeType?.startsWith('image/')) {
    return {
      icon: FiImage,
      color: '#9b59b6',
      category: 'Image'
    };
  }
  
  // Videos
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension) || mimeType?.startsWith('video/')) {
    return {
      icon: FiFilm,
      color: '#34495e',
      category: 'Video'
    };
  }
  
  // Audio
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension) || mimeType?.startsWith('audio/')) {
    return {
      icon: FiMusic,
      color: '#f39c12',
      category: 'Audio'
    };
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return {
      icon: FiArchive,
      color: '#7f8c8d',
      category: 'Archive'
    };
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'py', 'java', 'cpp', 'c', 'php'].includes(extension)) {
    return {
      icon: FiCode,
      color: '#2c3e50',
      category: 'Code'
    };
  }
  
  // Text files
  if (['txt', 'md', 'rtf'].includes(extension) || mimeType?.startsWith('text/')) {
    return {
      icon: FiFileText,
      color: '#95a5a6',
      category: 'Text'
    };
  }
  
  // Default file type
  return {
    icon: FiFile,
    color: '#bdc3c7',
    category: 'File'
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const truncateFileName = (fileName: string, maxLength: number = 25): string => {
  if (fileName.length <= maxLength) return fileName;
  
  const extension = fileName.split('.').pop();
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
  
  if (extension) {
    const maxNameLength = maxLength - extension.length - 4; // 4 for "..." and "."
    return `${nameWithoutExt.substring(0, maxNameLength)}...${extension}`;
  }
  
  return `${fileName.substring(0, maxLength - 3)}...`;
};