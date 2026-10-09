/** Keep invitation copy in the primary scroll flow, including while editing. */
export function resizeCinematicTextarea(field: HTMLTextAreaElement) {
  field.style.height = "auto";
  const style = getComputedStyle(field);
  const border =
    (parseFloat(style.borderTopWidth) || 0) +
    (parseFloat(style.borderBottomWidth) || 0);
  field.style.height = `${Math.ceil(field.scrollHeight + border)}px`;
}
