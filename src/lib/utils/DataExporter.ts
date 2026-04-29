import * as XLSX from 'xlsx';

/**
 * SOVEREIGN DATA EXPORTER v9.5
 * High-performance industrial data extraction utility.
 */
export class DataExporter {
  /**
   * Export JSON data to Excel (.xlsx)
   */
  static toExcel(data: unknown[], fileName: string, sheetName: string = 'Industrial_Registry') {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${fileName}_${new Date().getTime()}.xlsx`);
      return true;
    } catch (e) {
      console.error('EXPORT_CRITICAL_FAILURE', e);
      return false;
    }
  }

  /**
   * Export JSON data to CSV
   */
  static toCSV(data: unknown[], fileName: string) {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (e) {
      console.error('CSV_EXPORT_FAILURE', e);
      return false;
    }
  }
}
