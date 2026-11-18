import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="9" fill="#09090b" />
  <!-- Clean minimal 'R' monogram -->
  <path
    d="M10 24.5V8.5C10 7.67 10.67 7 11.5 7H16.5C19.8 7 22 9.1 22 12C22 14.9 19.8 17 16.5 17H10"
    stroke="#ffffff"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <path
    d="M16 17L21.5 24.5"
    stroke="#ffffff"
    stroke-width="3"
    stroke-linecap="round"
  />
</svg>
`;

function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  let offset = 6 + 16 * count;
  const entries = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width === 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height === 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Image data offset

    entries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)]);
}

async function generate() {
  const svgBuffer = Buffer.from(svgContent);

  // 1. Write SVGs
  fs.writeFileSync(path.join(rootDir, "src/app/icon.svg"), svgContent);
  fs.writeFileSync(path.join(rootDir, "public/icon.svg"), svgContent);
  console.log("✓ Generated src/app/icon.svg and public/icon.svg");

  // 2. Write PNGs
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  const png180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  const png192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();

  fs.writeFileSync(path.join(rootDir, "src/app/apple-icon.png"), png180);
  fs.writeFileSync(path.join(rootDir, "public/apple-touch-icon.png"), png180);
  fs.writeFileSync(path.join(rootDir, "public/icon-192.png"), png192);
  fs.writeFileSync(path.join(rootDir, "public/icon-512.png"), png512);
  console.log("✓ Generated apple touch icons and high-res PNGs");

  // 3. Write ICO files
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
  ]);

  fs.writeFileSync(path.join(rootDir, "src/app/favicon.ico"), icoBuffer);
  fs.writeFileSync(path.join(rootDir, "public/favicon.ico"), icoBuffer);
  console.log("✓ Generated src/app/favicon.ico and public/favicon.ico (16px, 32px, 48px)");
}

generate().catch((err) => {
  console.error("Failed to generate favicons:", err);
  process.exit(1);
});
