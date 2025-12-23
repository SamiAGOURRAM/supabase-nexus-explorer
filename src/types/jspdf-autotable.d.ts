declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  export interface UserOptions {
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    startY?: number;
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
    theme?: 'striped' | 'grid' | 'plain';
    styles?: any;
    headStyles?: any;
    bodyStyles?: any;
    footStyles?: any;
    alternateRowStyles?: any;
    columnStyles?: { [key: number]: any };
    tableWidth?: 'auto' | 'wrap' | number;
    cellWidth?: 'auto' | 'wrap' | number;
    minCellHeight?: number;
    minCellWidth?: number;
    tableLineColor?: number | number[];
    tableLineWidth?: number;
    horizontalPageBreak?: boolean;
    horizontalPageBreakRepeat?: number | number[];
    [key: string]: any;
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}
