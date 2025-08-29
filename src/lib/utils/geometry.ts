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
  return sum;
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


/**
 * 
 * Using intersection formula using Cramer's rule to
  ensures that the setback calculations result in a properly formed polygon with precise corner coordinates, 
  which is crucial for accurate lot analysis and building design
 */

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

/**
  Latitude/Longitude (LL) to Mercator projection 
  Why? Because distance calculations in lat/lng are inaccurate (especially at higher latitudes)
  Mercator gives us accurate metric distances for setback calculations
 */
  const ringMerc = (turf.toMercator(turf.polygon([ringLL])) as any)
    .geometry.coordinates[0] as Pt[];

  const p0 = ringMerc[0], p1 = ringMerc[1], p2 = ringMerc[2], p3 = ringMerc[3];

  const ori = polygonOrientation([p0, p1, p2, p3, p0]); // >0 CCW, <0 CW
  const sign = ori > 0 ? -1 : 1; // inward normal direction

  //------------------------------------------------------------------------------------------------------------- 
  //Takes each edge of the polygon
  //Converts it to a unit vector (length = 1, same direction)
  //------------------------------------------------------------------------------------------------------------- 
  const v01 = unit([p1[0] - p0[0], p1[1] - p0[1]]);
  const v12 = unit([p2[0] - p1[0], p2[1] - p1[1]]);
  const v23 = unit([p3[0] - p2[0], p3[1] - p2[1]]);
  const v30 = unit([p0[0] - p3[0], p0[1] - p3[1]]);


  //------------------------------------------------------------------------------------------------------------- 
    //Original Edge: p0→p1 = [2,0] (pointing right)
    // Unit Vector: v01 = [1,0]
    // Normal Vector Calculation:
    // n01 = [sign * -v01[1], sign * v01[0]]
    //     = [sign * -0, sign * 1]
    //     = [0, sign * 1]

    // If sign = 1: n01 = [0, 1] (pointing up)
    // If sign = -1: n01 = [0, -1] (pointing down) 

//     Original Polygon:
// p0 = (0,0), p1 = (2,0), p2 = (2,2), p3 = (0,2)

//      p3 ──── p2
//      │       │
//      │       │
//      p0 ──── p1

// Calculations:
// v01 = unit([2-0, 0-0]) = unit([2,0]) = [1,0]   (right direction)
// v12 = unit([2-2, 2-0]) = unit([0,2]) = [0,1]   (up direction)
// v23 = unit([0-2, 2-2]) = unit([-2,0]) = [-1,0] (left direction)
// v30 = unit([0-0, 0-2]) = unit([0,-2]) = [0,-1] (down direction)
  //------------------------------------------------------------------------------------------------------------- 

  const n01: Pt = [sign * -v01[1], sign * v01[0]]; // front (S1)
  const n12: Pt = [sign * -v12[1], sign * v12[0]]; // side  (S2)
  const n23: Pt = [sign * -v23[1], sign * v23[0]]; // side  (S3)
  const n30: Pt = [sign * -v30[1], sign * v30[0]]; // rear  (S4)

  const [a0, a1] = offsetEdge(p0, p1, n01, sides.front);
  const [b0, b1] = offsetEdge(p1, p2, n12, sides.side);
  const [c0, c1] = offsetEdge(p2, p3, n23, sides.side);
  const [d0, d1] = offsetEdge(p3, p0, n30, sides.rear);

  //coordinates after setbacks
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
  el.style.fontSize = '12px';
  el.style.fontWeight = 'normal';
  el.style.color = '#0F0E0E';
  el.style.background = 'rgba(255, 255, 255, 0.8)';
  el.style.padding = '2px 4px';
  el.style.borderRadius = '2px';
  el.style.whiteSpace = 'pre-line';
  el.style.lineHeight = '1.2';
  el.style.textAlign = 'center';
  el.innerText = text;

  switch (position) {
    case 'top': el.style.transform = 'translate(-50%, -150%)'; break;
    case 'right': el.style.transform = 'translate(50%, -50%)'; break;
    case 'bottom': el.style.transform = 'translate(-50%, 50%)'; break;
    case 'left': el.style.transform = 'translate(-150%, -50%)'; break;
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

// -----------------------------
// S-value mapping utility
// -----------------------------

/**
 * Maps s-values from database to the correct sides by calculating actual distances
 * @param coordinates - Polygon coordinates [p0, p1, p2, p3, p0]
 * @param sValues - Array of s-values from database [s1, s2, s3, s4]
 * @returns Object with mapped s-values for each side
 */
export function mapSValuesToSides(coordinates: Pt[], sValues: number[]): { s1: number, s2: number, s3: number, s4: number } {
  if (coordinates.length < 5 || sValues.length !== 4) {
    throw new Error('Invalid coordinates or s-values');
  }

  // Calculate actual distances for each side
  const sideDistances = [];
  for (let i = 0; i < 4; i++) {
    const distance = turf.distance(coordinates[i], coordinates[i + 1], { units: 'meters' });
    sideDistances.push({ index: i, distance });
  }

  // Sort s-values by size to match with sorted distances
  const sortedSValues = [...sValues].sort((a, b) => a - b);
  const sortedDistances = [...sideDistances].sort((a, b) => a.distance - b.distance);

  // Map s-values to sides based on distance matching
  const result = { s1: 0, s2: 0, s3: 0, s4: 0 };
  
  for (let i = 0; i < 4; i++) {
    const sideIndex = sortedDistances[i].index;
    const sValue = sortedSValues[i];
    
    switch (sideIndex) {
      case 0: result.s1 = sValue; break;
      case 1: result.s2 = sValue; break;
      case 2: result.s3 = sValue; break;
      case 3: result.s4 = sValue; break;
    }
  }

  return result;
}

/**
 * Alternative: Map s-values directly by coordinate order (simpler approach)
 * @param coordinates - Polygon coordinates [p0, p1, p2, p3, p0]
 * @param sValues - Array of s-values from database [s1, s2, s3, s4]
 * @returns Object with mapped s-values for each side
 */
export function mapSValuesByOrder(coordinates: Pt[], sValues: number[]): { s1: number, s2: number, s3: number, s4: number } {
  if (coordinates.length < 5 || sValues.length !== 4) {
    throw new Error('Invalid coordinates or s-values');
  }

  return {
    s1: sValues[0], // coordinates[0] to coordinates[1]
    s2: sValues[1], // coordinates[1] to coordinates[2]
    s3: sValues[2], // coordinates[2] to coordinates[3]
    s4: sValues[3]  // coordinates[3] to coordinates[0]
  };
}
