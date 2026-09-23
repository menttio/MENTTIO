import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ARTICULOS, articuloPorSlug } from '@/data/articulos';

/**
 * Un artículo, en su propia dirección.
 *
 * Antes los artículos se abrían en una ventana emergente dentro de /Blog, así que no tenían
 * URL: no se podían indexar, compartir ni enlazar. Aquí además se ajustan el título y la
 * descripción de la pestaña y se añaden los datos estructurados, que es lo que lee Google.
 */
function ponerMeta(nombre, valor, porPropiedad = false) {
  const attr = porPropiedad ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${nombre}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nombre);
    document.head.appendChild(el);
  }
  el.setAttribute('content', valor);
  return el;
}

export default function Articulo() {
  const { slug } = useParams();
  const articulo = articuloPorSlug(slug);

  useEffect(() => {
    if (!articulo) return;

    const tituloPrevio = document.title;
    document.title = `${articulo.title} | Menttio`;
    ponerMeta('description', articulo.description);
    ponerMeta('og:title', articulo.title, true);
    ponerMeta('og:description', articulo.description, true);
    ponerMeta('og:type', 'article', true);
    ponerMeta('og:image', articulo.image, true);

    const canonical =
      document.querySelector('link[rel="canonical"]') || document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `https://menttio.com/Blog/${articulo.slug}`);
    if (!canonical.parentNode) document.head.appendChild(canonical);

    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: articulo.title,
      description: articulo.description,
      image: articulo.image,
      datePublished: articulo.date,
      inLanguage: 'es',
      author: { '@type': 'Organization', name: 'Menttio' },
      publisher: { '@type': 'Organization', name: 'Menttio' },
      mainEntityOfPage: `https://menttio.com/Blog/${articulo.slug}`,
    });
    document.head.appendChild(ld);

    return () => {
      document.title = tituloPrevio;
      ld.remove();
    };
  }, [articulo]);

  if (!articulo) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#404040] mb-3">No encontramos ese artículo</h1>
          <p className="text-gray-600 mb-6">Puede que haya cambiado de dirección.</p>
          <Link to="/Blog">
            <Button className="bg-[#41f2c0] hover:bg-[#35d4a7] text-[#404040]">
              Ver todos los artículos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const otros = ARTICULOS.filter((a) => a.slug !== articulo.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link
          to="/Blog"
          className="inline-flex items-center gap-2 text-[#0d7a5f] font-medium mb-8 hover:underline"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Todos los artículos
        </Link>

        <article>
          <p className="text-sm font-semibold text-[#0d7a5f] mb-2">{articulo.category}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-[#404040] leading-tight mb-4">
            {articulo.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8">
            <span className="flex items-center gap-1">
              <Calendar size={14} aria-hidden="true" />
              <time dateTime={articulo.date}>{articulo.fecha}</time>
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} aria-hidden="true" />
              {articulo.readTime} de lectura
            </span>
          </div>

          <img
            src={articulo.image}
            alt=""
            className="w-full rounded-2xl mb-8 aspect-[2/1] object-cover"
          />

          <div
            className="articulo text-[#404040] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: articulo.content }}
          />
        </article>

        <div className="mt-12 rounded-2xl bg-gradient-to-br from-[#41f2c0] to-[#2ab88f] p-8 text-center">
          <h2 className="text-2xl font-bold text-[#404040] mb-3">
            Da tu clase. Menttio hace el resto.
          </h2>
          <p className="text-[#404040]/90 mb-6">
            La videollamada se crea sola, la clase queda grabada y el cobro deja de ser cosa tuya.
          </p>
          <a href="/SelectRole">
            <Button className="bg-[#404040] hover:bg-[#303030] text-white px-8 py-5 text-base rounded-xl">
              Empieza gratis 14 días
              <ArrowRight size={18} className="ml-2" aria-hidden="true" />
            </Button>
          </a>
        </div>

        {otros.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-bold text-[#404040] mb-5">Sigue leyendo</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {otros.map((a) => (
                <Link
                  key={a.slug}
                  to={`/Blog/${a.slug}`}
                  className="block rounded-xl border border-gray-200 p-5 hover:border-[#41f2c0] transition-colors"
                >
                  <p className="text-xs font-semibold text-[#0d7a5f] mb-1">{a.category}</p>
                  <p className="font-semibold text-[#404040]">{a.title}</p>
                  <p className="text-sm text-gray-500 mt-2">{a.readTime} de lectura</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
