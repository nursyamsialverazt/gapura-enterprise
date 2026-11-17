declare module 'html-to-image' {
  export function toPng(node: HTMLElement, options?: any): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: any): Promise<string>;
  export function toBlob(node: HTMLElement, options?: any): Promise<Blob | null>;
  export function toPixelData(node: HTMLElement, options?: any): Promise<Uint8ClampedArray>;
  export function toSvg(node: HTMLElement, options?: any): Promise<string>;
  export function getFontEmbedCSS(node: HTMLElement, options?: any): Promise<string>;
}

declare module 'jspdf' {
  export class jsPDF {
    constructor(options?: any);
    internal: any;
    addImage(...args: any[]): this;
    addPage(...args: any[]): this;
    save(filename?: string): void;
    output(type?: string, options?: any): any;
    text(text: string | string[], x: number, y: number, options?: any, transform?: any): this;
    line(x1: number, y1: number, x2: number, y2: number, style?: string): this;
    rect(x: number, y: number, w: number, h: number, style?: string): this;
    setFillColor(r: number, g?: number, b?: number, a?: number): this;
    setTextColor(r: number, g?: number, b?: number, a?: number): this;
    setDrawColor(r: number, g?: number, b?: number, a?: number): this;
    setFontSize(size: number): this;
    setFont(fontName: string, fontStyle?: string): this;
    getImageProperties(imageData: any): { width: number; height: number };
  }
}

declare module 'jspdf-autotable' {
  export default function autoTable(doc: any, options: any): void;
}
