import express from "express";
import path from "path";
import cors from "cors";
import { exec } from "child_process";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve static files from root and js directory
app.use(express.static(process.cwd()));
app.use('/js', express.static(path.join(process.cwd(), 'js')));

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 GGPro Vanilla Server running on http://localhost:${PORT}`);
  
  if (process.env.NODE_ENV !== "production") {
    const url = `http://localhost:${PORT}`;
    const command = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(command);
  }
});
