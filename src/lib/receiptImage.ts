import html2canvas from 'html2canvas';

const MAX_CANVAS_SIDE = 4096;

/**
 * Captura un elemento DOM como imagen PNG y lo descarga.
 * Clona el nodo y lo monta visible pero invisible (opacity 0) en el viewport,
 * para evitar que html2canvas en iOS capture en blanco elementos fuera del
 * viewport. La descarga usa blob + anchor anexado al DOM (patrón que Safari
 * iOS sí respeta; los data-URIs y los anchors sueltos fallan en silencio).
 */
export async function downloadReceiptAsImage(
  el: HTMLElement,
  filename: string,
): Promise<void> {
  await document.fonts.ready;

  const clone = el.cloneNode(true) as HTMLElement;
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${el.offsetWidth}px`,
    height: 'auto',
    overflow: 'visible',
    background: '#ffffff',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '-1',
  });
  container.appendChild(clone);
  document.body.appendChild(container);

  // Esperar fuentes + un reflow para que el clon se renderice a tamaño completo
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 100));

  try {
    const width = clone.offsetWidth || el.offsetWidth;
    const height = clone.offsetHeight || el.offsetHeight;
    const longestSide = Math.max(width, height) || 1;
    const scale = Math.min(2, Math.max(1, Math.floor(MAX_CANVAS_SIDE / longestSide)));

    const canvas = await html2canvas(clone, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    await downloadCanvas(canvas, filename);
  } finally {
    container.remove();
  }
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo generar la imagen del recibo'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}
