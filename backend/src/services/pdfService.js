import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// VI: PDF Service - Generate PDF từ template và data

const require = createRequire(import.meta.url);
const vfsFonts = require('pdfmake/build/vfs_fonts.js');
const pdfMakeVfs = vfsFonts.pdfMake?.vfs || vfsFonts.default?.pdfMake?.vfs || vfsFonts.default || vfsFonts;
const virtualFileSystem = {
  existsSync(filename) {
    return typeof pdfMakeVfs[filename] === 'string';
  },
  readFileSync(filename) {
    return Buffer.from(pdfMakeVfs[filename], 'base64');
  }
};

// Font definitions
const fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

const PrinterModule = require('pdfmake/js/Printer.js');
const PdfPrinterCtor = PrinterModule.default?.default || PrinterModule.default || PrinterModule;
const printer = new PdfPrinterCtor(fonts, virtualFileSystem);

// Convert mm to points (1mm = 2.835 points)
const mmToPt = (mm) => mm * 2.835;

// Paper size presets in mm
const paperSizes = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 216, height: 279 },
  thermal_80mm: { width: 80, height: 200 },
};

// Convert binding placeholders to actual values
function replaceBindings(text, data) {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (match, field) => {
    return data[field] !== undefined ? data[field] : match;
  });
}

// Convert Fabric.js JSON to pdfmake content
function fabricToPdfmake(fabricJson, data = {}) {
  const content = [];
  
  if (!fabricJson || !fabricJson.objects) {
    return content;
  }
  
  // Sort objects by vertical position (top)
  const sortedObjects = [...fabricJson.objects].sort((a, b) => (a.top || 0) - (b.top || 0));
  
  for (const obj of sortedObjects) {
    if (obj.type === 'textbox' || obj.type === 'text') {
      const text = replaceBindings(obj.text, data);
      const fontSize = obj.fontSize || 12;
      const isBold = obj.fontWeight === 'bold';
      const isItalic = obj.fontStyle === 'italic';
      
      content.push({
        text: text,
        fontSize: fontSize,
        bold: isBold,
        italics: isItalic,
        color: obj.fill || '#000000',
        alignment: obj.textAlign || 'left',
        margin: [obj.left || 0, obj.top || 0, 0, 5],
      });
    }
    
    if (obj.type === 'line') {
      content.push({
        canvas: [{
          type: 'line',
          x1: obj.x1 || 0,
          y1: 0,
          x2: obj.x2 || 200,
          y2: 0,
          lineWidth: obj.strokeWidth || 1,
          lineColor: obj.stroke || '#000000',
        }],
        margin: [obj.left || 0, obj.top || 0, 0, 5],
      });
    }
    
    if (obj.type === 'rect') {
      content.push({
        canvas: [{
          type: 'rect',
          x: 0,
          y: 0,
          w: obj.width || 100,
          h: obj.height || 50,
          lineWidth: obj.strokeWidth || 1,
          lineColor: obj.stroke || '#000000',
        }],
        margin: [obj.left || 0, obj.top || 0, 0, 5],
      });
    }
  }
  
  return content;
}

// Generate PDF from template
export async function generatePdf(template, data = {}) {
  const paperSize = paperSizes[template.paper_size] || paperSizes.a4;
  const isLandscape = template.orientation === 'landscape';
  
  const pageWidth = isLandscape ? paperSize.height : paperSize.width;
  const pageHeight = isLandscape ? paperSize.width : paperSize.height;
  
  // Parse template config
  let fabricJson = {};
  if (template.json_config) {
    try {
      fabricJson = typeof template.json_config === 'string' 
        ? JSON.parse(template.json_config) 
        : template.json_config;
    } catch (e) {
      console.error('Failed to parse template config:', e);
    }
  }
  
  // Convert Fabric elements to pdfmake content
  const content = fabricToPdfmake(fabricJson, data);
  
  // If no content from template, create default layout
  if (content.length === 0) {
    content.push(
      { text: template.type === 'receipt' ? 'PHIẾU THU' : 'PHIẾU CHI', style: 'header', alignment: 'center' },
      { text: '\n' },
      { text: `Số phiếu: ${data.receipt_id || data.payment_id || 'N/A'}` },
      { text: `Ngày: ${data.receipt_date || data.payment_date || new Date().toLocaleDateString('vi-VN')}` },
      { text: '\n' },
      { text: `Họ tên: ${data.student_name || data.recipient_name || 'N/A'}` },
      { text: `Lớp: ${data.class_name || 'N/A'}` },
      { text: '\n' },
      { text: `Số tiền: ${formatCurrency(data.total_amount || data.amount || 0)}` },
      { text: `Bằng chữ: ${data.amount_in_words || numberToWords(data.total_amount || data.amount || 0)}` },
      { text: '\n' },
      { text: `Nội dung: ${data.notes || 'Học phí'}` },
      { text: '\n\n' },
      {
        columns: [
          { text: 'Người nộp tiền\n\n\n\n_______________', alignment: 'center' },
          { text: 'Người thu tiền\n\n\n\n_______________', alignment: 'center' },
        ]
      }
    );
  }
  
  const docDefinition = {
    pageSize: {
      width: mmToPt(pageWidth),
      height: mmToPt(pageHeight),
    },
    pageOrientation: isLandscape ? 'landscape' : 'portrait',
    pageMargins: [mmToPt(15), mmToPt(15), mmToPt(15), mmToPt(15)],
    content: content,
    styles: {
      header: { fontSize: 18, bold: true },
      subheader: { fontSize: 14, bold: true },
      normal: { fontSize: 12 },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 12,
    },
  };
  
  const pdfDoc = await printer.createPdfKitDocument(docDefinition);
  return new Promise((resolve, reject) => {
    const chunks = [];

    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);

    pdfDoc.end();
  });
}

// Format currency VND
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Convert number to Vietnamese words
export function numberToWords(num) {
  const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
  
  if (num === 0) return 'không đồng';
  
  let words = '';
  
  if (num >= 1000000) {
    const millions = Math.floor(num / 1000000);
    words += ones[millions] + ' triệu ';
    num %= 1000000;
  }
  
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands >= 10) {
      words += tens[Math.floor(thousands / 10)];
      if (thousands % 10 > 0) {
        words += ' ' + ones[thousands % 10];
      }
    } else {
      words += ones[thousands];
    }
    words += ' nghìn ';
    num %= 1000;
  }
  
  if (num >= 100) {
    words += ones[Math.floor(num / 100)] + ' trăm ';
    num %= 100;
  }
  
  if (num >= 10) {
    words += tens[Math.floor(num / 10)] + ' ';
    num %= 10;
  }
  
  if (num > 0) {
    words += ones[num] + ' ';
  }
  
  return words.trim() + ' đồng';
}

export default { generatePdf, numberToWords, formatCurrency };
