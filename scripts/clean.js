import fs from 'fs';

if (fs.existsSync('dist')) {
  console.log('Tentando remover a pasta dist...');
  try {
    fs.rmSync('dist', { recursive: true, force: true });
    console.log('Pasta dist removida com sucesso.');
  } catch (e) {
    console.warn('AVISO: Não foi possível remover a pasta dist. Ela pode estar bloqueada por outro processo.');
  }
} else {
  console.log('Pasta dist não encontrada, pulando limpeza.');
}

process.exit(0);
