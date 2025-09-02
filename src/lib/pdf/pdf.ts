// Lazy-loaded pdfMake to prevent app startup issues
let pdfMakeInstance: any = null;

export const initializePdfMake = async () => {
  if (pdfMakeInstance) {
    return pdfMakeInstance;
  }

  try {
    // Dynamic imports to prevent blocking app startup
    const [pdfMakeModule, pdfFontsModule] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts")
    ]);

    const pdfMake = pdfMakeModule.default || pdfMakeModule;
    const pdfFonts = pdfFontsModule.default || pdfFontsModule;

    // Try different VFS structures
    if (pdfFonts?.pdfMake?.vfs) {
      pdfMake.vfs = pdfFonts.pdfMake.vfs;
    } else if (pdfFonts?.vfs) {
      pdfMake.vfs = pdfFonts.vfs;
    } else if (pdfFonts?.default?.vfs) {
      pdfMake.vfs = pdfFonts.default.vfs;
    } else if (pdfFonts?.default?.pdfMake?.vfs) {
      pdfMake.vfs = pdfFonts.default.pdfMake.vfs;
    } else {
      console.warn("VFS not found, PDF generation may not work");
    }

    pdfMakeInstance = pdfMake;
    return pdfMake;
  } catch (error) {
    console.error("Failed to load pdfMake:", error);
    throw new Error("PDF generation unavailable");
  }
};

// Export a placeholder for immediate use
export const pdfMake = {
  createPdf: () => {
    throw new Error("PDF not initialized. Call initializePdfMake() first.");
  }
};