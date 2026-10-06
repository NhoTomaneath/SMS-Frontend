/** Returns an error message for a document link, or null when it is a valid http(s) URL. */
export function validateDocumentLink(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Please paste a link to your document.";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "The link must start with http:// or https://";
    }
  } catch {
    return "Please enter a valid link (e.g. https://drive.google.com/...)";
  }
  return null;
}
