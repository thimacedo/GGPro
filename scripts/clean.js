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
    console.warn('AVISO: Não foi possível remover a pasta dist. Ela pode estar bloqueada por outro processo (ex: npm run dev).');
  }
} else {
  console.log('Pasta dist não encontrada, pulando limpeza.');
}

console.log('Ambiente de limpeza finalizado.');
process.exit(0);
