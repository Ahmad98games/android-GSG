import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';

/**
 * SOVEREIGN THERMAL LABEL ENGINE (v7.1)
 * Industrial-grade label generation with bitmap QR encoding.
 */

export class ThermalEngine {
  /**
   * Generates a high-contrast Bitmap QR Code Data URL.
   * Required for thermal printers (vector SVGs often fail).
   */
  static async generateQRBitmap(url: string): Promise<string> {
    try {
      return await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });
    } catch (e) {
      console.error('❌ THERMAL_ENGINE: QR_GEN_ERROR', e);
      throw e;
    }
  }

  /**
   * Merges multiple PDF label buffers into a single print-ready PDF.
   * Enables one-click bulk printing for batches and inventory.
   */
  static async mergeLabels(pdfBuffers: ArrayBuffer[]): Promise<Uint8Array> {
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const buffer of pdfBuffers) {
        const donorPdf = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(
          donorPdf, 
          donorPdf.getPageIndices()
        );
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      return await mergedPdf.save();
    } catch (e) {
      console.error('❌ THERMAL_ENGINE: MERGE_ERROR', e);
      throw e;
    }
  }

  /**
   * Construct the Sovereign Scan URL
   */
  static getScanUrl(type: 'item' | 'batch' | 'job', code: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gold-she-erp.vercel.app';
    return `${baseUrl}/${type}/${code}`;
  }
}
