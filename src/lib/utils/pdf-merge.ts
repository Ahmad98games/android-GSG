import { PDFDocument } from 'pdf-lib';

/**
 * SOVEREIGN PDF MERGE PROTOCOL (v8.1.1)
 * Aggregates multiple PDF buffers or URLs into a single industrial document stream.
 */
export async function mergeLabelPDFs(pdfUrls: string[]): Promise<Uint8Array> {
  try {
    const mergedPdf = await PDFDocument.create();
    
    for (const url of pdfUrls) {
      // Fetch PDF bytes from Supabase Storage or external URL
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`⚠️ PDF_MERGE_WARNING: Could not fetch PDF from ${url}`);
        continue;
      }
      
      const pdfBytes = await response.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    return await mergedPdf.save();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_EXCEPTION';
    console.error('❌ PDF_MERGE_FAILURE:', message);
    throw new Error(`Failed to merge PDFs: ${message}`);
  }
}
