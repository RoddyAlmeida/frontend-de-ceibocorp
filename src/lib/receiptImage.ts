import html2canvas from 'html2canvas';

/**
 * Captura un elemento DOM como imagen PNG y lo descarga.
 * Clona el nodo y lo monta directo en document.body, fuera de cualquier
 * contenedor con overflow/transform/clip que pueda recortar la captura.
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
    left: '-9999px',
    top: '0',
    width: `${el.offsetWidth}px`,
    height: 'auto',
    overflow: 'visible',
    background: '#ffffff',
  });
  container.appendChild(clone);
  document.body.appendChild(container);

  // Esperar fuentes + un reflow para que el clon se renderice a tamaño completo
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => setTimeout(r, 100));

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    container.remove();
  }
}
