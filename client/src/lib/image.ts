export type ImageSourceCandidate = {
  featured_image?: string | null;
  slug?: string | null;
  id?: number | string;
};

function buildPlaceholderSeed(candidate?: string) {
  if (candidate && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return "news-placeholder";
}

export function getPlaceholderImageUrl(
  seedSource?: string | number,
  width = 800,
  height = 600
) {
  const seed = buildPlaceholderSeed(
    seedSource !== undefined ? String(seedSource) : undefined
  );
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

export function getArticleImageUrl(
  article: ImageSourceCandidate,
  width = 800,
  height = 600
) {
  if (article?.featured_image) {
    return article.featured_image;
  }

  const seed =
    (article?.slug && article.slug.trim()) ??
    (article?.id !== undefined ? String(article.id) : undefined);

  return getPlaceholderImageUrl(seed, width, height);
}

