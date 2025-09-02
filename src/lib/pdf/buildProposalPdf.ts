import { pdfMake } from "./pdf";
import { initializePdfMake, createPdf } from "./pdfAlternative";
import { resolveBusinessLogoDataUrl } from "./pdfLogo";
import { inferNames } from "./naming";
import { chunkArray } from "./chunk";

type KPI = { label: string; value: string };
type TableDef = { columns: string[]; rows: (string | number)[][] };

export async function buildProposalPdf(opts: {
  // pass the actual business logo object or path used in the header
  businessLogo: { base64?: string; src?: string } | string;

  // optional explicit context; when omitted, naming.ts will infer
  context?: { businessName?: string; toolName?: string; audience?: string };

  // content definition, can be any length, page count will be dynamic
  sections: Array<
    | {
        kind: "exec";
        title: string;
        problem?: string;
        solution?: string;
        roi?: string;
        kpis?: KPI[];
      }
    | {
        kind: "analysis";
        title: string;
        narrative?: string;
        table?: TableDef;
      }
    | {
        kind: "plan";
        title: string;
        priorities?: { level: "HIGH" | "MEDIUM" | "LOW"; item: string }[];
        timeline?: string[];
        nextSteps?: string[];
      }
    | {
        kind: "custom";
        title: string;
        paragraphs?: string[];
        bullets?: string[];
        table?: TableDef;
      }
  >;
}) {
  const { title, filename } = inferNames(opts.context);
  const logoDataUrl = await resolveBusinessLogoDataUrl(opts.businessLogo);

  const styles = {
    h1: { fontSize: 16, bold: true, color: "#1E293B" },
    h2: { fontSize: 13, bold: true, color: "#1E293B", margin: [0, 0, 0, 6] },
    body: { fontSize: 10, color: "#475569", lineHeight: 1.25 },
    kpiLabel: { fontSize: 9, color: "#475569" },
    kpiValue: { fontSize: 12, bold: true },
    foot: { fontSize: 8, color: "#475569" },
    tableHeader: { bold: true, fillColor: "#F8FAFC" }
  };

  const content: any[] = [];

  for (const section of opts.sections) {
    if (section.kind === "exec") {
      const kpis = section.kpis || [];
      const kpiCols = kpis.map(k => ({
        width: "*",
        margin: [0, 0, 8, 0],
        table: {
          widths: ["*"],
          body: [
            [{ text: k.label, style: "kpiLabel" }],
            [{ text: k.value, style: "kpiValue" }]
          ]
        },
        layout: "lightHorizontalLines"
      }));

      content.push({
        unbreakable: true,
        margin: [0, 10, 0, 16],
        stack: [
          { text: section.title, style: "h1", margin: [0, 0, 0, 8] },
          section.problem ? { text: section.problem, style: "body", margin: [0, 0, 0, 6] } : null,
          section.solution ? { text: section.solution, style: "body", margin: [0, 0, 0, 6] } : null,
          section.roi ? { text: section.roi, style: "body", margin: [0, 0, 0, 12] } : null,
          kpis.length ? { columns: kpiCols, columnGap: 8 } : null
        ].filter(Boolean)
      });

      continue;
    }

    if (section.kind === "analysis" || section.kind === "custom") {
      const blocks: any[] = [];
      blocks.push({ text: section.title, style: "h1", margin: [0, 0, 0, 8] });

      const paras = (section as any).paragraphs || (section as any).narrative ? [ (section as any).narrative ] : [];
      for (const p of paras.filter(Boolean)) {
        blocks.push({ text: p, style: "body", margin: [0, 0, 0, 10] });
      }

      const bullets = (section as any).bullets || [];
      if (bullets.length) {
        for (const chunk of chunkArray(bullets, 8)) {
          blocks.push({ unbreakable: true, ul: chunk, margin: [0, 0, 0, 10] });
        }
      }

      const table = (section as any).table as TableDef | undefined;
      if (table?.columns?.length && table?.rows?.length) {
        blocks.push({
          unbreakable: true,
          table: {
            headerRows: 1,
            widths: table.columns.map(() => "*"),
            body: [
              table.columns.map(c => ({ text: c, style: "tableHeader" })),
              ...table.rows.map(r => r.map(cell => ({ text: String(cell), style: "body" })))
            ]
          },
          layout: { fillColor: (rowIndex: number) => (rowIndex % 2 === 0 ? null : "#F8FAFC") },
          margin: [0, 0, 0, 10]
        });
      }

      content.push({ unbreakable: true, margin: [0, 10, 0, 16], stack: blocks });
      continue;
    }

    if (section.kind === "plan") {
      const blocks: any[] = [];
      blocks.push({ text: section.title, style: "h1", margin: [0, 0, 0, 8] });

      if (section.priorities?.length) {
        blocks.push({ text: "Priorities", style: "h2" });
        for (const chunk of chunkArray(section.priorities.map(p => `${p.level}: ${p.item}`), 8)) {
          blocks.push({ unbreakable: true, ul: chunk, margin: [0, 0, 0, 10] });
        }
      }

      if (section.timeline?.length) {
        blocks.push({ text: "Implementation Timeline", style: "h2" });
        for (const chunk of chunkArray(section.timeline, 8)) {
          blocks.push({ unbreakable: true, ol: chunk, margin: [0, 0, 0, 10] });
        }
      }

      if (section.nextSteps?.length) {
        blocks.push({ text: "Next Steps", style: "h2" });
        for (const chunk of chunkArray(section.nextSteps, 8)) {
          blocks.push({ unbreakable: true, ol: chunk });
        }
      }

      content.push({ unbreakable: true, margin: [0, 10, 0, 16], stack: blocks });
      continue;
    }
  }

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    info: { title, subject: "Executive Report", creator: "Fractionl" },
    header: () => ({
      columns: [
        { image: logoDataUrl, fit: [120, 32], margin: [40, 20, 0, 0] },
        { text: title, style: "h1", alignment: "right", margin: [0, 22, 40, 0] }
      ]
    }),
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: "CONFIDENTIAL - Executive Use Only", style: "foot", margin: [40, 0, 0, 0] },
        { text: `${currentPage} of ${pageCount}`, style: "foot", alignment: "right", margin: [0, 0, 40, 0] }
      ],
      margin: [0, 10]
    }),
    styles,
    defaultStyle: { fontSize: 10 },
    content
  };

  try {
    // Try the main pdfMake instance first
    pdfMake.createPdf(docDefinition).download(filename);
  } catch (error) {
    console.warn("Main pdfMake failed, trying alternative:", error);
    // Fallback to alternative initialization
    try {
      await createPdf(docDefinition);
    } catch (fallbackError) {
      console.error("Both pdfMake methods failed:", fallbackError);
      alert("PDF generation is currently unavailable. Please try again later.");
      return;
    }
  }

  // Optionally update any UI button label to the resolved title
  const btn = document.querySelector('[data-pdf-button]');
  if (btn) (btn as HTMLButtonElement).textContent = `Download: ${title}`;
}