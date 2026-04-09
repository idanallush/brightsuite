// UTM parameter generator for video ads

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function generateUtm(campaignName: string, adName: string) {
  return {
    utm_source: 'meta',
    utm_medium: 'paid',
    utm_campaign: slugify(campaignName),
    utm_content: slugify(adName),
  };
}

export function buildUtmUrl(baseUrl: string, utm: ReturnType<typeof generateUtm>): string {
  const params = new URLSearchParams(utm as Record<string, string>);
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${params.toString()}`;
}
