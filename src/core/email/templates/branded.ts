export interface EmailBrand {
  name: string;
  url: string;
  logo?: string;
}
export const escapeEmail = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!
  );

export function emailUrl(value: string, base: string): string {
  const url = new URL(value, base);
  if (!['https:', 'http:'].includes(url.protocol))
    throw new Error('Invalid email URL');
  return escapeEmail(url.href);
}
export function emailDetails(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #f0dfe6;border-radius:12px;background:#fff9fb">${rows.map(([label, value], index) => `<tr><td style="padding:13px 16px;${index ? 'border-top:1px solid #f0dfe6;' : ''}font-size:13px;color:#746371;vertical-align:top;width:43%">${escapeEmail(label)}</td><td style="padding:13px 16px;${index ? 'border-top:1px solid #f0dfe6;' : ''}font-size:14px;font-weight:600;color:#18213b;overflow-wrap:anywhere">${escapeEmail(value)}</td></tr>`).join('')}</table>`;
}
export function emailStats(stats: { label: string; value: number }[]): string {
  if (!stats.length) return '';
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0"><tr>${stats.map(({ label, value }) => `<td width="${100 / stats.length}%" align="center" style="padding:16px 4px;background:#fdf0f5;border:2px solid white;border-radius:10px"><div style="font-size:30px;line-height:38px;font-weight:700;color:#b52f65">${escapeEmail(value)}</div><div style="font-size:12px;line-height:18px;color:#675165">${escapeEmail(label)}</div></td>`).join('')}</tr></table>`;
}
/** Table layout + inline styles work without flex, external CSS, or scripts. */
export function brandedEmail(props: {
  brand: EmailBrand;
  locale: string;
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  content: string;
  action: string;
  actionUrl: string;
  note?: string;
  footer: string;
  footerLink: string;
  footerUrl: string;
  visit: string;
}): string {
  const e = escapeEmail;
  const { brand } = props;
  // PNG is supported by email clients that do not display SVG logos.
  const logo =
    !brand.logo || brand.logo === '/logo.svg' ? '/logo.png' : brand.logo;
  return `<!doctype html><html lang="${e(props.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(props.title)}</title><style>@media(max-width:620px){.email-shell{padding:16px 8px!important}.email-content{padding:24px 20px!important}.email-title{font-size:28px!important}.email-header{padding:28px 20px!important}}</style></head><body style="margin:0;padding:0;background:#fbf5f8;color:#18213b;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${e(props.preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td class="email-shell" align="center" style="padding:40px 16px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border:1px solid #f0dfe6;border-radius:18px;background:#ffffff;overflow:hidden"><tr><td class="email-header" align="center" style="padding:32px 40px;background:#fce7ef;border-radius:17px 17px 0 0"><a href="${emailUrl(brand.url, brand.url)}" style="text-decoration:none;color:#18213b"><img src="${emailUrl(logo, brand.url)}" width="46" height="46" alt="${e(brand.name)}" style="display:block;border:0;border-radius:13px;margin:0 auto 12px"><span style="font-size:15px;line-height:22px;font-weight:700">${e(brand.name)}</span></a><p style="margin:26px 0 10px;color:#a52b5d;font-size:11px;line-height:16px;letter-spacing:1.8px;font-weight:700">${e(props.eyebrow)}</p><h1 class="email-title" style="font-size:32px;line-height:1.2;letter-spacing:-0.6px;margin:0;color:#18213b">${e(props.title)}</h1></td></tr><tr><td class="email-content" style="padding:30px 36px 32px"><p style="margin:0 0 24px;font-size:15px;line-height:25px;color:#665765">${e(props.intro)}</p>${props.content}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px"><tr><td align="center"><a href="${emailUrl(props.actionUrl, brand.url)}" style="display:block;background:#bd356b;border:1px solid #bd356b;border-radius:9px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;line-height:22px;padding:15px 20px;mso-padding-alt:15px 20px">${e(props.action)} &rarr;</a></td></tr></table>${props.note ? `<p style="font-size:12px;line-height:20px;color:#7b6b77;margin:20px 0 0">${e(props.note)}</p>` : ''}</td></tr></table><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px"><tr><td align="center" style="padding:23px 20px 0;font-size:12px;line-height:20px;color:#857681">${e(props.footer)}<p style="margin:12px 0"><a href="${emailUrl(props.footerUrl, brand.url)}" style="color:#a52b5d;text-decoration:underline">${e(props.footerLink)}</a> &nbsp;&middot;&nbsp; <a href="${emailUrl(brand.url, brand.url)}" style="color:#a52b5d;text-decoration:underline">${e(props.visit)}</a></p><span style="font-size:11px">${e(brand.name)}</span></td></tr></table></td></tr></table></body></html>`;
}
