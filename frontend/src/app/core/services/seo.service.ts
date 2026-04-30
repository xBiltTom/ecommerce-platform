import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import type { ProductoDetallePublico } from './product.service';

type SeoPageType = 'website' | 'product' | 'article';

interface SeoTagConfig {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: SeoPageType;
  robots?: string;
  imageAlt?: string;
}

interface CatalogSeoInput {
  search?: string;
  category?: string;
  brand?: string;
  onSale?: boolean;
  priceMin?: number | null;
  priceMax?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  private readonly siteName = 'ProTech';
  private readonly defaultTitle = 'ProTech | Tecnologia y electronica premium';
  private readonly defaultDescription =
    'ProTech es tu tienda online de productos electronicos y tecnologia premium. Encuentra laptops, audio, wearables y accesorios con envio rapido y garantia.';
  private readonly defaultKeywords =
    'ProTech, productos electronicos, tecnologia, gadgets, audio, wearables, laptops, accesorios';
  private readonly defaultImage = '/favicon.ico';
  private readonly locale = 'es_PE';

  setBaseStructuredData(): void {
    const origin = this.getOrigin();
    if (!origin) {
      return;
    }

    this.setJsonLd('seo-jsonld-organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.siteName,
      url: origin,
    });

    this.setJsonLd('seo-jsonld-website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.siteName,
      url: origin,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${origin}/?buscar={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });
  }

  setCatalogSeo(input: CatalogSeoInput = {}): void {
    const search = this.normalizeText(input.search ?? '');
    const category = this.normalizeText(input.category ?? '');
    const brand = this.normalizeText(input.brand ?? '');
    const isOnSale = input.onSale === true;
    const hasPriceRange = input.priceMin !== null || input.priceMax !== null;

    let title = 'Catalogo de tecnologia';
    if (search) {
      title = `Resultados para "${search}"`;
    } else if (category) {
      title = `Tecnologia en ${category}`;
    } else if (brand) {
      title = `Productos ${brand}`;
    } else if (isOnSale) {
      title = 'Ofertas en tecnologia';
    }

    const descriptionParts: string[] = [];
    if (search) {
      descriptionParts.push(`Explora resultados para "${search}" en ProTech.`);
    } else {
      descriptionParts.push('Descubre productos electronicos premium en ProTech.');
    }

    if (category) {
      descriptionParts.push(`Categoria: ${category}.`);
    }

    if (brand) {
      descriptionParts.push(`Marca: ${brand}.`);
    }

    if (isOnSale) {
      descriptionParts.push('Aprovecha descuentos por tiempo limitado.');
    }

    if (hasPriceRange) {
      const min = input.priceMin !== null && input.priceMin !== undefined ? `desde S/ ${input.priceMin}` : '';
      const max = input.priceMax !== null && input.priceMax !== undefined ? `hasta S/ ${input.priceMax}` : '';
      const connector = min && max ? ' ' : '';
      descriptionParts.push(`Rango de precios ${min}${connector}${max}.`.trim());
    }

    const description = this.trimDescription(descriptionParts.join(' '), this.defaultDescription);
    const keywords = [
      this.siteName,
      'productos electronicos',
      'tecnologia',
      'gadgets',
      category,
      brand,
      search,
    ]
      .map((value) => this.normalizeText(value))
      .filter(Boolean)
      .join(', ');

    this.clearProductMeta();
    this.removeJsonLd('seo-jsonld-product');

    this.setPageTags({
      title: this.buildTitle(title),
      description,
      keywords: keywords || this.defaultKeywords,
      image: this.defaultImage,
      url: this.getCurrentUrl(),
      type: 'website',
      robots: 'index,follow',
    });
  }

  setProductSeo(product: ProductoDetallePublico): void {
    const title = this.buildTitle(product.nombre);
    const description = this.trimDescription(
      this.normalizeText(product.descripcion ?? ''),
      'Encuentra tecnologia premium en ProTech con garantia y envio rapido.'
    );
    const image = product.imagen_url || this.defaultImage;
    const priceValue = product.precio_oferta ?? product.precio;

    const keywords = [
      this.siteName,
      product.nombre,
      product.marca_nombre ?? '',
      product.categoria_nombre ?? '',
      'productos electronicos',
      'tecnologia',
    ]
      .map((value) => this.normalizeText(value))
      .filter(Boolean)
      .join(', ');

    this.setPageTags({
      title,
      description,
      keywords: keywords || this.defaultKeywords,
      image,
      imageAlt: product.nombre,
      url: this.getCurrentUrl(),
      type: 'product',
      robots: 'index,follow',
    });

    this.meta.updateTag({ property: 'product:price:amount', content: priceValue.toFixed(2) });
    this.meta.updateTag({ property: 'product:price:currency', content: 'PEN' });

    this.setJsonLd('seo-jsonld-product', this.buildProductSchema(product, description, image, priceValue));
  }

  setNoIndex(title: string, description?: string): void {
    this.clearProductMeta();
    this.removeJsonLd('seo-jsonld-product');

    this.setPageTags({
      title: this.buildTitle(title),
      description: this.trimDescription(description ?? '', this.defaultDescription),
      keywords: this.defaultKeywords,
      image: this.defaultImage,
      url: this.getCurrentUrl(),
      type: 'website',
      robots: 'noindex,nofollow',
    });
  }

  private setPageTags(config: SeoTagConfig): void {
    const resolvedUrl = this.normalizeUrl(config.url || this.getCurrentUrl());
    const imageUrl = this.toAbsoluteUrl(config.image || this.defaultImage);
    const imageAlt = this.normalizeText(config.imageAlt || config.title || this.siteName) || this.siteName;
    const pageType = config.type || 'website';

    this.title.setTitle(config.title || this.defaultTitle);

    this.meta.updateTag({ name: 'description', content: config.description || this.defaultDescription });
    this.meta.updateTag({ name: 'keywords', content: config.keywords || this.defaultKeywords });
    this.meta.updateTag({ name: 'robots', content: config.robots || 'index,follow' });
    this.meta.updateTag({ name: 'application-name', content: this.siteName });

    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });
    this.meta.updateTag({ property: 'og:title', content: config.title || this.defaultTitle });
    this.meta.updateTag({ property: 'og:description', content: config.description || this.defaultDescription });
    this.meta.updateTag({ property: 'og:type', content: pageType });
    this.meta.updateTag({ property: 'og:locale', content: this.locale });
    this.meta.updateTag({ property: 'og:url', content: resolvedUrl });
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ property: 'og:image:alt', content: imageAlt });

    const isLargeImage = !imageUrl.endsWith('favicon.ico');
    this.meta.updateTag({ name: 'twitter:card', content: isLargeImage ? 'summary_large_image' : 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title || this.defaultTitle });
    this.meta.updateTag({ name: 'twitter:description', content: config.description || this.defaultDescription });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:image:alt', content: imageAlt });
    this.meta.updateTag({ name: 'twitter:url', content: resolvedUrl });

    this.setCanonicalUrl(resolvedUrl);
  }

  private buildProductSchema(
    product: ProductoDetallePublico,
    description: string,
    image: string,
    priceValue: number
  ): Record<string, unknown> {
    const origin = this.getOrigin();
    const productUrl = origin ? `${origin}${this.document.location.pathname}` : this.getCurrentUrl();
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.nombre,
      description,
      sku: product.sku,
      url: productUrl,
      offers: {
        '@type': 'Offer',
        price: priceValue.toFixed(2),
        priceCurrency: 'PEN',
        availability: product.stock_disponible > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: productUrl,
      },
    };

    const imageUrl = this.toAbsoluteUrl(image);
    if (imageUrl) {
      schema['image'] = [imageUrl];
    }

    if (product.marca_nombre) {
      schema['brand'] = {
        '@type': 'Brand',
        name: product.marca_nombre,
      };
    }

    if (product.categoria_nombre) {
      schema['category'] = product.categoria_nombre;
    }

    return schema;
  }

  private setCanonicalUrl(url: string): void {
    if (!this.document) {
      return;
    }

    const head = this.document.head;
    if (!head) {
      return;
    }

    let canonical = head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  }

  private setJsonLd(id: string, payload: Record<string, unknown>): void {
    if (!this.document) {
      return;
    }

    const head = this.document.head;
    if (!head) {
      return;
    }

    let script = this.document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      head.appendChild(script);
    }
    script.text = JSON.stringify(payload);
  }

  private removeJsonLd(id: string): void {
    if (!this.document) {
      return;
    }

    const script = this.document.getElementById(id);
    if (script && script.parentNode) {
      script.parentNode.removeChild(script);
    }
  }

  private clearProductMeta(): void {
    this.meta.removeTag("property='product:price:amount'");
    this.meta.removeTag("property='product:price:currency'");
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private trimDescription(value: string, fallback: string): string {
    const normalized = this.normalizeText(value || '');
    const safeValue = normalized || fallback;
    return safeValue.length > 160 ? `${safeValue.slice(0, 157).trim()}...` : safeValue;
  }

  private buildTitle(title: string): string {
    const normalized = this.normalizeText(title || '');
    if (!normalized) {
      return this.defaultTitle;
    }

    const lower = normalized.toLowerCase();
    if (lower.includes(this.siteName.toLowerCase())) {
      return normalized;
    }

    return `${normalized} | ${this.siteName}`;
  }

  private getOrigin(): string {
    return this.document?.location?.origin ?? '';
  }

  private getCurrentUrl(): string {
    const location = this.document?.location;
    if (!location) {
      return '';
    }

    return `${location.origin}${location.pathname}${location.search}`;
  }

  private normalizeUrl(value: string): string {
    if (!value) {
      return this.getCurrentUrl();
    }

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    const origin = this.getOrigin();
    if (!origin) {
      return value;
    }

    return `${origin}${value.startsWith('/') ? '' : '/'}${value}`;
  }

  private toAbsoluteUrl(value: string): string {
    if (!value) {
      return '';
    }

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    const origin = this.getOrigin();
    if (!origin) {
      return value;
    }

    return `${origin}${value.startsWith('/') ? '' : '/'}${value}`;
  }
}
