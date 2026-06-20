/**
 * Shared branded kit email shell.
 *
 * ONE chrome for every kit email (pack / day3 / day7 across all four presets).
 * Each preset owns only its heading, body HTML, button label, and kit URL; the
 * shell owns the Mindmaker branding, fonts, button, footer, and layout.
 *
 * IMPORTANT: this module is imported by the Deno edge runtime (send-kit-pack /
 * send-kit-nudges, via the preset modules). Keep it plain TypeScript: no Deno
 * globals, no Node APIs, no imports outside this folder. Same constraint as the
 * rest of _shared/kit-presets (see types.ts header).
 *
 * Email-safe constraints respected here:
 * - Tables + inline styles for layout. No flexbox, no grid.
 * - Absolute https image URLs only, every <img> has width/height + alt.
 * - Inter via a Google Fonts <link>/@import in <head> PLUS an inline
 *   font-family fallback stack, so the mail still reads right where Inter does
 *   not load (most desktop clients).
 * - The app hero is Gobold (uppercase, tracked) which does not render in email;
 *   the brand eyebrow approximates it with heavy-weight uppercase Inter +
 *   positive letter-spacing. Gobold is NOT loaded in email.
 * - Bulletproof emerald CTA (Outlook VML fallback) so the button renders in
 *   Word-engine Outlook, not just a bare link.
 * - No em dashes anywhere (hard brand rule).
 */

/** Prod-hosted brand marks (verified 200, image/png). Absolute https only. */
const BRAND_ICON_URL = "https://ctrl.themindmaker.ai/favicon-192x192.png";
const BRAND_WORDMARK_URL = "https://ctrl.themindmaker.ai/mindmaker-wordmark-onlight.png";

/** Brand emerald (kit accent), deepened for the gradient/Outlook fill. */
const EMERALD = "#2A9E7C";
const EMERALD_DEEP = "#1E7860";

/** Calm light surfaces matching the kit portal. */
const PAGE_BG = "#f3f5f1";
const CARD_BG = "#ffffff";
const BORDER = "#e3e8e0";
const INK = "#13282c";
const INK_SOFT = "#4a5a52";

/** Inline font stack used everywhere a font-family is set inline. */
const FONT_STACK =
  "'Inter', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export interface KitEmailShellOpts {
  /** Bold heading line at the top of the message body. */
  heading: string;
  /** Pre-rendered, already-escaped body HTML (the preset owns its copy). */
  bodyHtml: string;
  /** CTA button label. */
  buttonLabel: string;
  /** Absolute https kit URL the button points at. */
  kitUrl: string;
  /** Optional eyebrow above the header lockup; defaults to the brand line. */
  eyebrow?: string;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render the full branded email document around a preset's body.
 * The returned string is a complete, standalone HTML email.
 */
export function kitEmailShell(opts: KitEmailShellOpts): string {
  const href = escapeAttr(opts.kitUrl);
  const eyebrow = opts.eyebrow ?? "CTRL by Mindmaker";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${escapeAttr(eyebrow)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800;900&display=swap" rel="stylesheet" />
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800;900&display=swap');
body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; background-color:${PAGE_BG}; }
table { border-collapse:collapse; }
img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
a { color:${EMERALD_DEEP}; }
.kit-eyebrow { font-family:${FONT_STACK}; font-weight:900; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:${EMERALD_DEEP}; }
.kit-heading { font-family:${FONT_STACK}; font-weight:800; font-size:22px; line-height:1.25; color:${INK}; }
.kit-body { font-family:${FONT_STACK}; font-size:16px; line-height:1.6; color:${INK}; }
.kit-footnote { font-family:${FONT_STACK}; font-size:12px; line-height:1.6; color:${INK_SOFT}; }
@media only screen and (max-width:600px) {
  .kit-shell { width:100% !important; }
  .kit-pad { padding-left:22px !important; padding-right:22px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeAttr(opts.heading)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE_BG};">
<tr>
<td align="center" style="padding:28px 16px;">
<table role="presentation" class="kit-shell" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background-color:${CARD_BG};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">

<!-- Header / brand lockup -->
<tr>
<td class="kit-pad" align="left" style="padding:28px 36px 20px 36px;border-bottom:1px solid ${BORDER};background-color:${CARD_BG};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td valign="middle" style="padding-right:12px;">
<img src="${BRAND_ICON_URL}" width="40" height="40" alt="Mindmaker" style="display:block;width:40px;height:40px;border-radius:9px;" />
</td>
<td valign="middle">
<img src="${BRAND_WORDMARK_URL}" width="150" height="26" alt="Mindmaker" style="display:block;width:150px;height:auto;max-height:30px;" />
</td>
</tr>
</table>
<div class="kit-eyebrow" style="font-family:${FONT_STACK};font-weight:900;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${EMERALD_DEEP};padding-top:16px;">${escapeAttr(eyebrow)}</div>
</td>
</tr>

<!-- Body -->
<tr>
<td class="kit-pad" align="left" style="padding:28px 36px 8px 36px;">
<p class="kit-heading" style="font-family:${FONT_STACK};font-weight:800;font-size:22px;line-height:1.25;color:${INK};margin:0 0 18px 0;">${escapeAttr(opts.heading)}</p>
<div class="kit-body" style="font-family:${FONT_STACK};font-size:16px;line-height:1.6;color:${INK};">
${opts.bodyHtml}
</div>
</td>
</tr>

<!-- CTA (bulletproof emerald button) -->
<tr>
<td class="kit-pad" align="left" style="padding:8px 36px 4px 36px;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="14%" strokecolor="${EMERALD_DEEP}" fillcolor="${EMERALD_DEEP}">
<w:anchorlock/>
<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${escapeAttr(opts.buttonLabel)}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-- -->
<a href="${href}" style="background-color:${EMERALD};background-image:linear-gradient(135deg, ${EMERALD} 0%, ${EMERALD_DEEP} 100%);color:#ffffff;display:inline-block;font-family:${FONT_STACK};font-size:16px;font-weight:700;line-height:46px;text-align:center;text-decoration:none;padding:0 28px;border-radius:8px;mso-hide:all;">${escapeAttr(opts.buttonLabel)}</a>
<!--<![endif]-->
</td>
</tr>

<!-- Signature -->
<tr>
<td class="kit-pad" align="left" style="padding:24px 36px 28px 36px;">
<p class="kit-body" style="font-family:${FONT_STACK};font-size:16px;line-height:1.6;color:${INK};margin:0;">Krish</p>
</td>
</tr>

<!-- Footer -->
<tr>
<td class="kit-pad" align="left" style="padding:18px 36px 26px 36px;border-top:1px solid ${BORDER};background-color:${PAGE_BG};">
<p class="kit-footnote" style="font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${INK_SOFT};margin:0;">CTRL by Mindmaker</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>`;
}
