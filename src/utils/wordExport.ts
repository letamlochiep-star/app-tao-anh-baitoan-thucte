import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  ImageRun
} from 'docx';
import saveAs from 'file-saver';
import JSZip from 'jszip';
import { ProblemItem, WordExportOptions } from '../types';
import { BRANDING_DEFAULT } from '../constants';
import { convertSvgToPngDataUrl } from './imageUtils';

export const DEFAULT_WORD_EXPORT_OPTIONS: WordExportOptions = {
  documentTitle: '10 BÀI TOÁN THỰC TẾ VÀ LỜI GIẢI CHI TIẾT',
  subject: 'Toán học',
  grade: 'Lớp 9 / THCS',
  topic: 'Giải bài toán bằng cách lập phương trình',
  authorName: 'Giáo viên Toán',
  workUnit: 'Trường THCS & THPT',
  includeCoverPage: true,
  includeTOC: false,
  exportMode: 'full',
  oneQuestionPerPage: false,
  hideAnswers: false,
  hideSolutions: false,
  includeTikZ: true,
  includeImagePrompts: true,
  includeRawLatex: true,
  includeCommonMistakes: true,
  includeBranding: true,
  insertGeneratedImages: true,
  insertImagePlaceholders: true,
};

/**
 * Removes control characters (\x00-\x08, \x0B, \x0C, \x0E-\x1F) that invalidate OpenXML document parsing in Word.
 */
export function sanitizeText(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * Sanitizes and normalizes document filename for Word download.
 */
export function sanitizeDocxFileName(title?: string): string {
  if (!title || !title.trim()) return 'tai_lieu_giao_vien.docx';

  let clean = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+|\.+$/g, '');

  if (!clean) clean = 'tai_lieu_giao_vien';

  if (clean.toLowerCase().endsWith('.docx')) {
    clean = clean.slice(0, -5);
  }

  return `${clean}.docx`;
}

/**
 * Validates the generated DOCX blob using JSZip to confirm OpenXML schema compliance.
 */
export async function validateDocxBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 1000) {
    throw new Error('Tệp Word rỗng hoặc chưa được đóng gói hoàn chỉnh (kích thước quá nhỏ).');
  }

  const zip = await JSZip.loadAsync(blob);

  const requiredFiles = [
    '[Content_Types].xml',
    '_rels/.rels',
    'word/document.xml'
  ];

  for (const path of requiredFiles) {
    if (!zip.file(path)) {
      throw new Error(`Tệp DOCX thiếu thành phần bắt buộc: ${path}`);
    }
  }

  return true;
}

/**
 * Converts a base64 string to a Uint8Array safely.
 */
function base64ToUint8Array(base64: string): Uint8Array | null {
  try {
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    if (!cleanBase64 || cleanBase64.length < 10) return null;
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    return null;
  }
}

/**
 * Validates whether binary image bytes correspond to a valid PNG or JPEG bitmap.
 */
function getImageDetails(bytes: Uint8Array | null): { valid: boolean; type: 'png' | 'jpg' } {
  if (!bytes || bytes.length < 8) return { valid: false, type: 'png' };
  // Check PNG magic bytes: 0x89, 0x50, 0x4E, 0x47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x37) {
    return { valid: true, type: 'png' };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return { valid: true, type: 'png' };
  }
  // Check JPG magic bytes: 0xFF, 0xD8, 0xFF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { valid: true, type: 'jpg' };
  }
  return { valid: false, type: 'png' };
}

/**
 * Helper to parse bold (**...**) and italic (*...*) text into TextRuns safely.
 */
function parseFormattedTextRuns(text: string, baseFont = 'Times New Roman', baseSize = 26, baseColor = '0F172A'): TextRun[] {
  const sanitized = sanitizeText(text);
  if (!sanitized) return [new TextRun({ text: ' ', font: baseFont, size: baseSize, color: baseColor })];

  // Regex to match bold **...** or italic *...*
  const parts = sanitized.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  const runs: TextRun[] = [];

  parts.forEach((part) => {
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      runs.push(
        new TextRun({
          text: part.slice(2, -2),
          bold: true,
          font: baseFont,
          size: baseSize,
          color: baseColor,
        })
      );
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      runs.push(
        new TextRun({
          text: part.slice(1, -1),
          italics: true,
          font: baseFont,
          size: baseSize,
          color: baseColor,
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: part,
          font: baseFont,
          size: baseSize,
          color: baseColor,
        })
      );
    }
  });

  return runs.length > 0 ? runs : [new TextRun({ text: sanitized, font: baseFont, size: baseSize, color: baseColor })];
}

/**
 * Converts Markdown text (including markdown tables, headings, and bullet points) to docx elements.
 */
function convertMarkdownToDocxElements(markdownText: string): (Paragraph | Table)[] {
  const sanitized = sanitizeText(markdownText);
  if (!sanitized) return [];

  const lines = sanitized.split('\n');
  const elements: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Check if line is start of a Markdown table (e.g. | Col1 | Col2 |)
    if (line.startsWith('|') && line.endsWith('|') && line.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length > 0) {
        // Filter out separator lines like |---|---|
        const validRows = tableLines.filter((l) => !l.match(/^\|[\s:-|-]+\|$/));
        if (validRows.length > 0) {
          const tableRows: TableRow[] = validRows.map((rowStr, rowIdx) => {
            const cellsText = rowStr
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim());

            const cells: TableCell[] = cellsText.map((cellText) => {
              return new TableCell({
                children: [
                  new Paragraph({
                    children: parseFormattedTextRuns(
                      cellText,
                      'Times New Roman',
                      rowIdx === 0 ? 22 : 20,
                      rowIdx === 0 ? '1E3A8A' : '1E293B'
                    ),
                    spacing: { before: 60, after: 60 },
                  }),
                ],
                shading: rowIdx === 0 ? { fill: 'E2E8F0' } : undefined,
                margins: { top: 100, bottom: 100, left: 140, right: 140 },
              });
            });

            return new TableRow({ children: cells });
          });

          elements.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
                insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
              },
              rows: tableRows,
            })
          );
        }
      }
      continue;
    }

    // Check headings
    if (line.startsWith('# ')) {
      elements.push(
        new Paragraph({
          children: parseFormattedTextRuns(line.substring(2), 'Times New Roman', 28, '1E3A8A'),
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        new Paragraph({
          children: parseFormattedTextRuns(line.substring(3), 'Times New Roman', 26, '0F766E'),
          spacing: { before: 160, after: 80 },
        })
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        new Paragraph({
          children: parseFormattedTextRuns(line.substring(4), 'Times New Roman', 24, '1E293B'),
          spacing: { before: 120, after: 60 },
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      const content = line.substring(2).trim();
      elements.push(
        new Paragraph({
          children: parseFormattedTextRuns(content, 'Times New Roman', 26, '0F172A'),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
    } else if (line.length > 0) {
      elements.push(
        new Paragraph({
          children: parseFormattedTextRuns(line, 'Times New Roman', 26, '0F172A'),
          spacing: { after: 100 },
        })
      );
    }

    i++;
  }

  return elements;
}

/**
 * Creates a clean callout box table for code/formula blocks.
 */
function createCodeBoxTable(
  title: string,
  content: string,
  borderColor: string = '2563EB',
  bgColor: string = 'F8FAFC'
): Table {
  const sanitized = sanitizeText(content);
  const lines = sanitized.split('\n');

  const cellParagraphs: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: sanitizeText(title).toUpperCase(),
          bold: true,
          font: 'Times New Roman',
          size: 20, // 10pt
          color: borderColor,
        }),
      ],
      spacing: { before: 60, after: 80 },
    }),
  ];

  lines.forEach((line) => {
    cellParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: sanitizeText(line) || ' ',
            font: 'Consolas',
            size: 18, // 9pt
            color: '1E293B',
          }),
        ],
        spacing: { after: 30 },
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.SINGLE, size: 24, color: borderColor },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: cellParagraphs,
            shading: { fill: bgColor },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ],
  });
}

/**
 * Creates a standard placeholder table for missing/pending images.
 */
function createImagePlaceholderTable(qNum: number, p: ProblemItem): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.DASHED, size: 8, color: '94A3B8' },
      bottom: { style: BorderStyle.DASHED, size: 8, color: '94A3B8' },
      left: { style: BorderStyle.DASHED, size: 8, color: '94A3B8' },
      right: { style: BorderStyle.DASHED, size: 8, color: '94A3B8' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[ KHUNG HÌNH MINH HỌA CÂU ${qNum} ]`,
                    bold: true,
                    font: 'Times New Roman',
                    size: 20,
                    color: '334155',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 140, after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: sanitizeText(p.imageTitle || 'Hình ảnh minh họa cho bài toán thực tế'),
                    italics: true,
                    font: 'Times New Roman',
                    size: 18,
                    color: '64748B',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 140 },
              }),
            ],
            shading: { fill: 'F8FAFC' },
            margins: { top: 140, bottom: 140, left: 140, right: 140 },
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ],
  });
}

export async function exportQuickWord(problems: ProblemItem[]) {
  return exportToWord(problems, DEFAULT_WORD_EXPORT_OPTIONS);
}

export async function exportToWord(
  problems: ProblemItem[],
  options: WordExportOptions
) {
  if (!problems || problems.length === 0) {
    throw new Error('Không có danh sách bài toán để xuất bản Word.');
  }

  const children: any[] = [];

  // ==========================================
  // 1. TRANG BÌA TÀI LIỆU (COVER PAGE)
  // ==========================================
  if (options.includeCoverPage) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: sanitizeText(options.workUnit || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO - TRƯỜNG THCS & THPT'),
            bold: true,
            font: 'Times New Roman',
            size: 22, // 11pt
            color: '1E293B',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'TỔ TOÁN HỌC - NGÂN HÀNG ĐỀ THI & BÀI TẬP THỰC TẾ 4.0',
            bold: true,
            font: 'Times New Roman',
            size: 20, // 10pt
            color: '475569',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: '────────────────────────────────────────',
            color: 'CBD5E1',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: sanitizeText(options.documentTitle || '10 BÀI TOÁN THỰC TẾ VÀ LỜI GIẢI CHI TIẾT').toUpperCase(),
            bold: true,
            font: 'Times New Roman',
            size: 32, // 16pt
            color: '1E3A8A',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Môn học: ${sanitizeText(options.subject || 'Toán học')}`,
            bold: true,
            font: 'Times New Roman',
            size: 24, // 12pt
            color: '334155',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Chủ đề: ${sanitizeText(options.topic || 'Giải bài toán bằng cách lập phương trình / hệ phương trình')}`,
            italics: true,
            font: 'Times New Roman',
            size: 22, // 11pt
            color: '475569',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Đối tượng: ${sanitizeText(options.grade || 'Học sinh THCS / THPT')}`,
            font: 'Times New Roman',
            size: 22,
            color: '475569',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
      new Table({
        width: { size: 80, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 12, color: '1E3A8A' },
          bottom: { style: BorderStyle.SINGLE, size: 12, color: '1E3A8A' },
          left: { style: BorderStyle.SINGLE, size: 12, color: '1E3A8A' },
          right: { style: BorderStyle.SINGLE, size: 12, color: '1E3A8A' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Giáo viên biên soạn: ', bold: true, font: 'Times New Roman', size: 22 }),
                      new TextRun({ text: sanitizeText(options.authorName || 'Thầy Tâm'), font: 'Times New Roman', size: 22 }),
                    ],
                    spacing: { before: 120, after: 60 },
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Đơn vị công tác: ', bold: true, font: 'Times New Roman', size: 22 }),
                      new TextRun({ text: sanitizeText(options.workUnit || 'Trường THCS & THPT'), font: 'Times New Roman', size: 22 }),
                    ],
                    spacing: { after: 60 },
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Ngày tạo tài liệu: ', bold: true, font: 'Times New Roman', size: 22 }),
                      new TextRun({ text: new Date().toLocaleDateString('vi-VN'), font: 'Times New Roman', size: 22 }),
                    ],
                    spacing: { after: 120 },
                  }),
                ],
                shading: { fill: 'F8FAFC' },
                margins: { top: 140, bottom: 140, left: 200, right: 200 },
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: BRANDING_DEFAULT,
            bold: true,
            font: 'Times New Roman',
            color: '1E40AF',
            size: 20,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1000, after: 200 },
      }),
      new PageBreak()
    );
  }

  // ==========================================
  // 2. HEADER TÀI LIỆU CHÍNH
  // ==========================================
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 150 },
      children: [
        new TextRun({
          text: sanitizeText(options.documentTitle || '10 BÀI TOÁN THỰC TẾ CHUẨN CÓ LỜI GIẢI CHI TIẾT & MÃ LATEX').toUpperCase(),
          bold: true,
          font: 'Times New Roman',
          size: 28, // 14pt
          color: '1E3A8A',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `(Tài liệu biên soạn kèm mã công thức LaTeX chuẩn, hình ảnh minh họa và hướng dẫn giải từng bước)`,
          italics: true,
          font: 'Times New Roman',
          size: 22,
          color: '475569',
        }),
      ],
    })
  );

  // Take up to 10 items
  const itemsToExport = problems.slice(0, 10);

  for (let index = 0; index < itemsToExport.length; index++) {
    const p = itemsToExport[index];
    const qNum = index + 1;

    if (options.oneQuestionPerPage && index > 0) {
      children.push(new PageBreak());
    }

    // Question Header Block
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `CÂU ${qNum}: ${sanitizeText(p.title || `Bài toán thực tế số ${qNum}`)}`,
            bold: true,
            font: 'Times New Roman',
            size: 26, // 13pt
            color: '1E3A8A',
          }),
        ],
        spacing: { before: 240, after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: '• Ngữ cảnh thực tế: ', bold: true, font: 'Times New Roman', color: '1E293B', size: 22 }),
          new TextRun({ text: `${sanitizeText(p.context || 'Thực tế')}   `, font: 'Times New Roman', size: 22 }),
          new TextRun({ text: '• Mức độ: ', bold: true, font: 'Times New Roman', color: '1E293B', size: 22 }),
          new TextRun({ text: `${sanitizeText(p.difficulty || 'Vận dụng')}   `, font: 'Times New Roman', size: 22 }),
          new TextRun({ text: '• Dạng bài: ', bold: true, font: 'Times New Roman', color: '1E293B', size: 22 }),
          new TextRun({ text: `${sanitizeText(p.questionType || 'Tự luận')}`, font: 'Times New Roman', size: 22 }),
        ],
        spacing: { after: 150 },
      })
    );

    // 1. NỘI DUNG ĐỀ BÀI
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '1. NỘI DUNG ĐỀ BÀI (VĂN BẢN ĐẦY ĐỦ)',
            bold: true,
            font: 'Times New Roman',
            color: '0F766E',
            size: 22,
          }),
        ],
        spacing: { before: 120, after: 80 },
      })
    );

    // Convert markdown in problemText
    const problemElements = convertMarkdownToDocxElements(p.problemText);
    children.push(...problemElements);

    // Answer Options if Multiple Choice
    if (p.answerOptions && p.answerOptions.length > 0) {
      p.answerOptions.forEach((opt, optIdx) => {
        const labels = ['A', 'B', 'C', 'D', 'E'];
        const label = labels[optIdx] || `${optIdx + 1}`;
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${label}. `, bold: true, font: 'Times New Roman', size: 26 }),
              new TextRun({ text: sanitizeText(opt), font: 'Times New Roman', size: 26 }),
            ],
            indent: { left: 360 },
            spacing: { after: 60 },
          })
        );
      });
    }

    // 2. MÃ CÔNG THỨC TOÁN LATEX
    if (options.includeRawLatex && (p.latexProblemText || (p.latexFormulas && p.latexFormulas.length > 0))) {
      const rawLatexText = p.latexProblemText || p.latexFormulas?.join('\n') || '';
      children.push(
        createCodeBoxTable(
          '2. MÃ LATEX CÔNG THỨC TOÁN HỌC (DÙNG CHO MATHTYPE / OVERLEAF)',
          rawLatexText,
          '7C3AED',
          'F9F5FF'
        ),
        new Paragraph({ text: '', spacing: { after: 120 } })
      );
    }

    // 3. HÌNH ÁNH MINH HỌA
    if (options.exportMode === 'full' || options.exportMode === 'questions_images') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `3. HÌNH ÁNH MINH HỌA NỘI DUNG CÂU ${qNum}`,
              bold: true,
              font: 'Times New Roman',
              color: '1E40AF',
              size: 22,
            }),
          ],
          spacing: { before: 120, after: 100 },
        })
      );

      let imageInserted = false;
      if (p.generatedImageDataUrl && options.insertGeneratedImages) {
        try {
          const pngDataUrl = await convertSvgToPngDataUrl(p.generatedImageDataUrl);
          if (pngDataUrl) {
            const imageBytes = base64ToUint8Array(pngDataUrl);
            const imgDetails = getImageDetails(imageBytes);

            if (imageBytes && imgDetails.valid) {
              children.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageBytes,
                      transformation: {
                        width: 440,
                        height: 240,
                      },
                      type: imgDetails.type,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 100, after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Hình minh họa Câu ${qNum}: ${sanitizeText(p.imageTitle || p.title)}`,
                      italics: true,
                      font: 'Times New Roman',
                      size: 18,
                      color: '475569',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 140 },
                })
              );
              imageInserted = true;
            }
          }
        } catch (e) {
          console.error('Error inserting image in docx:', e);
        }
      }

      if (!imageInserted && options.insertImagePlaceholders) {
        children.push(
          createImagePlaceholderTable(qNum, p),
          new Paragraph({ text: '', spacing: { after: 120 } })
        );
      }
    }

    // 4. CÂU LỆNH TẠO ẢNH (IMAGE PROMPT)
    if (options.includeImagePrompts && p.imagePrompt) {
      const promptText = `Prompt: ${p.imagePrompt}\nNegative Prompt: ${p.negativePrompt || 'No watermark, no text, realistic, high resolution'}`;
      children.push(
        createCodeBoxTable('4. CÂU LỆNH PROMPT TẠO ẢNH (MIDJOURNEY / GEMINI)', promptText, '0284C7', 'F0F9FF'),
        new Paragraph({ text: '', spacing: { after: 120 } })
      );
    }

    // 5. MÃ TIKZ OVERLEAF
    if (options.includeTikZ && p.tikzNeeded && p.tikzCode) {
      children.push(
        createCodeBoxTable('5. MÃ TIKZ VẼ HÌNH TRÊN OVERLEAF', p.tikzCode, '16A34A', 'F0FDF4'),
        new Paragraph({ text: '', spacing: { after: 120 } })
      );
    }

    // 6. HƯỚNG DẪN GIẢI CHI TIẾT
    if (
      !options.hideSolutions &&
      (options.exportMode === 'full' || options.exportMode === 'questions_solutions' || options.exportMode === 'questions_answers')
    ) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '6. HƯỚNG DẪN GIẢI CHI TIẾT TỪNG BƯỚC',
              bold: true,
              font: 'Times New Roman',
              color: 'B45309',
              size: 22,
            }),
          ],
          spacing: { before: 140, after: 80 },
        })
      );

      if (p.solutionSteps && p.solutionSteps.length > 0) {
        p.solutionSteps.forEach((step, sIdx) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `• Bước ${sIdx + 1}: `, bold: true, font: 'Times New Roman', color: '1E293B', size: 26 }),
              ],
              spacing: { after: 40 },
            })
          );
          const stepElements = convertMarkdownToDocxElements(step);
          children.push(...stepElements);
        });
      } else if (p.solutionSummary) {
        const summaryElements = convertMarkdownToDocxElements(p.solutionSummary);
        children.push(...summaryElements);
      }
    }

    // 7. ĐÁP SỐ CHÍNH XÁC
    if (!options.hideAnswers) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '7. ĐÁP SỐ CHÍNH XÁC: ', bold: true, font: 'Times New Roman', color: 'DC2626', size: 24 }),
            new TextRun({ text: sanitizeText(p.finalAnswer || p.correctOption), bold: true, font: 'Times New Roman', size: 24, color: 'DC2626' }),
          ],
          spacing: { before: 120, after: 80 },
        })
      );
    }

    // 8. PHƯƠNG PHÁP KIỂM TRA KẾT QUẢ
    if (p.verificationMethod) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '8. HƯỚNG DẪN KIỂM TRA KẾT QUẢ: ', bold: true, font: 'Times New Roman', color: '047857', size: 22 }),
            new TextRun({ text: sanitizeText(p.verificationMethod), font: 'Times New Roman', size: 24 }),
          ],
          spacing: { before: 80, after: 80 },
        })
      );
    }

    // 9. LỖI THƯỜNG MẮC VÀ CÁCH PHÒNG TRÁNH
    if (options.includeCommonMistakes && p.commonMistakes && p.commonMistakes.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '9. LỖI HỌC SINH THƯỜNG MẮC & CÁCH PHÒNG TRÁNH: ', bold: true, font: 'Times New Roman', color: 'C2410C', size: 22 }),
          ],
          spacing: { before: 80, after: 60 },
        })
      );

      p.commonMistakes.forEach((mistake) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '• ', bold: true, font: 'Times New Roman', color: 'C2410C', size: 24 }),
              new TextRun({ text: sanitizeText(mistake), font: 'Times New Roman', size: 24 }),
            ],
            indent: { left: 360 },
            spacing: { after: 50 },
          })
        );
      });
    }

    // Divider Line
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '─────────────────────────────────────────────────────────────',
            color: 'CBD5E1',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      })
    );
  }

  // ==========================================
  // DOCUMENT CONFIGURATION (A4, MARGINS & STYLES)
  // ==========================================
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 26, // 13pt body font
            color: '0F172A',
          },
          paragraph: {
            spacing: {
              line: 276, // 1.15 line spacing
              after: 120,
            },
            alignment: AlignmentType.BOTH,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips
              height: 16838, // A4 height in twips
            },
            margin: {
              top: 1134, // 2.0 cm
              bottom: 1134, // 2.0 cm
              left: 1417, // 2.5 cm
              right: 1134, // 2.0 cm
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: sanitizeText(options.documentTitle || 'TÀI LIỆU 10 BÀI TOÁN THỰC TẾ HỌC TẬP & GIẢI CHI TIẾT'),
                    font: 'Times New Roman',
                    size: 18,
                    italics: true,
                    color: '64748B',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 100 },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: (options.includeBranding ? BRANDING_DEFAULT : 'Tài liệu môn Toán') + ' - Trang ',
                    font: 'Times New Roman',
                    size: 18,
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Times New Roman',
                    size: 18,
                    color: '64748B',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  // Pack blob
  const blob = await Packer.toBlob(doc);

  // Validate blob integrity
  await validateDocxBlob(blob);

  // Generate safe filename
  const fileName = sanitizeDocxFileName(options.documentTitle || '10_bai_toan_thuc_te');

  // Trigger download
  saveAs(blob, fileName);

  return { success: true, fileName };
}
