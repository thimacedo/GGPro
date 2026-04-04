import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

if (fs.existsSync('dist')) {
  console.log('Tentando remover bloqueios de sistema e atributos de arquivo...');
  try {
    // No Windows, tenta remover atributos que podem impedir a exclus├úo
    if (process.platform === 'win32') {
      try {
        execSync('attrib -r -s -h "dist" /s /d >nul 2>&1');
      } catch (e) {}
    }
    
    console.log('Tentando remover a pasta dist...');
    fs.rmSync('dist', { recursive: true, force: true });
    console.log('Pasta dist removida com sucesso.');
  } catch (e) {
    if (e.code === 'EPERM' || e.code === 'EBUSY') {
      console.warn('\n❌ ERRO DE PERMISSÃO: Não foi possível remover a pasta "dist".');
      console.warn('Isso geralmente acontece porque o comando "npm run dev" está rodando em outro terminal.');
      console.warn('👉 POR FAVOR, PARE O "npm run dev" (Ctrl+C) E TENTE NOVAMENTE.\n');
    } else {
      console.warn('AVISO: Não foi possível remover a pasta dist:', e.message);
    }
  }
} else {
  console.log('Pasta dist não encontrada, pulando limpeza.');
}

console.log('Ambiente de limpeza finalizado.');
process.exit(0);
