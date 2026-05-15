import { createRequire } from "node:module";
import type { TDocumentDefinitions } from "pdfmake/interfaces.js";
import { parseJsonConfig } from "./api-utils.js";

type PdfData = Record<string, unknown>;

const fonts = {
  Roboto: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const require = createRequire(import.meta.url);
const PrinterModule = require("pdfmake/js/Printer.js");
const PdfPrinterCtor = (PrinterModule.default?.default ||
  PrinterModule.default ||
  PrinterModule) as new (fonts: any, virtualfs?: any, urlResolver?: any) => {
  createPdfKitDocument(
    definition: TDocumentDefinitions
  ): Promise<NodeJS.EventEmitter & { end(): void }>;
};

const urlResolver = {
  resolve: () => undefined,
  resolved: async () => undefined,
};

const printer = new PdfPrinterCtor(fonts, undefined, urlResolver);

const paperSizes: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 216, height: 279 },
  thermal_80mm: { width: 80, height: 200 },
};

function mmToPt(mm: number) {
  return mm * 2.835;
}

function getPath(data: PdfData, path: string) {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

function replaceBindings(text: string, data: PdfData) {
  return text
    .replace(/\{\{([\w.]+)\}\}/g, (match, field) => {
      const value = getPath(data, field);
      return value === undefined || value === null ? match : String(value);
    })
    .replace(/\$\{([\w.]+)\}/g, (match, field) => {
      const value = getPath(data, field);
      return value === undefined || value === null ? match : String(value);
    });
}

function formatCurrency(amount: unknown) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

export function numberToWords(value: unknown) {
  let num = Math.floor(Number(value || 0));
  if (num === 0) return "không đồng";

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const units = ["", "nghìn", "triệu", "tỷ"];

  function readThreeDigits(input: number) {
    const hundred = Math.floor(input / 100);
    const ten = Math.floor((input % 100) / 10);
    const one = input % 10;
    const parts: string[] = [];

    if (hundred > 0) parts.push(`${ones[hundred]} trăm`);
    if (ten > 1) {
      parts.push(`${ones[ten]} mươi`);
      if (one === 1) parts.push("mốt");
      else if (one === 5) parts.push("lăm");
      else if (one > 0) parts.push(ones[one]);
    } else if (ten === 1) {
      parts.push("mười");
      if (one === 5) parts.push("lăm");
      else if (one > 0) parts.push(ones[one]);
    } else if (one > 0) {
      if (hundred > 0) parts.push("lẻ");
      parts.push(ones[one]);
    }

    return parts.join(" ");
  }

  const groups: number[] = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  const words = groups
    .map((group, index) => {
      if (!group) return "";
      return `${readThreeDigits(group)} ${units[index]}`.trim();
    })
    .reverse()
    .filter(Boolean)
    .join(" ");

  return `${words} đồng`;
}

function fabricContent(template: any, data: PdfData) {
  const config = parseJsonConfig(template.jsonConfig ?? template.json_config);
  const objects = Array.isArray((config as any)?.objects)
    ? (config as any).objects
    : [];

  return objects
    .filter((object: any) =>
      ["textbox", "text", "i-text", "line", "rect"].includes(object.type)
    )
    .sort((a: any, b: any) => (a.top || 0) - (b.top || 0))
    .map((object: any) => {
      if (["textbox", "text", "i-text"].includes(object.type)) {
        return {
          text: replaceBindings(String(object.text || ""), data),
          fontSize: object.fontSize || 12,
          bold: object.fontWeight === "bold",
          italics: object.fontStyle === "italic",
          color: object.fill || "#111827",
          alignment: object.textAlign || "left",
          margin: [object.left || 0, Math.max(0, object.top || 0) / 8, 0, 4],
        };
      }

      if (object.type === "line") {
        return {
          canvas: [
            {
              type: "line",
              x1: object.x1 || 0,
              y1: 0,
              x2: object.x2 || object.width || 200,
              y2: 0,
              lineWidth: object.strokeWidth || 1,
              lineColor: object.stroke || "#111827",
            },
          ],
          margin: [object.left || 0, Math.max(0, object.top || 0) / 8, 0, 4],
        };
      }

      return {
        canvas: [
          {
            type: "rect",
            x: 0,
            y: 0,
            w: object.width || 100,
            h: object.height || 40,
            lineWidth: object.strokeWidth || 1,
            lineColor: object.stroke || "#111827",
          },
        ],
        margin: [object.left || 0, Math.max(0, object.top || 0) / 8, 0, 4],
      };
    });
}

function defaultContent(template: any, data: PdfData) {
  const isReceipt = (template.type || data.type) === "receipt";
  const amount = data.total_amount || data.amount || 0;

  return [
    {
      text: isReceipt ? "PHIẾU THU" : "PHIẾU CHI",
      style: "header",
      alignment: "center",
    },
    { text: "\n" },
    { text: `Số phiếu: ${data.receipt_id || data.payment_id || data.id || ""}` },
    {
      text: `Ngày: ${
        data.receipt_date ||
        data.payment_date ||
        new Date().toLocaleDateString("vi-VN")
      }`,
    },
    { text: "\n" },
    {
      text: isReceipt
        ? `Học viên: ${data.student_name || ""}`
        : `Người nhận: ${data.recipient_name || ""}`,
    },
    ...(isReceipt ? [{ text: `Tháng: ${data.month || ""}` }] : []),
    { text: `Số tiền: ${formatCurrency(amount)}` },
    { text: `Bằng chữ: ${data.amount_in_words || numberToWords(amount)}` },
    { text: `Nội dung: ${data.notes || (isReceipt ? "Học phí" : "")}` },
    { text: "\n\n" },
    {
      columns: isReceipt
        ? [
            { text: "Người nộp tiền\n\n\n\n_______________", alignment: "center" },
            { text: "Người thu tiền\n\n\n\n_______________", alignment: "center" },
          ]
        : [
            { text: "Người nhận tiền\n\n\n\n_______________", alignment: "center" },
            { text: "Người chi tiền\n\n\n\n_______________", alignment: "center" },
          ],
    },
  ];
}

export async function generatePdf(template: any, data: PdfData = {}) {
  const paper =
    paperSizes[String(template.paperSize || template.paper_size || "a4")] ||
    paperSizes.a4;
  const isLandscape = (template.orientation || "portrait") === "landscape";
  const width = isLandscape ? paper.height : paper.width;
  const height = isLandscape ? paper.width : paper.height;
  const content = fabricContent(template, data);

  const definition: TDocumentDefinitions = {
    pageSize: { width: mmToPt(width), height: mmToPt(height) },
    pageOrientation: isLandscape ? "landscape" : "portrait",
    pageMargins: [mmToPt(15), mmToPt(15), mmToPt(15), mmToPt(15)],
    content: content.length ? (content as any) : (defaultContent(template, data) as any),
    styles: {
      header: { fontSize: 18, bold: true },
    },
    defaultStyle: {
      font: "Roboto",
      fontSize: 12,
    },
  };

  const pdfDoc = await printer.createPdfKitDocument(definition);

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDoc.on("error", reject);
      pdfDoc.end();
    } catch (error) {
      reject(error);
    }
  });
}
