import { createRequire } from "node:module";
import type { TDocumentDefinitions } from "pdfmake/interfaces.js";
import { parseJsonConfig } from "./api-utils.js";

type PdfData = Record<string, unknown>;

const require = createRequire(import.meta.url);
const vfsFonts = require("pdfmake/build/vfs_fonts.js");
const pdfMakeVfs =
  vfsFonts.pdfMake?.vfs ||
  vfsFonts.default?.pdfMake?.vfs ||
  vfsFonts.default ||
  vfsFonts;
const virtualFileSystem = {
  existsSync(filename: string) {
    return typeof pdfMakeVfs[filename] === "string";
  },
  readFileSync(filename: string) {
    return Buffer.from(pdfMakeVfs[filename], "base64");
  },
};

const fonts = {
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
};

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

const printer = new PdfPrinterCtor(fonts, virtualFileSystem, urlResolver);

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

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function colorValue(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value === "transparent") {
    return undefined;
  }

  const color = value.trim();
  const rgba = color.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9.]+))?\s*\)$/i
  );
  if (!rgba) return color;

  const alpha = rgba[4] === undefined ? 1 : Number(rgba[4]);
  if (!Number.isFinite(alpha) || alpha <= 0) return undefined;
  const hex = [rgba[1], rgba[2], rgba[3]]
    .map((part) =>
      Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, "0")
    )
    .join("");
  return `#${hex}`;
}

function isSupportedBase64ImageDataUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value
    .trim()
    .match(/^data:image\/(png|jpe?g);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return false;

  const bytes = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (match[1].toLowerCase() === "png") {
    return (
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }

  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function objectMargin(object: any) {
  return [
    numberValue(object.left),
    Math.max(0, numberValue(object.top)) / 8,
    0,
    4,
  ];
}

function scaled(value: unknown, scale: unknown, fallback = 0) {
  return numberValue(value, fallback) * numberValue(scale, 1);
}

function flattenFabricObjects(
  objects: any[],
  offsetLeft = 0,
  offsetTop = 0
): any[] {
  return objects.flatMap((object) => {
    if (!object || typeof object !== "object" || object.visible === false) {
      return [];
    }

    const left = offsetLeft + numberValue(object.left);
    const top = offsetTop + numberValue(object.top);
    const children = Array.isArray(object.objects)
      ? object.objects
      : Array.isArray(object._objects)
        ? object._objects
        : null;

    if (object.type === "group" && children) {
      const hasCenteredChildren = children.some(
        (child: any) =>
          numberValue(child?.left) < 0 || numberValue(child?.top) < 0
      );
      const childLeft =
        left + (hasCenteredChildren ? scaled(object.width, object.scaleX) / 2 : 0);
      const childTop =
        top + (hasCenteredChildren ? scaled(object.height, object.scaleY) / 2 : 0);
      return flattenFabricObjects(children, childLeft, childTop);
    }

    return [{ ...object, left, top }];
  });
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

  return flattenFabricObjects(objects)
    .sort(
      (a: any, b: any) =>
        numberValue(a.top) - numberValue(b.top) ||
        numberValue(a.left) - numberValue(b.left)
    )
    .flatMap<any>((object: any) => {
      if (["textbox", "text", "i-text"].includes(object.type)) {
        return [{
          text: replaceBindings(String(object.text || ""), data),
          fontSize: object.fontSize || 12,
          bold: object.fontWeight === "bold",
          italics: object.fontStyle === "italic",
          color: colorValue(object.fill) || "#111827",
          alignment: object.textAlign || "left",
          margin: objectMargin(object),
        }];
      }

      if (object.type === "image") {
        const image =
          object.src || object.imageUrl || object.crossOriginUrl || object.url;
        if (!isSupportedBase64ImageDataUrl(image)) return [];
        return [{
          image: image.trim(),
          width: scaled(object.width, object.scaleX, 40),
          height: scaled(object.height, object.scaleY, 40),
          margin: objectMargin(object),
        }];
      }

      if (object.type === "line") {
        return [{
          canvas: [
            {
              type: "line",
              x1: object.x1 || 0,
              y1: object.y1 || 0,
              x2: object.x2 || object.width || 200,
              y2: object.y2 || 0,
              lineWidth: object.strokeWidth || 1,
              lineColor: colorValue(object.stroke) || "#111827",
            },
          ],
          margin: objectMargin(object),
        }];
      }

      if (object.type === "rect") {
        return [{
          canvas: [
            {
              type: "rect",
              x: 0,
              y: 0,
              w: scaled(object.width, object.scaleX, 100),
              h: scaled(object.height, object.scaleY, 40),
              r: object.rx || object.ry || object.radius || 0,
              lineWidth: object.strokeWidth || 1,
              lineColor: colorValue(object.stroke) || "#111827",
              color: colorValue(object.fill),
            },
          ],
          margin: objectMargin(object),
        }];
      }

      if (["circle", "ellipse"].includes(object.type)) {
        const radius = numberValue(object.radius);
        return [{
          canvas: [
            {
              type: "ellipse",
              x: scaled(object.rx || radius, object.scaleX, radius || 20),
              y: scaled(object.ry || radius, object.scaleY, radius || 20),
              r1: scaled(object.rx || radius, object.scaleX, radius || 20),
              r2: scaled(object.ry || radius, object.scaleY, radius || 20),
              lineWidth: object.strokeWidth || 1,
              lineColor: colorValue(object.stroke) || "#111827",
              color: colorValue(object.fill),
            },
          ],
          margin: objectMargin(object),
        }];
      }

      return [];
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
  const content = (() => {
    try {
      return fabricContent(template, data);
    } catch {
      return [];
    }
  })();

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

  let pdfDoc;
  try {
    pdfDoc = await printer.createPdfKitDocument(definition);
  } catch (error) {
    if (!content.length) throw error;
    definition.content = defaultContent(template, data) as any;
    pdfDoc = await printer.createPdfKitDocument(definition);
  }

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
