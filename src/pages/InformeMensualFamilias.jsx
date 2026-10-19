import React from 'react';
import Articulo from './Articulo';

/**
 * Ruta fija para este articulo.
 *
 * Base44 no prerenderiza el contenido de ninguna pagina: sirve el esqueleto vacio y el texto
 * lo pinta el navegador. Lo que SI inyecta en el servidor son el titulo, la descripcion y el
 * canonico, y lo hace por ruta. Una direccion con parametro (/Blog?articulo=X) hereda las de
 * /Blog, asi que los cinco articulos llegaban a Google con el mismo titulo y la misma
 * descripcion: cinco paginas identicas.
 *
 * Con una ruta propia, cada articulo tiene las suyas. No hace visible el blog por si solo
 * -eso depende de que Google ejecute el JavaScript, que lo hace-, pero quita el duplicado.
 */
export default function InformeMensualFamilias() {
  return <Articulo slug="informe-mensual-para-familias" />;
}
