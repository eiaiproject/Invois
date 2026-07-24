import { Helmet } from 'react-helmet-async';

interface SEOProps {
  readonly title: string;
  readonly description: string;
  readonly image?: string;
  readonly url?: string;
}

export function Seo({ title, description, image, url }: Readonly<SEOProps>) {
  const site = 'Invois';
  const fullTitle = `${title} — ${site}`;
  const img = image ?? 'https://invois.pages.dev/og-image.svg';
  const href = url ?? 'https://invois.pages.dev/';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={href} />
      <meta property="og:image" content={img} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      <meta name="description" content={description} />
    </Helmet>
  );
}
