import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker to unpkg/cdnjs CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface FileExtractionResult {
  success: boolean;
  text: string;
  fileName: string;
  fileType: string;
  fileSizeFormatted: string;
  charCount: number;
  warning?: string;
  error?: string;
}

/**
 * Formats byte size to human readable KB / MB string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Client-side parser for DOCX, PDF, TXT, and MD files.
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: (status: string) => void
): Promise<FileExtractionResult> {
  const fileName = file.name;
  const fileSizeFormatted = formatFileSize(file.size);
  const ext = fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();

  let fileType = ext.toUpperCase();
  if (fileType === 'DOCX' || file.type.includes('word')) fileType = 'DOCX';
  else if (fileType === 'PDF' || file.type.includes('pdf')) fileType = 'PDF';
  else if (fileType === 'MD' || ext === 'markdown') fileType = 'MD';
  else if (fileType === 'TXT' || file.type.includes('text')) fileType = 'TXT';

  if (!['DOCX', 'PDF', 'TXT', 'MD'].includes(fileType)) {
    return {
      success: false,
      text: '',
      fileName,
      fileType,
      fileSizeFormatted,
      charCount: 0,
      error: `Định dạng tệp .${ext} không được hỗ trợ. Vui lòng tải lên tệp DOCX, PDF, TXT hoặc MD.`,
    };
  }

  if (file.size === 0) {
    return {
      success: false,
      text: '',
      fileName,
      fileType,
      fileSizeFormatted,
      charCount: 0,
      error: 'Tệp tải lên bị rỗng (0 KB). Vui lòng chọn tệp khác.',
    };
  }

  try {
    onProgress?.('Đang đọc tài liệu...');
    let extractedText = '';

    if (fileType === 'DOCX') {
      onProgress?.('Đang trích xuất nội dung từ tệp DOCX...');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value ? result.value.trim() : '';
    } else if (fileType === 'PDF') {
      onProgress?.('Đang trích xuất nội dung từ tệp PDF...');
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;

      if (pdf.numPages === 0) {
        throw new Error('Tệp PDF không chứa trang nào.');
      }

      const pageTexts: string[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        onProgress?.(`Đang đọc PDF: Trang ${pageNum} / ${pdf.numPages}...`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageStr = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ')
          .trim();

        if (pageStr) {
          pageTexts.push(`--- Trang ${pageNum} ---\n${pageStr}`);
        }
      }
      extractedText = pageTexts.join('\n\n');
    } else {
      // TXT / MD
      onProgress?.('Đang trích xuất nội dung văn bản...');
      extractedText = (await file.text()).trim();
    }

    const charCount = extractedText.length;

    if (!extractedText || charCount === 0) {
      return {
        success: false,
        text: '',
        fileName,
        fileType,
        fileSizeFormatted,
        charCount: 0,
        error: 'Tệp không chứa văn bản có thể trích xuất được.',
      };
    }

    let warning: string | undefined = undefined;
    if (charCount < 20) {
      warning = 'Không trích xuất được nội dung có ý nghĩa từ tài liệu (quá ít ký tự).';
    }

    onProgress?.('Đã trích xuất xong nội dung.');

    return {
      success: true,
      text: extractedText,
      fileName,
      fileType,
      fileSizeFormatted,
      charCount,
      warning,
    };
  } catch (err: any) {
    console.error('Lỗi trích xuất tệp:', err);
    return {
      success: false,
      text: '',
      fileName,
      fileType,
      fileSizeFormatted,
      charCount: 0,
      error: `Lỗi đọc tệp ${fileName}: ${err?.message || 'Không thể đọc tệp này. Tệp có thể bị hỏng hoặc có mật khẩu mã hóa.'}`,
    };
  }
}
