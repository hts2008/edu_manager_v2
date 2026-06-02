export class PdfOpenError extends Error {
  constructor(message, code = 'PDF_OPEN_FAILED') {
    super(message);
    this.name = 'PdfOpenError';
    this.code = code;
  }
}

async function getApiErrorMessage(response) {
  try {
    const body = await response.json();
    return body?.error?.message || body?.message || 'May chu khong the tao PDF.';
  } catch {
    return 'May chu khong the tao PDF.';
  }
}

function writePopupShell(popup, message = 'Dang tai PDF...') {
  try {
    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>EduManager PDF</title>
          <style>
            html, body { height: 100%; margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
            .state { display: flex; align-items: center; justify-content: center; height: 100%; padding: 24px; text-align: center; }
            iframe { width: 100%; height: 100%; border: 0; background: white; }
          </style>
        </head>
        <body><div class="state">${message}</div></body>
      </html>
    `);
    popup.document.close();
  } catch {
    // Browser security policies can block popup document writes.
  }
}

function writePopupError(popup, message) {
  try {
    popup.document.body.innerHTML = `<div class="state">${message}</div>`;
  } catch {
    // The caller toast still reports the failure.
  }
}

export async function openAuthenticatedPdf(endpoint, options = {}) {
  const { autoPrint = true } = options;
  const popup = window.open('about:blank', '_blank');
  if (!popup) {
    throw new PdfOpenError('Trinh duyet da chan cua so in PDF.', 'POPUP_BLOCKED');
  }
  writePopupShell(popup);

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new PdfOpenError(await getApiErrorMessage(response));
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.includes('application/pdf')) {
      throw new PdfOpenError('May chu tra ve du lieu khong phai PDF.');
    }

    const blob = await response.blob();
    const pdfBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);

    try {
      popup.document.body.innerHTML = '';
      const iframe = popup.document.createElement('iframe');
      iframe.src = url;
      iframe.title = 'EduManager PDF';
      iframe.addEventListener('load', () => {
        if (!autoPrint) return;
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          popup.focus();
        }
      });
      popup.document.body.appendChild(iframe);
    } catch {
      popup.location.href = url;
    }

    try {
      popup.opener = null;
    } catch {
      // Some browsers disallow changing opener after navigation.
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    writePopupError(
      popup,
      error?.message || 'Khong the tao PDF. Vui long thu lai.'
    );
    throw error;
  }
}

export async function openAuthenticatedPdfs(endpoints, options = {}) {
  const uniqueEndpoints = [...new Set((endpoints || []).filter(Boolean))];
  if (!uniqueEndpoints.length) {
    throw new PdfOpenError('Khong co PDF de in.');
  }

  const popup = window.open('about:blank', '_blank');
  if (!popup) {
    throw new PdfOpenError('Trinh duyet da chan cua so in PDF.', 'POPUP_BLOCKED');
  }
  writePopupShell(popup, `Dang tai ${uniqueEndpoints.length} PDF...`);

  const { autoPrint = true } = options;
  const objectUrls = [];

  try {
    const token = localStorage.getItem('token');
    const responses = await Promise.all(
      uniqueEndpoints.map(async (endpoint) => {
        const response = await fetch(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new PdfOpenError(await getApiErrorMessage(response));
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType && !contentType.includes('application/pdf')) {
          throw new PdfOpenError('May chu tra ve du lieu khong phai PDF.');
        }

        const blob = await response.blob();
        const pdfBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        objectUrls.push(url);
        return url;
      })
    );

    popup.document.body.innerHTML = '';
    const container = popup.document.createElement('div');
    container.style.display = 'grid';
    container.style.gap = '16px';
    container.style.padding = '16px';
    popup.document.body.appendChild(container);

    let loaded = 0;
    responses.forEach((url, index) => {
      const iframe = popup.document.createElement('iframe');
      iframe.src = url;
      iframe.title = `EduManager PDF ${index + 1}`;
      iframe.style.width = '100%';
      iframe.style.height = '100vh';
      iframe.style.border = '0';
      iframe.addEventListener('load', () => {
        loaded += 1;
        if (autoPrint && loaded === responses.length) {
          try {
            popup.focus();
            popup.print();
          } catch {
            // Popup still contains the PDFs for manual printing.
          }
        }
      });
      container.appendChild(iframe);
    });

    window.setTimeout(() => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    }, 120_000);
  } catch (error) {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    writePopupError(
      popup,
      error?.message || 'Khong the tao PDF. Vui long thu lai.'
    );
    throw error;
  }
}
