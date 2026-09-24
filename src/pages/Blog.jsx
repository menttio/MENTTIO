import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ARTICULOS, articuloPorSlug } from '@/data/articulos';
import Articulo from './Articulo';

/**
 * Índice del blog, y también el artículo cuando la dirección lleva ?articulo=<slug>.
 *
 * Antes los artículos se abrían en una ventana emergente desde aquí: ninguno tenía dirección
 * propia, así que Google no podía indexarlos y nadie podía compartir uno. Se les dio la suya,
 * /Blog/<slug>, y seguía sin servir: Base44 sólo prerenderiza rutas fijas, así que a esas
 * direcciones les entregaba la instantánea del índice. Los cinco artículos llegaban a Google
 * con el mismo título, la misma descripción y el mismo contenido: cinco copias de /Blog.
 *
 * Con el identificador en la query, Base44 sí los prerenderiza, porque `content_query_params`
 * incluye "articulo". La ruta con barra se conserva para no romper enlaces ya compartidos,
 * pero la canónica y el mapa del sitio apuntan a esta.
 */
export default function Blog() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('articulo');
  const articulo = slug ? articuloPorSlug(slug) : null;

  useEffect(() => {
    if (articulo) return; // el título lo pone el artículo
    const previo = document.title;
    document.title = 'Blog para profesores particulares | Menttio';
    return () => {
      document.title = previo;
    };
  }, [articulo]);

  if (articulo) return <Articulo slug={slug} />;

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <a
          href="/Home"
          className="inline-flex items-center gap-2 text-[#0d7a5f] font-medium mb-8 hover:underline"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Volver al inicio
        </a>

        <header className="mb-10 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold text-[#404040] mb-3">
            Para profesores particulares
          </h1>
          <p className="text-lg text-gray-600">
            Cobrar, organizarse, poner precio y cumplir con la ley. Lo que nadie te explica
            cuando empiezas a dar clases por tu cuenta.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ARTICULOS.map((a, idx) => (
            <motion.div
              key={a.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link to={`/Blog?articulo=${a.slug}`} className="block h-full group">
                <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-44 overflow-hidden">
                    <img
                      src={a.image}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-5 flex flex-col">
                    <p className="text-xs font-semibold text-[#0d7a5f] mb-2">{a.category}</p>
                    <h2 className="text-lg font-bold text-[#404040] mb-2 leading-snug">
                      {a.title}
                    </h2>
                    <p className="text-sm text-gray-600 flex-1">{a.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-4">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} aria-hidden="true" />
                        <time dateTime={a.date}>{a.fecha}</time>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} aria-hidden="true" />
                        {a.readTime}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[#0d7a5f] font-medium mt-4 text-sm">
                      Leer
                      <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
