import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Handle different pdfmake versions and bundler configurations
try {
  // Try the most common structure first
  if (pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  } else if (pdfFonts.vfs) {
    // Alternative structure
    pdfMake.vfs = pdfFonts.vfs;
  } else if ((pdfFonts as any).default && (pdfFonts as any).default.vfs) {
    // ES6 default export structure
    pdfMake.vfs = (pdfFonts as any).default.vfs;
  } else if ((pdfFonts as any).default && (pdfFonts as any).default.pdfMake) {
    // Another common structure
    pdfMake.vfs = (pdfFonts as any).default.pdfMake.vfs;
  } else {
    throw new Error("Could not find VFS in pdfFonts object");
  }
} catch (error) {
  console.error("pdfmake VFS setup failed:", error);
  console.log("pdfFonts object structure:", pdfFonts);
  throw new Error("Failed to initialize pdfmake VFS. Check console for details.");
}

export { pdfMake };