import { chromium } from 'playwright-core';
import sparticuzChromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let browser = null;
  try {
    // Configurações específicas para o ambiente Serverless da Vercel
    const executablePath = await sparticuzChromium.executablePath();
    
    browser = await chromium.launch({
      args: sparticuzChromium.args,
      executablePath: executablePath,
      headless: sparticuzChromium.headless,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    const page = await context.newPage();
    
    // Exemplo: Navegar para uma URL ou processar algo
    const url = req.query.url || 'https://google.com';
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const title = await page.title();
    const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });

    res.status(200).json({
      success: true,
      title: title,
      screenshot: `data:image/png;base64,${screenshot}`
    });

  } catch (error) {
    console.error('Browser Error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
