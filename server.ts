import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { exec } from "child_process";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Import do file system fallback para Vite SPA
    const fs = await import('fs');
    // Express 5 não suporta "*" puramente sem regex explícito ou nome. Omitir o caminho captura tudo.
    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });

  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Express 5 regex wildcard para servir o index.html na produção
    app.get(/(.*)/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Abre o navegador automaticamente em modo desenvolvimento (Windows)
    if (process.env.NODE_ENV !== "production") {
      const url = `http://localhost:${PORT}`;
      const command = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
      exec(command);
    }
  });
}

startServer();
