/**
 * Safe clipboard copy utility with fallback for iframe / document focus restrictions.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // Try Modern Navigator Clipboard API
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard] Navigator writeText failed or document unfocused, executing fallback:', err);
  }

  // Fallback using temporary off-screen textarea and execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (fallbackErr) {
    console.error('[Clipboard] Copy failed completely:', fallbackErr);
    return false;
  }
};
