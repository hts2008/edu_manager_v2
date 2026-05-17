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
    return body?.error?.message || body?.message || 'Máy chủ không thể tạo PDF.';
  } catch {
    return 'Máy chủ không thể tạo PDF.';
  }
}

export async function openAuthenticatedPdf(endpoint) {
  const popup = window.open('about:blank', '_blank');
  if (!popup) {
    throw new PdfOpenError('Trình duyệt đã chặn cửa sổ in PDF.', 'POPUP_BLOCKED');
  }

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
      throw new PdfOpenError('Máy chủ trả về dữ liệu không phải PDF.');
    }

    const blob = await response.blob();
    const pdfBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(pdfBlob);
    popup.location.href = url;

    try {
      popup.opener = null;
    } catch {
      // Some browsers disallow changing opener after navigation.
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    popup.close();
    throw error;
  }
}
