import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  readonly title: string;
  readonly description: string;
  readonly image?: string;
  readonly url?: string;
}

const SITE_URL = 'https://invois.pages.dev';

export function Seo({ title, description, image, url }: Readonly<SEOProps>) {
  const { pathname } = useLocation();
  const site = 'Invois';
  const fullTitle = `${title} · ${site}`;
  const img = image ?? `${SITE_URL}/og-image.png`;
  const canonical = url ?? `${SITE_URL}${pathname}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={img} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      <meta name="description" content={description} />
    </Helmet>
  );
}
