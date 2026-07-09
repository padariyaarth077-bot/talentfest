export async function generatePassPdf(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  );
  if (!blob) throw new Error('Canvas to Blob failed');
  const buf = await blob.arrayBuffer();
  const jpegData = new Uint8Array(buf);

  const pw = 595.28;
  const ph = (canvas.height / canvas.width) * pw;
  const stream = `q ${pw.toFixed(2)} 0 0 ${ph.toFixed(2)} 0 0 cm /Im0 Do Q`;

  const parts: (string | Uint8Array)[] = [];
  const add = (s: string) => parts.push(s);
  const offsets: number[] = [];

  const textEncoder = new TextEncoder();
  const getLen = () => {
    let len = 0;
    for (const p of parts) {
      len += typeof p === 'string' ? textEncoder.encode(p).length : p.length;
    }
    return len;
  };

  add('%PDF-1.4\n');

  offsets.push(getLen());
  add('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets.push(getLen());
  add('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  offsets.push(getLen());
  add(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>\nendobj\n`);

  offsets.push(getLen());
  add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);

  offsets.push(getLen());
  add(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegData.length} >>\nstream\n`);
  parts.push(jpegData);
  add('\nendstream\nendobj\n');

  const xrefOffset = getLen();
  let xref = 'xref\n';
  xref += '0 6\n';
  xref += '0000000000 65535 f \n';
  for (let i = 0; i < 5; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  xref += 'trailer\n';
  xref += '<< /Size 6 /Root 1 0 R >>\n';
  xref += `startxref\n${xrefOffset}\n`;
  xref += '%%EOF';
  add(xref);

  const allParts: Uint8Array[] = parts.map((p) =>
    typeof p === 'string' ? textEncoder.encode(p) : p
  );
  const totalLen = allParts.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of allParts) {
    result.set(p, pos);
    pos += p.length;
  }

  const pdfBlob = new Blob([result], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function renderPassToCanvas(
  canvas: HTMLCanvasElement,
  data: {
    participantName: string;
    entryNumber: string;
    eventName: string;
    qrDataUrl: string;
  }
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve();

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#0B0B0B');
  grad.addColorStop(0.5, '#151515');
  grad.addColorStop(1, '#0B0B0B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const gold = '#C8A96A';
  const white = '#F8F8F8';
  const muted = '#9CA3AF';

  const drawText = (
    text: string,
    x: number,
    y: number,
    color: string,
    size: number,
    bold = false,
    align: CanvasTextAlign = 'left'
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${bold ? 'Inter' : 'Inter'}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  };

  const cx = w / 2;

  const goldGrad = ctx.createLinearGradient(0, 0, w, 0);
  goldGrad.addColorStop(0, '#B8963A');
  goldGrad.addColorStop(0.5, '#C8A96A');
  goldGrad.addColorStop(1, '#D4B87A');

  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.roundRect(30, 100, w - 60, 60, 12);
  ctx.fill();

  ctx.fillStyle = goldGrad;
  ctx.font = 'bold 22px Inter';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ENTRY PASS', cx, 130);

  drawText(data.eventName, cx, 195, gold, 16, true, 'center');

  const cardY = 240;
  ctx.fillStyle = '#151515';
  ctx.beginPath();
  ctx.roundRect(40, cardY, w - 80, 500, 16);
  ctx.fill();

  ctx.strokeStyle = 'rgba(200, 169, 106, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(40, cardY, w - 80, 500, 16);
  ctx.stroke();

  drawText('PARTICIPANT', 70, cardY + 45, muted, 10, false, 'left');
  drawText(data.participantName || 'Your Name', 70, cardY + 80, white, 20, true, 'left');

  drawText('EVENT', 70, cardY + 125, muted, 10, false, 'left');
  drawText(data.eventName, 70, cardY + 155, white, 16, false, 'left');

  drawText('ENTRY NUMBER', 70, cardY + 200, muted, 10, false, 'left');
  drawText(data.entryNumber || '—', 70, cardY + 230, gold, 18, true, 'left');

  ctx.strokeStyle = 'rgba(200, 169, 106, 0.1)';
  ctx.beginPath();
  ctx.moveTo(70, cardY + 355);
  ctx.lineTo(w - 70, cardY + 355);
  ctx.stroke();

  drawText('Present this pass at the gate for entry.', cx, cardY + 405, muted, 11, false, 'center');
  drawText('talentfest.in', cx, cardY + 440, gold, 10, false, 'center');

  if (!data.qrDataUrl) return Promise.resolve();

  const qrSize = 320;
  const qrPadding = 28;
  const qrBox = qrSize + qrPadding * 2;
  const qrX = w - 70 - qrBox;
  const qrY = cardY + 34;
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrBox, qrBox, 14);
      ctx.fill();
      ctx.drawImage(img, qrX + qrPadding, qrY + qrPadding, qrSize, qrSize);
      resolve();
    };
    img.onerror = () => reject(new Error('QR code image failed to load'));
    img.src = data.qrDataUrl;
  });
}
