export function inferNames(ctx?: {
  businessName?: string;
  toolName?: string;
  audience?: string;
}): { businessName: string; toolName: string; audience?: string; title: string; filename: string } {
  // Try common sources already present in the app
  const docTitle = typeof document !== "undefined" ? document.title : "";
  const pkgName = (window as any)?.__APP_NAME__ || "";
  const headerBrand = (window as any)?.__HEADER_BRAND__ || "";
  const routeHint = (window as any)?.__ROUTE_NAME__ || "";
  const visibleH1 = (window as any)?.__PAGE_H1__ || "";

  const businessName =
    ctx?.businessName ||
    headerBrand ||
    (docTitle && docTitle.split("|")[0].trim()) ||
    pkgName ||
    "AI Leadership Assessment";

  const toolName =
    ctx?.toolName ||
    visibleH1 ||
    routeHint ||
    (docTitle && docTitle.split("|")[1]?.trim()) ||
    "AI Assessment";

  const audience =
    ctx?.audience ||
    (docTitle.match(/for\s+([A-Za-z ]+)/i)?.[1]?.trim()) ||
    undefined;

  const base = `${businessName} - ${toolName} Proposal`;
  const title = audience ? `${base} for ${audience}` : base;
  const filename = `${title}.pdf`;

  return { businessName, toolName, audience, title, filename };
}