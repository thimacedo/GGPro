import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080');
  await page.waitForTimeout(2000); // Esperar renderização da IA e animações
  await page.screenshot({ path: 'Projetos/ggpro/render_v6_6.png' });
  await browser.close();
  console.log('Screenshot salvo em Projetos/ggpro/render_v6_6.png');
})();
