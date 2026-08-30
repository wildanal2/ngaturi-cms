export interface DevicePreset {
  id: string;
  label: string;
  category: "phone" | "tablet" | "desktop";
  /** CSS logical px (what `window.innerWidth` reports on the device) */
  width: number;
  height: number;
  /** phone bezel styling */
  notch?: "island" | "notch" | "punch" | "none";
}

export const DEVICES: DevicePreset[] = [
  // ---- phones (logical/CSS px) ----
  { id: "galaxy-s25-ultra", label: "Galaxy S25 · S24 Ultra", category: "phone", width: 412, height: 915, notch: "punch" },
  { id: "galaxy-s25", label: "Galaxy S25 · S24", category: "phone", width: 360, height: 780, notch: "punch" },
  { id: "pixel-9-pro-xl", label: "Pixel 9 Pro XL", category: "phone", width: 412, height: 919, notch: "punch" },
  { id: "pixel-9", label: "Pixel 9", category: "phone", width: 412, height: 915, notch: "punch" },
  { id: "iphone-16-pro-max", label: "iPhone 16 Pro Max", category: "phone", width: 440, height: 956, notch: "island" },
  { id: "iphone-16-pro", label: "iPhone 16 Pro", category: "phone", width: 402, height: 874, notch: "island" },
  { id: "iphone-16", label: "iPhone 16 · 15 · 14", category: "phone", width: 393, height: 852, notch: "island" },
  { id: "iphone-11", label: "iPhone 11 · XR", category: "phone", width: 414, height: 896, notch: "notch" },
  { id: "iphone-se", label: "iPhone SE", category: "phone", width: 375, height: 667, notch: "none" },
  // ---- tablets ----
  { id: "ipad-mini", label: "iPad mini", category: "tablet", width: 744, height: 1133 },
  { id: "ipad-pro-11", label: 'iPad Pro 11"', category: "tablet", width: 834, height: 1194 },
  // ---- desktop ----
  { id: "desktop", label: "Desktop", category: "desktop", width: 1280, height: 800 },
];

export const DEFAULT_DEVICE = "galaxy-s25";

export function getDevice(id: string): DevicePreset {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[1];
}
