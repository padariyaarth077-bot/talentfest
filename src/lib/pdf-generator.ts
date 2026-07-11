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

export type SingleSidedPassData = {
  passNumber: string;
  passType: string;
  participantName: string;
  eventName: string;
  eventCity: string;
  eventDate: string;
  startTime: string;
  venue: string;
  activityCategory: string;
  eventImageUrl?: string;
  qrDataUrl: string;
  status: string;
};

export function renderSingleSidedPassToCanvas(
  canvas: HTMLCanvasElement,
  data: SingleSidedPassData
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve();

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const bgGrad = ctx.createLinearGradient(0, 0, w, 0);
  bgGrad.addColorStop(0, '#0B0B0B');
  bgGrad.addColorStop(1, '#151515');
  ctx.fillStyle = bgGrad;
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
    ctx.font = `${bold ? 'bold ' : ''}${size}px Inter, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  };

  const passTypeLabels: Record<string, string> = {
    participant: 'PARTICIPANT PASS',
    guest_1: 'GUEST 1 PASS',
    guest_2: 'GUEST 2 PASS',
    visitor: 'VISITOR ENTRY PASS',
  };

  // Event image section (left ~40%)
  const imgSectionW = Math.round(w * 0.4);
  const imgX = 0;
  const imgY = 0;
  const imgH = h;

  ctx.fillStyle = '#151515';
  ctx.fillRect(imgX, imgY, imgSectionW, imgH);
  ctx.strokeStyle = 'rgba(200, 169, 106, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(imgX, imgY, imgSectionW, imgH);

  // Info section (right ~60%)
  const infoX = imgSectionW + 20;
  const infoW = w - imgSectionW - 40;

  // Draw event image or fallback
  if (data.eventImageUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    return new Promise<void>(async (resolve) => {
      img.onload = async () => {
        const imgRatio = img.width / img.height;
        const sectionRatio = imgSectionW / imgH;
        let drawW: number, drawH: number, dx: number, dy: number;
        if (imgRatio > sectionRatio) {
          drawW = imgSectionW;
          drawH = imgSectionW / imgRatio;
          dx = imgX;
          dy = imgY + (imgH - drawH) / 2;
        } else {
          drawH = imgH;
          drawW = imgH * imgRatio;
          dx = imgX + (imgSectionW - drawW) / 2;
          dy = imgY;
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(imgX, imgY, imgSectionW, imgH);
        ctx.clip();
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.restore();
        await drawDetails();
        resolve();
      };
      img.onerror = async () => {
        drawFallbackImage();
        await drawDetails();
        resolve();
      };
      img.src = data.eventImageUrl;
    });
  }

  drawFallbackImage();
  return drawDetails();

  function drawFallbackImage() {
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(imgX, imgY, imgSectionW, imgH);

    const goldGradSmall = ctx.createLinearGradient(0, 0, 0, 60);
    goldGradSmall.addColorStop(0, '#B8963A');
    goldGradSmall.addColorStop(1, '#D4B87A');
    ctx.fillStyle = goldGradSmall;
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TELENT FEST', imgX + imgSectionW / 2, imgY + imgH / 2 - 20);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = muted;
    ctx.fillText(data.eventName || 'TelentFest', imgX + imgSectionW / 2, imgY + imgH / 2 + 30);
  }

  async function drawDetails(): Promise<void> {
    const label = passTypeLabels[data.passType] || 'PASS';

    // Gold top bar with pass type
    const goldBarGrad = ctx.createLinearGradient(infoX, 0, infoX + infoW, 0);
    goldBarGrad.addColorStop(0, '#B8963A');
    goldBarGrad.addColorStop(0.5, '#C8A96A');
    goldBarGrad.addColorStop(1, '#D4B87A');

    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.roundRect(infoX, 20, infoW, 44, 8);
    ctx.fill();

    ctx.fillStyle = goldBarGrad;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, infoX + infoW / 2, 42);

    // Event name
    drawText(data.eventName, infoX, 90, gold, 14, true);
    drawText(data.eventCity, infoX + infoW, 90, muted, 11, false, 'right');

    // Divider
    ctx.strokeStyle = 'rgba(200, 169, 106, 0.2)';
    ctx.beginPath();
    ctx.moveTo(infoX, 110);
    ctx.lineTo(infoX + infoW, 110);
    ctx.stroke();

    // Details section
    const detailsY = 130;
    const lineH = 38;

    drawText('PARTICIPANT / VISITOR', infoX, detailsY, muted, 9);
    drawText(data.participantName || 'Name', infoX, detailsY + lineH, white, 18, true);
    drawText('PASS NUMBER', infoX, detailsY + lineH * 2 + 5, muted, 9);
    drawText(data.passNumber || '—', infoX, detailsY + lineH * 3 + 5, gold, 16, true);

    if (data.activityCategory && data.passType === 'participant') {
      drawText('CATEGORY', infoX, detailsY + lineH * 4 + 10, muted, 9);
      drawText(data.activityCategory, infoX, detailsY + lineH * 5 + 10, white, 13);
    }

    drawText('DATE / TIME', infoX + infoW / 2, detailsY + lineH * 4 + 10, muted, 9);
    drawText(`${data.eventDate || 'TBD'} ${data.startTime || ''}`, infoX + infoW / 2, detailsY + lineH * 5 + 10, white, 13);

    if (data.venue) {
      drawText('VENUE', infoX, detailsY + lineH * 6 + 10, muted, 9);
      drawText(data.venue, infoX, detailsY + lineH * 7 + 10, white, 13);
    }

    // Status badge
    const statusColor = data.status === 'active' ? '#10B981' : data.status === 'checked_in' ? '#3B82F6' : '#EF4444';
    const statusBg = data.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : data.status === 'checked_in' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    const statusText = data.status === 'active' ? 'PAYMENT CONFIRMED' : data.status.toUpperCase().replace('_', ' ');

    ctx.fillStyle = statusBg;
    ctx.beginPath();
    ctx.roundRect(infoX + infoW - 160, 20, 150, 28, 14);
    ctx.fill();

    ctx.fillStyle = statusColor;
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusText, infoX + infoW - 85, 34);

    // QR code
    const qrSize = 180;
    const qrPadding = 14;
    const qrBox = qrSize + qrPadding * 2;
    const qrX = infoX + infoW - qrBox;
    const qrY = h - qrBox - 25;

    if (data.qrDataUrl) {
      await new Promise<void>((resolve) => {
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.roundRect(qrX, qrY, qrBox, qrBox, 12);
          ctx.fill();
          ctx.drawImage(qrImg, qrX + qrPadding, qrY + qrPadding, qrSize, qrSize);
          resolve();
        };
        qrImg.onerror = () => resolve();
        qrImg.src = data.qrDataUrl;
      });
    }

    // Gate instruction
    drawText('Present this pass and a valid identification document at the entry gate.', infoX, h - 12, muted, 8, false, 'left');

    // Gold border
    ctx.strokeStyle = 'rgba(200, 169, 106, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 16);
    ctx.stroke();
  }
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
