// Accepts the existing project logo object or path used in the app header.
export async function resolveBusinessLogoDataUrl(logo: { base64?: string; src?: string } | string): Promise<string> {
  if (typeof logo === "string" && logo.startsWith("data:image/")) return logo;
  if (typeof logo === "object" && logo.base64?.startsWith("data:image/")) return logo.base64;

  const src = typeof logo === "string" ? logo : logo.src;
  if (!src) throw new Error("Business logo source not provided");

  const res = await fetch(src);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read logo blob"));
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}