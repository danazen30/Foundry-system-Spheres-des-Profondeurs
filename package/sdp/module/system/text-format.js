/**
 * Convertit du texte brut (lang JSON) en HTML affichable.
 * - \n\n → paragraphes
 * - \n   → saut de ligne dans un paragraphe
 */
export function formatPlainTextAsHtml(text = "") {

  const source =
    typeof text === "string"
      ? text
      : "";

  if (!source.trim()) return "";

  if (/<[a-z][\s\S]*>/i.test(source)) {
    return source;
  }

  return source
    .split(/\n{2,}/)
    .map(paragraph => {

      const body = paragraph
        .trim()
        .split(/\n/)
        .map(line => foundry.utils.escapeHTML(line.trim()))
        .filter(Boolean)
        .join("<br>");

      return body ? `<p>${body}</p>` : "";

    })
    .filter(Boolean)
    .join("");

}
