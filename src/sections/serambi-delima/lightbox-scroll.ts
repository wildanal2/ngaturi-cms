type SavedStyle = {
  element: HTMLElement;
  property: string;
  value: string;
  priority: string;
};
type Lock = { count: number; styles: SavedStyle[] };

// Shared only by Serambi Delima dialogs. Nested owners release the last lock together.
const locks = new WeakMap<Document, Lock>();

export function lockLightboxScroll(document: Document) {
  let lock = locks.get(document);
  if (!lock) {
    const styles: SavedStyle[] = [];
    const set = (element: HTMLElement, property: string, value: string) => {
      styles.push({
        element,
        property,
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
      });
      element.style.setProperty(property, value);
    };
    const gutter = Math.max(
      0,
      (document.defaultView?.innerWidth ??
        document.documentElement.clientWidth) -
        document.documentElement.clientWidth,
    );
    if (gutter && document.defaultView) {
      const padding =
        parseFloat(
          document.defaultView.getComputedStyle(document.body).paddingRight,
        ) || 0;
      set(document.body, "padding-right", `${padding + gutter}px`);
    }
    set(document.documentElement, "overflow", "hidden");
    set(document.body, "overflow", "hidden");
    lock = { count: 0, styles };
    locks.set(document, lock);
  }
  lock.count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lock.count -= 1;
    if (lock.count !== 0) return;
    for (const {
      element,
      property,
      value,
      priority,
    } of lock.styles.reverse()) {
      if (value) element.style.setProperty(property, value, priority);
      else element.style.removeProperty(property);
    }
    locks.delete(document);
  };
}
