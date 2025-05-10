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
