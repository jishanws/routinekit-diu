import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const filePath = path.join(rootDir, "preview-mockup.html");

const PORT = 3333;

const server = http.createServer((req, res) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(content);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("preview-mockup.html not found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Mockup preview server running at http://localhost:${PORT}/`);
});
