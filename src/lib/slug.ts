export function slugify(input: string) {
  return (input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function buildPropertyPath(id: string, title: string) {
  const slug = slugify(title);
  return `/property/${id}/${slug}`;
}
