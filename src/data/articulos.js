/**
 * Artículos del blog.
 *
 * Antes vivían dentro de Blog.jsx y se abrían en una ventana emergente: ninguno tenía
 * dirección propia, así que no se podían indexar, ni compartir, ni enlazar. Para Google el
 * blog no existía. Ahora cada uno tiene su `slug` y su página en /Blog/<slug>.
 *
 * Y estaban escritos para alumnos ("5 consejos para aprobar tus exámenes"), cuando quien
 * paga Menttio es el profesor. Todos hablan ahora a profesores particulares.
 */

export const ARTICULOS = [
  {
    slug: 'cobrar-clases-particulares-sin-perseguir-a-nadie',
    title: 'Cómo cobrar tus clases particulares sin perseguir a nadie',
    description:
      'Bizum, transferencia, efectivo o tarjeta: ventajas y problemas reales de cada forma de cobrar clases particulares, y cómo dejar de reclamar pagos.',
    date: '2026-09-23',
    fecha: '23 de septiembre de 2026',
    readTime: '6 min',
    category: 'Gestión',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&auto=format&fit=crop',
    content: `
      <p>Casi ningún profesor particular deja de dar clases porque no sepa explicar. Lo deja porque está harto de la parte de alrededor, y cobrar es la peor de todas: recordar quién debe qué, escribir el mensaje incómodo, apuntar en una libreta lo que ya te han pagado.</p>

      <h2>El problema no es el método, es la memoria</h2>
      <p>Da igual si cobras por Bizum, en efectivo o por transferencia. El problema aparece cuando la única persona que sabe quién ha pagado eres tú, y lo sabes de memoria o en una nota del móvil. Con tres alumnos se lleva. Con doce, un día reclamas una clase que ya estaba pagada, y eso hace más daño a la relación que perder el dinero.</p>
      <p>Antes de cambiar de método, cambia de sitio donde lo apuntas. Que cada clase tenga su estado —pagada o pendiente— y que lo vea también el alumno. La mitad de los recordatorios desaparecen solos, porque la familia ve lo que debe sin que tengas que decírselo.</p>

      <h2>Bizum</h2>
      <p>Es lo que usa casi todo el mundo, y con motivo: es instantáneo, gratuito y todo el mundo lo tiene. El pago llega a tu cuenta sin intermediarios.</p>
      <p>Sus dos pegas. La primera es que no hay confirmación automática: alguien dice que lo ha enviado y tú tienes que mirar el móvil y dar fe. La segunda es que los límites diarios y mensuales de Bizum están pensados para pagos entre amigos, no para una actividad con doce alumnos; si cobras a final de mes, puedes toparte con ellos.</p>

      <h2>Transferencia</h2>
      <p>Sirve para importes grandes, como un paquete de clases o una mensualidad completa. A cambio tarda, el alumno tiene que escribir tu IBAN y el concepto casi nunca dice lo que necesitas. Para clases sueltas es incómodo de más.</p>

      <h2>Efectivo</h2>
      <p>Cero comisiones y cero fricción en el momento. Pero no deja rastro de ningún tipo: si hay una discusión sobre si una clase se pagó o no, no hay nada a lo que agarrarse. Y en clases online, sencillamente no es una opción.</p>

      <h2>Tarjeta</h2>
      <p>Es la única que cobra sola. El alumno paga al reservar, queda registrado sin que nadie confirme nada, y tú no vuelves a pensar en ello. A cambio tiene dos costes.</p>
      <p>Uno es económico: la pasarela se queda una comisión, del orden del 1,5 % más unos céntimos por operación. En una clase de 20 € son unos 55 céntimos.</p>
      <p>El otro es administrativo: para cobrar con tarjeta hay que darse de alta en la pasarela con tu identidad y tu cuenta bancaria. Ese dinero queda registrado, con lo que eso implica para tus obligaciones fiscales. Es la razón real por la que muchos profesores prefieren el Bizum, y conviene decirlo sin rodeos.</p>

      <h2>Qué haríamos nosotros</h2>
      <p>Ofrecer las dos y dejar elegir al alumno. La tarjeta para quien quiera pagar y olvidarse, el Bizum para quien prefiera lo de siempre. Lo que no puede faltar, con cualquiera de las dos, es que el estado de cada clase esté escrito en algún sitio que ambos podáis mirar.</p>
      <p>Porque el objetivo no es cobrar antes. Es no tener que acordarte.</p>

      <h2>Tres cosas que ayudan más que cambiar de método</h2>
      <ul>
        <li><strong>Di el precio antes de la primera clase</strong>, y también cuándo se paga: al reservar, al terminar o a fin de mes. La mayoría de los problemas de cobro son problemas de expectativas.</li>
        <li><strong>Cobra por adelantado las clases sueltas</strong> y a fin de mes las recurrentes. Un alumno fijo no se va a escapar; uno que reserva una clase suelta, a veces sí.</li>
        <li><strong>Ten una política de cancelación escrita</strong>, aunque sea una línea. "Avisando con 24 horas no se cobra" evita muchas más discusiones de las que parece.</li>
      </ul>
    `,
  },
  {
    slug: 'grabar-clases-particulares-consentimiento-menores',
    title: 'Grabar tus clases particulares: qué dice la ley y cómo pedir permiso',
    description:
      'Grabar una clase con un alumno menor de edad exige consentimiento. Qué dice el RGPD, por qué los 14 años son la frontera y cómo pedirlo bien.',
    date: '2026-09-23',
    fecha: '23 de septiembre de 2026',
    readTime: '7 min',
    category: 'Legal',
    image: 'https://images.unsplash.com/photo-1587440871875-191322ee64b0?w=1200&auto=format&fit=crop',
    content: `
      <p>Grabar las clases es de lo que más valoran los alumnos: pueden volver a la explicación las veces que haga falta, y tú dejas de repetir lo mismo tres semanas seguidas. Pero grabar a una persona es tratar sus datos personales, y si además es menor de edad hay reglas que conviene conocer antes de darle al botón.</p>
      <p>No es complicado. Son tres ideas.</p>

      <h2>1. Grabar necesita permiso, y el permiso se pide antes</h2>
      <p>La imagen y la voz de una persona son datos personales. Para grabarlas necesitas una base legal, y en clases particulares esa base es el consentimiento: el alumno (o quien corresponda) dice que sí, sabiendo a qué dice que sí.</p>
      <p>"Sabiendo a qué" significa que antes de grabar tiene que quedar claro para qué es la grabación, quién va a poder verla, cuánto tiempo se guarda y cómo se retira el permiso. Un "¿te importa que grabe?" dicho con la clase ya empezada no cumple eso.</p>

      <h2>2. Por debajo de 14 años, el permiso lo dan los padres</h2>
      <p>Aquí está la frontera que casi nadie conoce. El Reglamento europeo deja a cada país fijar la edad a la que un menor puede consentir por sí mismo, entre los 13 y los 16 años. <strong>España la fijó en los 14</strong> (artículo 7 de la LOPDGDD).</p>
      <p>Es decir: un alumno de 15 años puede autorizar él mismo que grabes su clase. Uno de 13 no, y hace falta el permiso de su padre, su madre o su tutor legal.</p>
      <p>Si das clase a ESO, esto te afecta de lleno: en 1.º y 2.º la mayoría de tus alumnos están por debajo de esa edad.</p>

      <h2>3. El permiso se puede retirar cuando quieran</h2>
      <p>Un consentimiento no es un contrato firmado para siempre. Se puede retirar en cualquier momento y sin dar explicaciones, y retirarlo tiene que ser tan fácil como darlo.</p>
      <p>En la práctica: si un alumno te dice que ya no quiere que se grabe, dejas de grabar desde la siguiente clase. Y conviene tener claro qué pasa con las grabaciones anteriores.</p>

      <h2>Cómo pedirlo sin que parezca un trámite</h2>
      <p>Lo que mejor funciona es pedirlo una sola vez, al principio, por escrito y en lenguaje normal. Algo así:</p>
      <blockquote>
        <p>Grabo las clases para que puedas volver a verlas cuando repases. La grabación la vemos solo tú y yo, se guarda en un enlace privado y puedes pedirme que deje de grabar cuando quieras, sin darme explicaciones.</p>
      </blockquote>
      <p>Y dos detalles que importan:</p>
      <ul>
        <li><strong>Separa el permiso de grabación del resto.</strong> Si lo metes en la misma casilla que "acepto las condiciones", ese consentimiento no vale: tiene que poder decir que sí a una cosa y que no a la otra.</li>
        <li><strong>Guarda constancia de lo que aceptó y cuándo.</strong> No para desconfiar, sino porque si algún día alguien pregunta, la única respuesta válida es enseñarlo.</li>
      </ul>

      <h2>Dónde se guardan las grabaciones importa</h2>
      <p>De poco sirve pedir permiso si luego el vídeo está en un enlace que ve cualquiera que lo tenga. "Cualquiera con el enlace" es exactamente lo que no debe ser: si el enlace se reenvía, se acabó el control.</p>
      <p>Lo correcto es acceso nominal: que cada grabación la puedan abrir solo el alumno que estuvo en esa clase y tú. Y que las grabaciones no se acumulen para siempre sin que nadie haya decidido cuánto tiempo tienen sentido.</p>

      <h2>El resumen</h2>
      <ul>
        <li>Pide permiso <strong>antes</strong> de la primera grabación, no durante.</li>
        <li>Menores de 14: lo da el padre, la madre o el tutor.</li>
        <li>Casilla aparte, nunca mezclada con las condiciones generales.</li>
        <li>Se puede retirar en cualquier momento, y retirarlo debe ser fácil.</li>
        <li>Acceso nominal, no "cualquiera con el enlace".</li>
      </ul>
      <p>Esto no es asesoramiento jurídico: es lo esencial para no meter la pata. Si tu caso tiene particularidades, consúltalo con quien te lleve los temas legales.</p>
    `,
  },
  {
    slug: 'cuanto-cobrar-clase-particular',
    title: 'Cuánto cobrar por una clase particular (y cómo subir el precio)',
    description:
      'Cómo fijar el precio de tus clases particulares partiendo de tus números, no de lo que cobra el vecino, y cómo subirlo a los alumnos que ya tienes.',
    date: '2026-09-23',
    fecha: '23 de septiembre de 2026',
    readTime: '6 min',
    category: 'Gestión',
    image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1200&auto=format&fit=crop',
    content: `
      <p>La pregunta suele formularse mal. No es "cuánto se cobra por una clase particular", porque eso depende de la ciudad, la asignatura, el nivel y de si el alumno viene recomendado o de un anuncio. La pregunta útil es <strong>cuánto necesitas cobrar tú</strong>.</p>

      <h2>Empieza por tus números, no por el mercado</h2>
      <p>Una clase de una hora no te cuesta una hora. Cuesta la hora de clase, más la preparación, más los desplazamientos si los hay, más el rato de organizar, cobrar y responder mensajes. Si das diez clases a la semana, échale un vistazo honesto al tiempo real que le dedicas.</p>
      <p>Haz esta cuenta una vez: <em>lo que quieres ganar al mes, dividido entre las horas que realmente puedes dar</em>. Y recuerda que no todas las semanas son iguales: hay puentes, exámenes, vacaciones y bajas. Si calculas con la semana buena, el mes malo te pilla.</p>
      <p>Si eres autónomo, en esa cuenta entran también la cuota y los impuestos. Es la parte que más se olvida y la que más descuadra.</p>

      <h2>Luego mira el mercado, pero para situarte, no para copiar</h2>
      <p>Mira lo que cobran otros profesores de tu asignatura y tu nivel en tu zona. No para ponerte igual, sino para saber si estás dentro del rango o muy fuera. Estar por debajo del rango no te trae más alumnos: transmite que sabes menos.</p>
      <p>Y hay diferencias legítimas. Preparar la EBAU no vale lo mismo que repasar 1.º de ESO. Física y Química suele pagarse por encima de la media porque hay menos gente que las dé bien. Una clase online te ahorra desplazamiento, pero eso no la hace valer menos: le ahorra desplazamiento al alumno también.</p>

      <h2>Cobra por bloques, no solo por clase suelta</h2>
      <p>Un bono de cuatro u ocho clases te da previsibilidad y al alumno le da compromiso. No hace falta descontar mucho; a veces basta con que exista la opción. Y un alumno que ha comprado cuatro clases falta menos a la segunda.</p>

      <h2>Subir el precio a los que ya tienes</h2>
      <p>Esta es la parte que da miedo, y casi siempre da menos problemas de los que uno imagina. Tres reglas:</p>
      <ul>
        <li><strong>Avisa con antelación.</strong> Un mes es razonable. Lo que sienta mal no es la subida, es enterarse el día que toca pagar.</li>
        <li><strong>Dilo sin pedir perdón y sin justificarte de más.</strong> "A partir de octubre la clase pasa a 22 €" es suficiente. Cuanto más te explicas, más parece negociable.</li>
        <li><strong>Sube a los nuevos primero si te cuesta.</strong> Es la forma menos incómoda de empezar, aunque tarde más en notarse.</li>
      </ul>
      <p>Perder algún alumno al subir no es un fracaso: es lo esperable. Si subes un 10 % y pierdes al 5 % de los alumnos, has ganado dinero y tiempo.</p>

      <h2>Lo que de verdad sostiene un precio</h2>
      <p>No es el título ni los años de experiencia, aunque ayuden. Es que la familia perciba que está pasando algo.</p>
      <p>Un alumno que puede volver a ver la explicación, unos apuntes que no se pierden, y un padre o una madre que sabe en qué va mejorando su hijo: eso sostiene un precio mucho mejor que cualquier argumento. La diferencia entre 18 y 25 € por hora casi nunca está en la clase. Está en todo lo que rodea a la clase.</p>
    `,
  },
  {
    slug: 'organizar-clases-particulares-sin-whatsapp',
    title: 'Organizar tus clases particulares sin vivir en WhatsApp',
    description:
      'Cambios de hora, recordatorios, enlaces de videollamada y apuntes: por qué WhatsApp se queda corto para organizar clases particulares y qué hacer.',
    date: '2026-09-23',
    fecha: '23 de septiembre de 2026',
    readTime: '5 min',
    category: 'Gestión',
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1200&auto=format&fit=crop',
    content: `
      <p>WhatsApp es maravilloso para hablar con la gente y pésimo para organizar nada. Y sin embargo es donde acaban viviendo las clases particulares de casi todo el mundo: los cambios de hora, los enlaces, los "¿te va bien el jueves?", los apuntes en foto y los pagos.</p>
      <p>Funciona hasta que deja de funcionar. Y deja de funcionar siempre por el mismo sitio.</p>

      <h2>Lo que falla</h2>
      <p><strong>Lo acordado se pierde.</strong> Cambiasteis la clase del martes al miércoles hace tres semanas. Está escrito, sí, en algún punto de una conversación de novecientos mensajes. Dos personas recuerdan cosas distintas y ninguna se equivoca de mala fe.</p>
      <p><strong>Tú eres el calendario.</strong> Cada hueco libre lo tienes que consultar tú, y cada cambio lo tienes que propagar tú. Con cuatro alumnos es llevadero; con doce es un trabajo de media jornada que nadie te paga.</p>
      <p><strong>El material se hunde.</strong> Una foto de unos ejercicios que mandaste en noviembre es irrecuperable en febrero. El alumno vuelve a pedírtela y tú vuelves a buscarla.</p>
      <p><strong>No hay separación.</strong> Los mensajes de los alumnos llegan mezclados con los de tu familia, un domingo a las once de la noche. Y como llegan ahí, contestas.</p>

      <h2>Qué hacer, por orden de rentabilidad</h2>
      <p><strong>Saca la disponibilidad de tu cabeza.</strong> Que exista un sitio donde se vean tus huecos y el alumno elija, en vez de tres mensajes de ida y vuelta por cada clase. Es lo que más tiempo ahorra de todo.</p>
      <p><strong>Que el enlace de la videollamada no lo mandes tú.</strong> Cada clase debería tener el suyo, creado solo y disponible donde el alumno ya está mirando. Mandar enlaces a mano es de esas tareas que ocupan diez segundos y aparecen doce veces por semana.</p>
      <p><strong>Deja los apuntes donde no se pierdan.</strong> Asociados a la clase o al alumno, no a un mensaje. Si el alumno puede encontrarlos solo, dejas de ser su buscador.</p>
      <p><strong>Escribe el estado del pago en algún sitio compartido.</strong> No para controlar a nadie: para que las familias vean lo que deben sin que tengas que decírselo.</p>

      <h2>Y una cosa que no es de organización pero lo parece</h2>
      <p>Cuando una familia pregunta "¿cómo va mi hijo?", la respuesta suele ser un resumen improvisado en un audio. Si después de cada clase dejas dos líneas sobre qué se dio y cómo fue, a final de mes tienes algo que contar que no te has inventado sobre la marcha.</p>
      <p>Cuesta treinta segundos por clase y es, con diferencia, lo que más hace por renovar un alumno en junio.</p>

      <h2>El objetivo</h2>
      <p>No es tener más aplicaciones. Es que WhatsApp vuelva a ser lo que era: un sitio para hablar con la gente. Todo lo que es administración —horarios, enlaces, materiales, pagos, seguimiento— debería estar en otro lado, y sobre todo debería estar en un lado donde el alumno pueda mirarlo sin preguntarte.</p>
    `,
  },
  {
    slug: 'informe-mensual-para-familias',
    title: 'El informe mensual para las familias: qué contar y qué no',
    description:
      'Quien paga las clases de un menor es su familia, y lo que quiere saber es si avanza. Cómo montar un informe mensual útil y honesto.',
    date: '2026-09-23',
    fecha: '23 de septiembre de 2026',
    readTime: '5 min',
    category: 'Profesores',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&auto=format&fit=crop',
    content: `
      <p>Hay una asimetría incómoda en las clases particulares de menores: quien recibe la clase es el alumno, pero quien la paga es su padre o su madre. Y esa persona, que decide cada mes si la cosa sigue, muchas veces no tiene ni idea de lo que pasa en esa hora.</p>
      <p>Cuando llega junio y hay que decidir si se sigue en septiembre, esa falta de información juega en tu contra. No porque el trabajo sea malo, sino porque no se ve.</p>

      <h2>Por qué un informe mensual, y no un mensaje cuando toca</h2>
      <p>Porque lo que se hace cuando toca no se hace. Y porque un mensaje suelto llega siempre en un momento raro: o después de un examen malo, y parece una excusa, o después de uno bueno, y parece que te cuelgas la medalla.</p>
      <p>Un informe que llega el día 1 de cada mes, pase lo que pase, no parece nada. Es simplemente cómo trabajas.</p>

      <h2>Qué debería llevar</h2>
      <ul>
        <li><strong>Cuántas clases y cuántas horas.</strong> Suena tonto y es lo primero que mira quien paga.</li>
        <li><strong>Qué se ha dado.</strong> Los temas concretos, no "repaso general".</li>
        <li><strong>Cómo ha ido cada una.</strong> Aquí está el valor, y también el trabajo: si no anotas nada después de cada clase, a fin de mes no tienes nada que contar.</li>
        <li><strong>Qué toca el mes que viene.</strong> Da la sensación de que hay un plan, porque lo hay.</li>
      </ul>

      <h2>Qué no debería llevar</h2>
      <p><strong>Adornos.</strong> Si el mes ha sido flojo, el informe dice que ha sido flojo. Un informe que siempre da buenas noticias deja de leerse a los tres meses, y lo que es peor, deja de creerse.</p>
      <p><strong>Cosas que el alumno te ha contado en confianza.</strong> Esto es delicado. En clases particulares los alumnos hablan, y a veces cuentan cosas de casa, del instituto o de ellos mismos que no tienen nada que ver con las matemáticas. Eso no va en el informe. Lo que se cuenta a la familia es lo académico.</p>
      <p><strong>Diagnósticos que no te corresponden.</strong> Puedes decir que le cuesta concentrarse en clases de tarde. No puedes decir que tiene un problema de atención.</p>

      <h2>Una cosa que conviene tener clara</h2>
      <p>Si el alumno tiene 16 o 17 años, es menor pero ya decide sobre buena parte de sus datos. Que sepa que existe ese informe y qué se cuenta en él. No hace falta pedirle autorización para informar a sus padres de cómo van las clases que ellos pagan, pero sí que no se entere por sorpresa.</p>
      <p>La regla sencilla: nada en ese informe debería sorprender al alumno si lo leyera.</p>

      <h2>Lo que consigue</h2>
      <p>Tres cosas, y ninguna es la obvia.</p>
      <p>La primera es que la familia deja de estar a ciegas, y una familia informada renueva más.</p>
      <p>La segunda es que <strong>te obliga a anotar</strong>. Saber que el día 1 tienes que contar el mes hace que después de cada clase dediques treinta segundos a escribir qué se dio y cómo fue. Ese hábito vale por sí solo más que el informe.</p>
      <p>Y la tercera es que, cuando llegue una conversación difícil —un alumno que no avanza, una subida de precio—, llegas con un mes a mes por escrito en vez de con tu palabra contra la suya.</p>
    `,
  },
];

export function articuloPorSlug(slug) {
  return ARTICULOS.find((a) => a.slug === slug) || null;
}
