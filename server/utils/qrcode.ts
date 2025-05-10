/**
 * Utility functions for QR code handling
 */

/**
 * Format a QR code string to include the data URL prefix if it doesn't already have it
 * @param qrCode The QR code string (base64 or already formatted)
 * @returns Formatted QR code with data URL prefix
 */
export function formatQRCode(qrCode: string | null): string | null {
  if (!qrCode) return null;
  
  if (qrCode.startsWith('data:image/png;base64,')) {
    return qrCode;
  }
  
  return `data:image/png;base64,${qrCode}`;
}

/**
 * Converte um QR code em texto para formato Base64
 * @param qrText O texto do QR code gerado pelo Baileys
 * @returns String Base64 do QR code
 */
export function qrTextToBase64(qrText: string): string {
  try {
    if (qrText.startsWith('data:image/png;base64,')) {
      return qrText;
    }
    
    return formatQRCode(qrText) || '';
  } catch (error) {
    console.error('Erro ao converter QR code para Base64:', error);
    return '';
  }
}
