export function transformCloudinaryUrl(url: string, transformation: string) {
  try {
    const marker = "/image/upload/";
    const idx = url.indexOf(marker);
    if (idx === -1) return url;
    const head = url.substring(0, idx + marker.length);
    const tail = url.substring(idx + marker.length);
    if (tail.startsWith("f_")) return url;
    return `${head}${transformation}/${tail}`;
  } catch {
    return url;
  }
}

export function cloudinaryUrl(url: string | null | undefined, transformation: string, fallback?: string) {
  const safe = url || fallback || "";
  if (!safe) return safe;
  return transformCloudinaryUrl(safe, transformation);
}

const extractWidthAndDpr = (transformation: string): { width: number | null; dpr: number | null } => {
  const w = transformation.match(/(?:^|,)w_(\d+)(?:,|$)/);
  const dpr = transformation.match(/(?:^|,)dpr_([0-9.]+)(?:,|$)/);
  const width = w ? Number(w[1]) : null;
  const dprValue = dpr ? Number(dpr[1]) : null;
  return {
    width: Number.isFinite(width as any) ? (width as number) : null,
    dpr: Number.isFinite(dprValue as any) ? (dprValue as number) : null,
  };
};

/**
 * Compat com o padrão antigo (2 transformações) mas retornando srcset por largura (w) quando possível.
 * Se não der para inferir, cai no formato 1x/2x.
 */
export function cloudinarySrcSet(
  url: string | null | undefined,
  oneXTransformation: string,
  twoXTransformation: string,
  fallback?: string
) {
  const one = extractWidthAndDpr(oneXTransformation);
  const two = extractWidthAndDpr(twoXTransformation);

  if (one.width && two.width) {
    const w1 = Math.round(one.width * (one.dpr ?? 1));
    const w2 = Math.round(two.width * (two.dpr ?? 1));
    return `${cloudinaryUrl(url, oneXTransformation, fallback)} ${w1}w, ${cloudinaryUrl(url, twoXTransformation, fallback)} ${w2}w`;
  }

  return `${cloudinaryUrl(url, oneXTransformation, fallback)} 1x, ${cloudinaryUrl(url, twoXTransformation, fallback)} 2x`;
}

export function cloudinarySrcSetDpr(url: string | null | undefined, oneXTransformation: string, twoXTransformation: string, fallback?: string) {
  return `${cloudinaryUrl(url, oneXTransformation, fallback)} 1x, ${cloudinaryUrl(url, twoXTransformation, fallback)} 2x`;
}

export function cloudinarySrcSetW(
  url: string | null | undefined,
  entries: Array<{ transformation: string; width: number }>,
  fallback?: string
) {
  return entries
    .map((e) => `${cloudinaryUrl(url, e.transformation, fallback)} ${e.width}w`)
    .join(", ");
}
