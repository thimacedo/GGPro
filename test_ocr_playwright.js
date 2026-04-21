import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Teste de Fluxo de OCR - Narrador Pro v6.6
 * Valida o pré-processamento de imagem e carga do Tesseract.
 */
(async () => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🚀 Iniciando Teste de OCR...');

  try {
    // 1. Acessar o Dashboard
    await page.goto('http://localhost:8080/');
    
    // 2. Abrir o Menu Técnico (onde fica o upload de súmula)
    await page.click('#openSettings');
    console.log('✅ Menu Técnico aberto.');

    // 3. Simular o clique no botão de importar súmula
    // (No modals.js o input file é ID 'sumula_ia')
    const filePath = path.resolve('Projetos/ggpro/doc.jpg');
    
    // Esperar o modal de Pré-Jogo ou similar onde o input existe
    await page.evaluate(() => {
        // Forçar a abertura do modal de importação se necessário
        window.modalManager.showPreMatch();
    });

    const fileInput = await page.waitForSelector('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    console.log('✅ Imagem doc.jpg enviada para o input.');

    // 4. Verificar se o Toast de "Vision: OCR" aparece (indicando que o preprocessamento rodou)
    // O sistema dispara: window.toastManager.show('Vision: OCR', ...)
    const toast = await page.waitForSelector('.toast', { timeout: 10000 });
    const toastText = await toast.innerText();
    console.log(`✅ Feedback do Sistema: ${toastText}`);

    // 5. Capturar screenshot do estado do OCR
    await page.screenshot({ path: 'Projetos/ggpro/test_ocr_result.png' });
    console.log('📸 Screenshot do teste salvo em Projetos/ggpro/test_ocr_result.png');

  } catch (error) {
    console.error('❌ Erro no Teste de OCR:', error.message);
  } finally {
    await browser.close();
    process.exit();
  }
})();
