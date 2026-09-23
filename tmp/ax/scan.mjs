import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const PAGINAS = ['/', '/Contact', '/AboutUs', '/TermsOfService', '/PrivacyPolicy', '/LegalNotice'];
const BASE = 'https://menttio.com';

const navegador = await chromium.launch();
const resumen = {};

for (const ruta of PAGINAS) {
  for (const [nombre, viewport] of [['escritorio', { width: 1280, height: 900 }], ['movil', { width: 375, height: 812 }]]) {
    const ctx = await navegador.newContext({ viewport });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + ruta, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2500);

      const res = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Desbordamiento horizontal: qué elementos se salen del ancho de la ventana.
      const desborde = await page.evaluate(() => {
        const w = document.documentElement.clientWidth;
        const fuera = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (r.right > w + 1 || r.left < -1) {
            fuera.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className || '').toString().slice(0, 70),
              txt: (el.textContent || '').trim().slice(0, 40),
              right: Math.round(r.right), left: Math.round(r.left), win: w,
            });
          }
        }
        return {
          scrollW: document.documentElement.scrollWidth,
          clientW: w,
          culpables: fuera.slice(0, 8),
        };
      });

      const encabezados = await page.evaluate(() =>
        [...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName + ': ' + h.textContent.trim().slice(0, 55))
      );

      resumen[`${ruta} [${nombre}]`] = {
        titulo: await page.title(),
        violaciones: res.violations.map(v => ({
          id: v.id,
          impacto: v.impact,
          n: v.nodes.length,
          desc: v.help,
          ejemplos: v.nodes.slice(0, 4).map(n => ({
            sel: n.target.join(' '),
            html: n.html.slice(0, 150),
            fallo: (n.any[0]?.message || n.all[0]?.message || '').slice(0, 130),
          })),
        })),
        desborde,
        encabezados: encabezados.filter(h => h.startsWith('H1')),
        nH2: encabezados.filter(h => h.startsWith('H2')).length,
      };
    } catch (e) {
      resumen[`${ruta} [${nombre}]`] = { error: e.message };
    }
    await ctx.close();
  }
}

await navegador.close();
console.log(JSON.stringify(resumen, null, 1));
