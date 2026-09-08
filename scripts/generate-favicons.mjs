import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '..', 'public', 'brand', 'telentfest-icon.png');
const out = path.join(__dirname, '..', 'public');

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-192x192.png', size: 192 },
  { name: 'favicon-512x512.png', size: 512 },
];

async function generate() {
  console.log('Source:', src);
  for (const { name, size } of sizes) {
    const dest = path.join(out, name);
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 10, g: 37, b: 64, alpha: 1 } })
      .png()
      .toFile(dest);
    console.log(`Created: ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (multi-size: 16, 32, 48)
  const ico16 = await sharp(src).resize(16, 16, { fit: 'contain', background: { r: 10, g: 37, b: 64, alpha: 1 } }).png().toBuffer();
  const ico32 = await sharp(src).resize(32, 32, { fit: 'contain', background: { r: 10, g: 37, b: 64, alpha: 1 } }).png().toBuffer();
  const ico48 = await sharp(src).resize(48, 48, { fit: 'contain', background: { r: 10, g: 37, b: 64, alpha: 1 } }).png().toBuffer();

  // For ICO format, we write a PNG-based ico (browsers accept single-png ico)
  const ico32File = path.join(out, 'favicon.ico');
  await sharp(src).resize(32, 32, { fit: 'contain', background: { r: 10, g: 37, b: 64, alpha: 1 } }).png().toFile(ico32File);
  console.log('Created: favicon.ico (32x32 PNG-based)');

  console.log('\nAll favicons generated successfully!');
}

generate().catch(console.error);
