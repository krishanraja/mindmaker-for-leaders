// Alternative pdfmake setup with dynamic import
let pdfMakeInstance: any = null;

export async function initializePdfMake(): Promise<any> {
  if (pdfMakeInstance) {
    return pdfMakeInstance;
  }

  try {
    // Dynamic import approach - sometimes works better with bundlers
    const pdfMakeModule = await import("pdfmake/build/pdfmake");
    const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
    
    const pdfMake = pdfMakeModule.default || pdfMakeModule;
    const pdfFonts = pdfFontsModule.default || pdfFontsModule;

    // Try multiple VFS assignment patterns
    if (pdfFonts?.pdfMake?.vfs) {
      pdfMake.vfs = pdfFonts.pdfMake.vfs;
    } else if (pdfFonts?.vfs) {
      pdfMake.vfs = pdfFonts.vfs;
    } else if (pdfFonts?.default?.vfs) {
      pdfMake.vfs = pdfFonts.default.vfs;
    } else if (pdfFonts?.default?.pdfMake?.vfs) {
      pdfMake.vfs = pdfFonts.default.pdfMake.vfs;
    } else {
      console.log("Available pdfFonts keys:", Object.keys(pdfFonts || {}));
      throw new Error("VFS not found in any expected location");
    }

    pdfMakeInstance = pdfMake;
    return pdfMake;
  } catch (error) {
    console.error("Failed to initialize pdfMake:", error);
    throw new Error(`PDF generation unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createPdf(docDefinition: any): Promise<void> {
  const pdfMake = await initializePdfMake();
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.download();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}