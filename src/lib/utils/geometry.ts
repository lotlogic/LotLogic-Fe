import * as turf from '@turf/turf';

// -----------------------------
// Types
// -----------------------------
export type Pt = [number, number];

export type SetbackValues = {
  front: number;
  side: number;
  rear: number;
};

// -----------------------------
// Geometry helpers (per-side inset in meters)
// Assumes quad ring order: S1(front)=p0->p1, S2=p1->p2, S3=p2->p3, S4(rear)=p3->p0
// -----------------------------

export function polygonOrientation(points: Pt[]): number {
  let sum = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    sum += (x2 - x1) * (y2 + y1);
  }
  return sum; // >0 CCW, <0 CW
}

export function unit(vec: Pt): Pt {
  const len = Math.hypot(vec[0], vec[1]) || 1;
  return [vec[0] / len, vec[1] / len];
}

export function offsetEdge(p1: Pt, p2: Pt, inwardNormal: Pt, d: number): [Pt, Pt] {
  return [
    [p1[0] + inwardNormal[0] * d, p1[1] + inwardNormal[1] * d],
    [p2[0] + inwardNormal[0] * d, p2[1] + inwardNormal[1] * d],
  ];
}

export function intersectLines(a1: Pt, a2: Pt, b1: Pt, b2: Pt): Pt {
  const x1 = a1[0], y1 = a1[1], x2 = a2[0], y2 = a2[1];
  const x3 = b1[0], y3 = b1[1], x4 = b2[0], y4 = b2[1];
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-9) return a2;
  const px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / den;
  const py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / den;
  return [px, py];
}

export function insetQuadPerSideLL(
  ringLL: Pt[], // closed ring [p0,p1,p2,p3,p0]
  sides: SetbackValues
): Pt[] | null {
  if (!ringLL || ringLL.length < 5) return null;

  const ringMerc = (turf.toMercator(turf.polygon([ringLL])) as any)
    .geometry.coordinates[0] as Pt[];

  const p0 = ringMerc[0], p1 = ringMerc[1], p2 = ringMerc[2], p3 = ringMerc[3];

  const ori = polygonOrientation([p0, p1, p2, p3, p0]); // >0 CCW, <0 CW
  const sign = ori > 0 ? -1 : 1; // inward normal direction

  const v01 = unit([p1[0] - p0[0], p1[1] - p0[1]]);
  const v12 = unit([p2[0] - p1[0], p2[1] - p1[1]]);
  const v23 = unit([p3[0] - p2[0], p3[1] - p2[1]]);
  const v30 = unit([p0[0] - p3[0], p0[1] - p3[1]]);

  const n01: Pt = [sign * -v01[1], sign * v01[0]]; // front (S1)
  const n12: Pt = [sign * -v12[1], sign * v12[0]]; // side  (S2)
  const n23: Pt = [sign * -v23[1], sign * v23[0]]; // side  (S3)
  const n30: Pt = [sign * -v30[1], sign * v30[0]]; // rear  (S4)

  const [a0, a1] = offsetEdge(p0, p1, n01, sides.front);
  const [b0, b1] = offsetEdge(p1, p2, n12, sides.side);
  const [c0, c1] = offsetEdge(p2, p3, n23, sides.side);
  const [d0, d1] = offsetEdge(p3, p0, n30, sides.rear);

  const q0 = intersectLines(d0, d1, a0, a1);
  const q1 = intersectLines(a0, a1, b0, b1);
  const q2 = intersectLines(b0, b1, c0, c1);
  const q3 = intersectLines(c0, c1, d0, d1);

  const innerMerc = [q0, q1, q2, q3, q0] as Pt[];
  const innerLL = (turf.toWgs84(turf.polygon([innerMerc])) as any)
    .geometry.coordinates[0] as Pt[];

  return innerLL;
}

// -----------------------------
// Label creation utility
// -----------------------------
export function createSValueLabel(text: string, position: 'top' | 'right' | 'bottom' | 'left' | 'center') {
  const el = document.createElement('div');
  el.style.background = '#FF6B6B';
  el.style.border = '2px solid #FF4757';
  el.style.borderRadius = '6px';
  el.style.padding = '6px 10px';
  el.style.fontSize = '11px';
  el.style.fontWeight = 'bold';
  el.style.color = 'white';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
  el.style.minWidth = '40px';
  el.style.textAlign = 'center';
  el.style.zIndex = '1000';
  el.style.whiteSpace = 'pre-line';
  el.style.lineHeight = '1.2';
  el.innerText = text;

  switch (position) {
    case 'top': el.style.transform = 'translate(-50%, -120%)'; break;
    case 'right': el.style.transform = 'translate(20%, -50%)'; break;
    case 'bottom': el.style.transform = 'translate(-50%, 20%)'; break;
    case 'left': el.style.transform = 'translate(-120%, -50%)'; break;
    case 'center': el.style.transform = 'translate(-50%, -50%)'; break;
  }
  return el;
}

// -----------------------------
// Debounce utility
// -----------------------------
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}
