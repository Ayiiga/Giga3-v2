/** A fixed landscape canvas keeps the certificate proportions on every screen. */
export function createCertificateImage({ recipient, course, date, serial, completion }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Certificate image could not be created. Please reopen this page.');
  const violet = '#43106c';
  const gold = '#d5a126';
  const ribbon = context.createLinearGradient(0, 0, 1536, 0);
  ribbon.addColorStop(0, '#7a4007');
  ribbon.addColorStop(0.3, '#f5cc60');
  ribbon.addColorStop(0.55, '#ffebaa');
  ribbon.addColorStop(1, '#a86b0a');
  context.fillStyle = violet;
  context.fillRect(0, 0, 1536, 1024);
  context.fillStyle = '#fcf9ff';
  context.fillRect(28, 28, 1480, 968);
  context.strokeStyle = gold;
  context.lineWidth = 5;
  context.strokeRect(18, 18, 1500, 988);
  context.lineWidth = 2;
  context.strokeRect(38, 38, 1460, 948);
  context.save();
  context.translate(0, 85);
  context.rotate(-0.35);
  context.fillStyle = ribbon;
  context.fillRect(-100, -25, 550, 40);
  context.restore();
  context.save();
  context.translate(1260, 1000);
  context.rotate(-0.35);
  context.fillStyle = ribbon;
  context.fillRect(-120, -25, 550, 40);
  context.restore();

  function text(value, y, size, { color = violet, font = 'Georgia', weight = 'normal', max = 1320, x = 768 } = {}) {
    context.fillStyle = color;
    context.textAlign = 'center';
    let fittedSize = size;
    context.font = weight + ' ' + fittedSize + 'px ' + font;
    while (context.measureText(value).width > max && fittedSize > 15) {
      fittedSize -= 1;
      context.font = weight + ' ' + fittedSize + 'px ' + font;
    }
    context.fillText(value, x, y);
  }
  text('GIGALEARN ACADEMY', 102, 26, { weight: 'bold', font: 'Arial' });
  text('CERTIFICATE OF', 190, 74, { weight: 'bold' });
  context.fillStyle = ribbon;
  context.fillRect(350, 215, 836, 90);
  text('COMPLETION', 280, 68, { weight: 'bold' });
  text('This certifies that', 365, 34, { weight: 'italic' });
  text(recipient, 455, 74, { weight: 'bold' });
  context.fillStyle = gold;
  context.fillRect(250, 480, 1036, 3);
  text('has successfully completed', 535, 33, { weight: 'italic' });
  context.fillStyle = violet;
  context.fillRect(230, 565, 1076, 105);
  context.strokeStyle = gold;
  context.lineWidth = 4;
  context.strokeRect(230, 565, 1076, 105);
  text(course, 636, 54, { color: '#fff', weight: 'bold', max: 1010 });
  text(completion, 715, 29, { weight: 'italic' });
  text('Issued ' + date, 773, 29, { font: 'Arial', weight: 'bold' });

  context.strokeStyle = gold;
  context.lineWidth = 2;
  context.strokeRect(90, 820, 490, 85);
  text('Certificate serial', 850, 21, { x: 335, font: 'Arial', max: 450 });
  text(serial, 885, 25, { x: 335, font: 'monospace', weight: 'bold', max: 450 });
  context.beginPath();
  context.arc(768, 860, 60, 0, Math.PI * 2);
  context.fillStyle = violet;
  context.fill();
  context.strokeStyle = gold;
  context.lineWidth = 8;
  context.stroke();
  text('GLA', 874, 32, { color: '#ffe39a', weight: 'bold' });
  text('A B Issaka', 840, 40, { x: 1170, max: 490, weight: 'italic' });
  context.fillStyle = gold;
  context.fillRect(960, 855, 420, 2);
  text('Ayiiga Benard Issaka', 890, 24, { x: 1170, font: 'Arial', weight: 'bold', max: 470 });
  text('Founder, Giga3 AI', 922, 23, { x: 1170, font: 'Arial', max: 470 });
  text('Giga3 AI', 958, 25, { x: 210, font: 'Arial', weight: 'bold', max: 350 });
  return canvas.toDataURL('image/png');
}
