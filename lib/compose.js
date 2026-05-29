import sharp from 'sharp';
import QRCode from 'qrcode';

const PRINT_W = 1800;  // 6" at 300 DPI
const PRINT_H = 1200;  // 4" at 300 DPI
const STRIP_H = 90;    // 0.3" border strip at bottom
const QR_SIZE = 75;    // QR code size in pixels
const FONT_SIZE = 22;  // Name text size

/**
 * compositeQR
 * Embeds a QR code into the bottom border strip of a photo print
 * 
 * @param {Buffer|string} photoInput - photo buffer or file path
 * @param {string} qrUrl - URL the QR code links to
 * @param {object} options
 *   gradName     - graduate's name e.g. "Jessica · Class of 2026"
 *   orderNumber  - order number e.g. 42 → prints as #00042
 * @returns {Buffer} print-ready JPEG at 300 DPI
 */
export async function compositeQR(photoInput, qrUrl, options = {}) {
  const {
    gradName    = '',
    orderNumber = null,
  } = options;

  // 1. Resize photo to fill the image area (above the strip)
  const imageH = PRINT_H - STRIP_H;

  const photo = await sharp(photoInput)
    .resize(PRINT_W, imageH, {
      fit: 'cover',
      position: 'centre',
    })
    .toBuffer();

  // 2. Generate QR code as PNG
  const qrPng = await QRCode.toBuffer(qrUrl, {
    type: 'png',
    width: QR_SIZE,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  // 3. Build the bottom border strip as SVG
  const orderText = orderNumber
    ? `#${String(orderNumber).padStart(5, '0')}`
    : '';

  const strip = Buffer.from(`
    <svg width="${PRINT_W}" height="${STRIP_H}" 
         xmlns="http://www.w3.org/2000/svg">
      
      <!-- White background -->
      <rect width="${PRINT_W}" height="${STRIP_H}" fill="white"/>
      
      <!-- Thin separator line at top of strip -->
      <line x1="0" y1="0" x2="${PRINT_W}" y2="0" 
            stroke="#e0e0e0" stroke-width="1"/>

      <!-- Graduate name on the left -->
      <text 
        x="24" 
        y="${STRIP_H / 2 + FONT_SIZE / 3}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${FONT_SIZE}"
        fill="#333333"
        letter-spacing="1"
      >${gradName}</text>

      <!-- Order number centered -->
      <text
        x="${PRINT_W / 2}"
        y="${STRIP_H / 2 + FONT_SIZE / 3}"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="16"
        fill="#aaaaaa"
        letter-spacing="2"
      >${orderText}</text>

      <!-- unmomentoprints.com right of center -->
      <text
        x="${PRINT_W / 2 + 120}"
        y="${STRIP_H / 2 + FONT_SIZE / 3}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="16"
        fill="#aaaaaa"
        letter-spacing="1"
      >unmomentoprints.com</text>

    </svg>`);

  const stripPng = await sharp(strip)
    .resize(PRINT_W, STRIP_H)
    .png()
    .toBuffer();

  // 4. Build the full print canvas
  //    Stack: photo on top, strip on bottom, QR on strip right side
  const result = await sharp({
    create: {
      width:    PRINT_W,
      height:   PRINT_H,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    }
  })
  .composite([
    // Photo fills top portion
    { input: photo, left: 0, top: 0 },

    // White border strip at bottom
    { input: stripPng, left: 0, top: imageH },

    // QR code sits in bottom right of strip, vertically centered
    {
      input: qrPng,
      left:  PRINT_W - QR_SIZE - 18,
      top:   imageH + Math.floor((STRIP_H - QR_SIZE) / 2),
    },
  ])
  .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .withMetadata({ density: 300 })
  .toBuffer();

  return result;
}

/**
 * generatePreview
 * Same layout at screen resolution for customer approval before printing
 */
export async function generatePreview(photoInput, qrUrl, options = {}) {
  const fullRes = await compositeQR(photoInput, qrUrl, options);
  
  // Downscale to 900x600 for fast browser preview
  return sharp(fullRes)
    .resize(900, 600, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();
}