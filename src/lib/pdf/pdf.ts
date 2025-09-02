import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Guard for different bundlers and pdfmake versions
const vfs = (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any)?.vfs;
if (!vfs) throw new Error("pdfmake vfs not found. Check vfs_fonts import.");
(pdfMake as any).vfs = vfs;

export { pdfMake };