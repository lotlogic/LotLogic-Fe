import showToast from "@/components/ui/Toast";
import { getImageUrlWithCorsProxy } from "@/lib/api/lotApi";
import {
  createLocalProjectionFromRing,
  createSValueLabel,
  intersectLines,
  mapSValuesToSides,
  polygonOrientation,
  projectPointToLocal,
  projectRingToLocal,
  unprojectPointFromLocal,
  unprojectRingFromLocal,
  unit,
  type Pt,
  type SetbackValues,
} from "@/lib/utils/geometry";
import { useRotationStore } from "@/stores/rotationStore";
import type { FloorPlan } from "@/types/houseDesign";
import type { LotProperties } from "@/types/lot";
import * as turf from "@turf/turf";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useRef } from "react";

interface HouseBoundaryData {
  center: [number, number];
  widthInDegrees: number;
  depthInDegrees: number;
  houseWidth: number;
  houseDepth: number;
  angle: number;
  // isCompatible: boolean;
  scaleFactor: number;
}

type PlacementRingResult = {
  ring: Pt[];
  frontageAligned: boolean;
};

type PlacementBasis = {
  basisRing: Pt[];
  toLngLat: (point: Pt) => Pt;
};

type FloorPlanImageOrientation = "default" | "quarter-turn-ccw";
const FLOORPLAN_SOURCE_ID = "floorplan-image";
const FLOORPLAN_LAYER_ID = "floorplan-layer";

const toClosedQuadRing = (ring: Pt[]): [Pt, Pt, Pt, Pt, Pt] | null => {
  if (ring.length !== 5) {
    return null;
  }

  return [ring[0], ring[1], ring[2], ring[3], ring[0]];
};

const normalizeClosedQuadRing = (
  ring: [number, number][]
): [Pt, Pt, Pt, Pt, Pt] | null => {
  if (!Array.isArray(ring) || ring.length < 4) {
    return null;
  }

  const openRing = ring.slice(0, 4).map((point) => [point[0], point[1]] as Pt);
  if (openRing.length < 4) {
    return null;
  }

  return [openRing[0], openRing[1], openRing[2], openRing[3], openRing[0]];
};

const normalizeClosedRing = (ring: [number, number][]): Pt[] | null => {
  if (!Array.isArray(ring) || ring.length < 4) {
    return null;
  }

  const pointsEqual = (left: Pt, right: Pt) =>
    Math.abs(left[0] - right[0]) < 1e-9 &&
    Math.abs(left[1] - right[1]) < 1e-9;

  const openRing = ring
    .map((point) => [Number(point[0]), Number(point[1])] as Pt)
    .filter(
      (point) => Number.isFinite(point[0]) && Number.isFinite(point[1])
    );

  const dedupedRing = openRing.reduce<Pt[]>((points, point) => {
    const previous = points[points.length - 1];
    if (!previous || !pointsEqual(previous, point)) {
      points.push(point);
    }
    return points;
  }, []);

  while (
    dedupedRing.length > 1 &&
    pointsEqual(dedupedRing[0], dedupedRing[dedupedRing.length - 1])
  ) {
    dedupedRing.pop();
  }

  const normalizedOpenRing = dedupedRing;

  if (normalizedOpenRing.length < 3) {
    return null;
  }

  return [...normalizedOpenRing, normalizedOpenRing[0]];
};

const parseFrontageLineCoordinates = (frontageCoordinate: unknown): Pt[] | null => {
  if (!frontageCoordinate) {
    return null;
  }

  try {
    const parsed =
      typeof frontageCoordinate === "string"
        ? JSON.parse(frontageCoordinate)
        : frontageCoordinate;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { type?: string }).type !== "LineString"
    ) {
      return null;
    }

    const coordinates = (parsed as { coordinates?: unknown }).coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }

    const line = coordinates
      .map((point) =>
        Array.isArray(point) && point.length >= 2
          ? ([Number(point[0]), Number(point[1])] as Pt)
          : null
      )
      .filter((point): point is Pt => Array.isArray(point));

    return line.length >= 2 ? line : null;
  } catch {
    return null;
  }
};

const rotateRingToStartAtEdge = (
  ring: [Pt, Pt, Pt, Pt, Pt],
  edgeIndex: number
): [Pt, Pt, Pt, Pt, Pt] => {
  const openRing = ring.slice(0, 4);
  const start = ((edgeIndex % 4) + 4) % 4;

  return [
    openRing[start],
    openRing[(start + 1) % 4],
    openRing[(start + 2) % 4],
    openRing[(start + 3) % 4],
    openRing[start],
  ];
};

const rotateClosedRingToStartAtEdge = (
  ring: Pt[],
  edgeIndex: number
): Pt[] => {
  const openRing = ring.slice(0, -1);
  const totalEdges = openRing.length;
  const start = ((edgeIndex % totalEdges) + totalEdges) % totalEdges;
  const rotated = Array.from(
    { length: totalEdges },
    (_, index) => openRing[(start + index) % totalEdges]
  );
  return [...rotated, rotated[0]];
};

const getFrontageMidpoint = (frontageLine: Pt[]): Pt => {
  const line = turf.lineString(frontageLine);
  const totalLength = turf.length(line, { units: "meters" });
  if (totalLength <= 0) {
    return frontageLine[0];
  }
  return turf.along(line, totalLength / 2, { units: "meters" }).geometry
    .coordinates as Pt;
};

const getParallelBearingDifference = (bearingA: number, bearingB: number) => {
  const rawDiff = Math.abs(((bearingA - bearingB + 180) % 360) - 180);
  return Math.min(rawDiff, Math.abs(rawDiff - 180));
};

const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];

const roundPlacementValue = (value: number) =>
  Number.isFinite(value) ? Number(value.toFixed(4)) : value;

const consolidateFrontageChain = ({
  ring,
  bestEdgeIndex,
  frontageLine,
  frontageBearing,
}: {
  ring: Pt[];
  bestEdgeIndex: number;
  frontageLine: Pt[];
  frontageBearing: number;
}): Pt[] => {
  const openRing = ring.slice(0, -1);
  const totalEdges = openRing.length;
  const frontageLineFeature = turf.lineString(frontageLine);
  const isFrontageLikeEdge = (edgeIndex: number) => {
    const start = openRing[edgeIndex];
    const end = openRing[(edgeIndex + 1) % totalEdges];
    const edgeBearing = turf.bearing(start, end);
    const parallelDelta = getParallelBearingDifference(
      edgeBearing,
      frontageBearing
    );
    const edgeMidpoint = turf.midpoint(turf.point(start), turf.point(end));
    const distanceToFrontage = turf.pointToLineDistance(
      edgeMidpoint,
      frontageLineFeature,
      { units: "meters" }
    );

    return parallelDelta <= 8 && distanceToFrontage <= 8;
  };

  let startEdgeIndex = bestEdgeIndex;
  let endEdgeIndex = bestEdgeIndex;
  let frontageEdgeCount = 1;

  while (frontageEdgeCount < totalEdges) {
    const previousEdgeIndex =
      (startEdgeIndex - 1 + totalEdges) % totalEdges;
    if (!isFrontageLikeEdge(previousEdgeIndex)) {
      break;
    }
    startEdgeIndex = previousEdgeIndex;
    frontageEdgeCount += 1;
  }

  while (frontageEdgeCount < totalEdges) {
    const nextEdgeIndex = (endEdgeIndex + 1) % totalEdges;
    if (!isFrontageLikeEdge(nextEdgeIndex)) {
      break;
    }
    endEdgeIndex = nextEdgeIndex;
    frontageEdgeCount += 1;
  }

  if (frontageEdgeCount <= 1) {
    return rotateClosedRingToStartAtEdge(ring, bestEdgeIndex);
  }

  const consolidatedOpenRing: Pt[] = [
    openRing[startEdgeIndex],
    openRing[(endEdgeIndex + 1) % totalEdges],
  ];
  let cursor = (endEdgeIndex + 1) % totalEdges;

  while (cursor !== startEdgeIndex) {
    cursor = (cursor + 1) % totalEdges;
    if (cursor !== startEdgeIndex) {
      consolidatedOpenRing.push(openRing[cursor]);
    }
  }

  return consolidatedOpenRing.length >= 3
    ? [...consolidatedOpenRing, consolidatedOpenRing[0]]
    : rotateClosedRingToStartAtEdge(ring, bestEdgeIndex);
};

const getPlacementRing = (
  selectedLot: mapboxgl.MapboxGeoJSONFeature & { properties: LotProperties }
): PlacementRingResult | null => {
  const geometry = selectedLot.geometry as GeoJSON.Polygon;
  const normalizedRing = normalizeClosedRing(
    geometry.coordinates[0] as [number, number][]
  );
  if (!normalizedRing) {
    return null;
  }

  const frontageLine = parseFrontageLineCoordinates(
    selectedLot.properties.frontageCoordinate
  );
  if (!frontageLine) {
    return { ring: normalizedRing, frontageAligned: false };
  }

  const frontageMidpoint = getFrontageMidpoint(frontageLine);
  const frontageBearing = turf.bearing(
    frontageLine[0],
    frontageLine[frontageLine.length - 1]
  );

  let bestEdgeIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < normalizedRing.length - 1; index += 1) {
    const edgeStart = normalizedRing[index];
    const edgeEnd = normalizedRing[index + 1];
    const edgeMidpoint = turf.midpoint(
      turf.point(edgeStart),
      turf.point(edgeEnd)
    ).geometry.coordinates as Pt;
    const midpointDistance = turf.distance(
      turf.point(edgeMidpoint),
      turf.point(frontageMidpoint),
      { units: "meters" }
    );
    const edgeBearing = turf.bearing(edgeStart, edgeEnd);
    const parallelPenalty = getParallelBearingDifference(
      edgeBearing,
      frontageBearing
    );
    const score = midpointDistance + parallelPenalty * 0.5;

    if (score < bestScore) {
      bestScore = score;
      bestEdgeIndex = index;
    }
  }

  return {
    ring: consolidateFrontageChain({
      ring: normalizedRing,
      bestEdgeIndex,
      frontageLine,
      frontageBearing,
    }),
    frontageAligned: true,
  };
};

const getPlacementInsetRing = (
  ring: Pt[],
  setbacks: SetbackValues
): Pt[] | null => {
  if (!ring || ring.length < 4) {
    return null;
  }

  const openRing = ring.slice(0, -1);
  const projection = createLocalProjectionFromRing(ring);
  const localRing = openRing.map((point) => projectPointToLocal(point, projection));

  if (localRing.length < 3) {
    return null;
  }

  const frontStart = localRing[0];
  const frontEnd = localRing[1];
  const frontMid = midpoint(frontStart, frontEnd);
  const alongFront = unit([
    frontEnd[0] - frontStart[0],
    frontEnd[1] - frontStart[1],
  ]);

  let inward: Pt = [-alongFront[1], alongFront[0]];
  const centroid: Pt = [
    localRing.reduce((sum, point) => sum + point[0], 0) / localRing.length,
    localRing.reduce((sum, point) => sum + point[1], 0) / localRing.length,
  ];
  const centroidVector: Pt = [
    centroid[0] - frontMid[0],
    centroid[1] - frontMid[1],
  ];
  if (dot(inward, centroidVector) < 0) {
    inward = [-inward[0], -inward[1]];
  }

  const edgeDepths = localRing.map((point, index) => {
    const next = localRing[(index + 1) % localRing.length];
    const edgeMid = midpoint(point, next);
    return dot(
      [edgeMid[0] - frontMid[0], edgeMid[1] - frontMid[1]],
      inward
    );
  });
  const rearEdgeIndex = edgeDepths.reduce(
    (bestIndex, depth, index) => (depth > edgeDepths[bestIndex] ? index : bestIndex),
    1
  );

  const orientation = polygonOrientation([...localRing, localRing[0]]);
  const normalSign = orientation > 0 ? -1 : 1;
  const offsetEdges: Array<[Pt, Pt]> = [];

  for (let index = 0; index < localRing.length; index += 1) {
    const start = localRing[index];
    const end = localRing[(index + 1) % localRing.length];
    const edgeUnit = unit([end[0] - start[0], end[1] - start[1]]);
    const inwardNormal: Pt = [
      normalSign * -edgeUnit[1],
      normalSign * edgeUnit[0],
    ];
    const setbackDistance =
      index === 0
        ? setbacks.front
        : index === rearEdgeIndex
          ? setbacks.rear
          : setbacks.side;
    offsetEdges.push([
      [
        start[0] + inwardNormal[0] * setbackDistance,
        start[1] + inwardNormal[1] * setbackDistance,
      ],
      [
        end[0] + inwardNormal[0] * setbackDistance,
        end[1] + inwardNormal[1] * setbackDistance,
      ],
    ]);
  }

  const innerLocal: Pt[] = [];
  for (let index = 0; index < offsetEdges.length; index += 1) {
    const previousEdge = offsetEdges[(index - 1 + offsetEdges.length) % offsetEdges.length];
    const currentEdge = offsetEdges[index];
    innerLocal.push(
      intersectLines(
        previousEdge[0],
        previousEdge[1],
        currentEdge[0],
        currentEdge[1]
      )
    );
  }

  if (innerLocal.length < 3) {
    return null;
  }

  return unprojectRingFromLocal([...innerLocal, innerLocal[0]], projection);
};

const createPlacementBasis = (ringLL: Pt[]): PlacementBasis | null => {
  if (!ringLL || ringLL.length < 4) {
    return null;
  }

  const openRing = ringLL.slice(0, -1);
  const projection = createLocalProjectionFromRing(ringLL);
  const localRing = openRing.map((point) => projectPointToLocal(point, projection));

  if (localRing.length < 3) {
    return null;
  }

  const frontStart = localRing[0];
  const frontEnd = localRing[1];
  const frontMid = midpoint(frontStart, frontEnd);
  const alongFront = unit([
    frontEnd[0] - frontStart[0],
    frontEnd[1] - frontStart[1],
  ]);
  const centroid: Pt = [
    localRing.reduce((sum, point) => sum + point[0], 0) / localRing.length,
    localRing.reduce((sum, point) => sum + point[1], 0) / localRing.length,
  ];
  const centroidVector: Pt = [
    centroid[0] - frontMid[0],
    centroid[1] - frontMid[1],
  ];

  let inward: Pt = [-alongFront[1], alongFront[0]];
  if (dot(inward, centroidVector) < 0) {
    inward = [-inward[0], -inward[1]];
  }

  const edgeDepthSpans = localRing.map((point, index) => {
    const next = localRing[(index + 1) % localRing.length];
    return Math.abs(
      dot([next[0] - point[0], next[1] - point[1]], inward)
    );
  });
  const maxDepthSpan = Math.max(...edgeDepthSpans);
  const sideCandidates = localRing
    .map((point, index) => {
      if (index === 0) {
        return null;
      }
      const next = localRing[(index + 1) % localRing.length];
      const edgeVector: Pt = [next[0] - point[0], next[1] - point[1]];
      const edgeLength = Math.hypot(edgeVector[0], edgeVector[1]);
      const depthSpan = Math.abs(dot(edgeVector, inward));
      if (
        edgeLength <= 0.01 ||
        depthSpan < Math.max(8, maxDepthSpan * 0.45)
      ) {
        return null;
      }
      const candidate = unit(edgeVector);
      return dot(candidate, inward) < 0
        ? ([-candidate[0], -candidate[1]] as Pt)
        : candidate;
    })
    .filter((candidate): candidate is Pt => Boolean(candidate));

  if (sideCandidates.length > 0) {
    const sideBasis = sideCandidates.reduce<Pt>(
      (sum, candidate, index) => {
        const alignedCandidate =
          index > 0 && dot(sum, candidate) < 0
            ? ([-candidate[0], -candidate[1]] as Pt)
            : candidate;
        return [sum[0] + alignedCandidate[0], sum[1] + alignedCandidate[1]];
      },
      [0, 0]
    );
    const sideInward = unit(sideBasis);
    const sideAlignmentDelta = getParallelBearingDifference(
      (Math.atan2(sideInward[0], sideInward[1]) * 180) / Math.PI,
      (Math.atan2(inward[0], inward[1]) * 180) / Math.PI
    );

    if (sideAlignmentDelta <= 25 && dot(sideInward, centroidVector) > 0) {
      inward = sideInward;
    }
  }

  let alongWidth: Pt = [inward[1], -inward[0]];
  if (dot(alongWidth, alongFront) < 0) {
    alongWidth = [-alongWidth[0], -alongWidth[1]];
  }

  const basisRing = localRing.map((point) => {
    const relativePoint: Pt = [
      point[0] - frontMid[0],
      point[1] - frontMid[1],
    ];
    return [
      dot(relativePoint, alongWidth),
      dot(relativePoint, inward),
    ] as Pt;
  });

  return {
    basisRing,
    toLngLat: (point: Pt) =>
      unprojectPointFromLocal(
        [
          frontMid[0] + alongWidth[0] * point[0] + inward[0] * point[1],
          frontMid[1] + alongWidth[1] * point[0] + inward[1] * point[1],
        ],
        projection
      ),
  };
};

const getScanlineInterval = (
  ring: Pt[],
  yValue: number
): [number, number] | null => {
  const intersections: number[] = [];
  const epsilon = 1e-6;

  for (let index = 0; index < ring.length; index += 1) {
    const start = ring[index];
    const end = ring[(index + 1) % ring.length];

    if (Math.abs(start[1] - end[1]) < epsilon) {
      if (Math.abs(yValue - start[1]) < epsilon) {
        intersections.push(start[0], end[0]);
      }
      continue;
    }

    const t = (yValue - start[1]) / (end[1] - start[1]);
    if (t >= -epsilon && t <= 1 + epsilon) {
      intersections.push(start[0] + (end[0] - start[0]) * t);
    }
  }

  const unique = intersections
    .sort((left, right) => left - right)
    .filter(
      (value, index, values) =>
        index === 0 || Math.abs(value - values[index - 1]) > epsilon
    );

  if (unique.length < 2) {
    return null;
  }

  return [unique[0], unique[unique.length - 1]];
};

type FrontAnchoredPlacementCandidate = {
  frontOffset: number;
  centerX: number;
  exactFit: boolean;
  overflow: number;
  minClearance: number;
};

const getPlacementSampleDepths = (
  ring: Pt[],
  frontOffset: number,
  rearOffset: number
) => {
  const epsilon = 1e-6;
  const criticalDepths = [
    frontOffset,
    rearOffset,
    ...ring
      .map((point) => point[1])
      .filter((depth) => depth > frontOffset + epsilon && depth < rearOffset - epsilon),
  ].sort((left, right) => left - right);

  const samples = new Set<number>(criticalDepths);
  for (let index = 0; index < criticalDepths.length - 1; index += 1) {
    const start = criticalDepths[index];
    const end = criticalDepths[index + 1];
    if (end - start > epsilon) {
      samples.add(roundPlacementValue((start + end) / 2));
    }
  }

  return Array.from(samples).sort((left, right) => left - right);
};

const evaluateFrontAnchoredPlacement = ({
  ring,
  houseWidth,
  houseDepth,
  frontOffset,
  maxDepth,
}: {
  ring: Pt[];
  houseWidth: number;
  houseDepth: number;
  frontOffset: number;
  maxDepth: number;
}): FrontAnchoredPlacementCandidate | null => {
  const rearOffset = frontOffset + houseDepth;
  const sampledRearOffset = Math.min(rearOffset, maxDepth);
  const sampleDepths = getPlacementSampleDepths(
    ring,
    frontOffset,
    sampledRearOffset
  );
  const intervals = sampleDepths
    .map((depth) => getScanlineInterval(ring, depth))
    .filter((interval): interval is [number, number] => Array.isArray(interval));

  if (intervals.length === 0) {
    return null;
  }

  const preferredCenterX =
    intervals.reduce((sum, interval) => sum + (interval[0] + interval[1]) / 2, 0) /
    intervals.length;
  const leftBoundary = Math.max(...intervals.map((interval) => interval[0]));
  const rightBoundary = Math.min(...intervals.map((interval) => interval[1]));
  const candidateCenters = new Set<number>([
    0,
    preferredCenterX,
    leftBoundary + houseWidth / 2,
    rightBoundary - houseWidth / 2,
  ]);

  let bestCandidate: FrontAnchoredPlacementCandidate | null = null;
  for (const centerX of candidateCenters) {
    const left = centerX - houseWidth / 2;
    const right = centerX + houseWidth / 2;
    const lateralOverflow = intervals.reduce((maxOverflow, interval) => {
      const leftOverflow = Math.max(interval[0] - left, 0);
      const rightOverflow = Math.max(right - interval[1], 0);
      return Math.max(maxOverflow, leftOverflow, rightOverflow);
    }, 0);
    const depthOverflow = Math.max(rearOffset - maxDepth, 0);
    const overflow = Math.max(lateralOverflow, depthOverflow);
    const minClearance = Math.min(
      ...intervals.map((interval) =>
        Math.min(left - interval[0], interval[1] - right)
      )
    );
    const exactFit = overflow <= 0.01;

    const candidate: FrontAnchoredPlacementCandidate = {
      frontOffset,
      centerX,
      exactFit,
      overflow,
      minClearance,
    };

    if (!bestCandidate) {
      bestCandidate = candidate;
      continue;
    }

    if (candidate.exactFit !== bestCandidate.exactFit) {
      if (candidate.exactFit) {
        bestCandidate = candidate;
      }
      continue;
    }

    if (candidate.exactFit) {
      if (
        candidate.minClearance > bestCandidate.minClearance + 0.01 ||
        (Math.abs(candidate.minClearance - bestCandidate.minClearance) <= 0.01 &&
          candidate.frontOffset < bestCandidate.frontOffset)
      ) {
        bestCandidate = candidate;
      }
      continue;
    }

    if (
      candidate.overflow < bestCandidate.overflow - 0.01 ||
      (Math.abs(candidate.overflow - bestCandidate.overflow) <= 0.01 &&
        candidate.minClearance > bestCandidate.minClearance + 0.01) ||
      (Math.abs(candidate.overflow - bestCandidate.overflow) <= 0.01 &&
        Math.abs(candidate.minClearance - bestCandidate.minClearance) <= 0.01 &&
        candidate.frontOffset < bestCandidate.frontOffset)
    ) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
};

const buildTrueSizeFrontAnchoredHouseBoundary = (
  innerLL: Pt[],
  houseWidth: number,
  houseDepth: number
) => {
  if (houseWidth <= 0 || houseDepth <= 0 || innerLL.length < 4) {
    return null;
  }

  const placementBasis = createPlacementBasis(innerLL);
  if (!placementBasis) {
    return null;
  }

  const openBasisRing = placementBasis.basisRing;
  const maxDepth = Math.max(...openBasisRing.map((point) => point[1]));
  const searchLimit = maxDepth - houseDepth;
  const epsilon = 0.01;

  if (!Number.isFinite(searchLimit)) {
    return null;
  }

  const candidateFrontOffsets = new Set<number>([epsilon]);
  for (
    let offset = epsilon;
    offset <= searchLimit + epsilon;
    offset += 0.25
  ) {
    candidateFrontOffsets.add(roundPlacementValue(offset));
  }
  for (const point of openBasisRing) {
    if (point[1] >= epsilon && point[1] <= searchLimit + epsilon) {
      candidateFrontOffsets.add(roundPlacementValue(point[1]));
    }
  }

  const sortedOffsets = Array.from(candidateFrontOffsets).sort(
    (left, right) => left - right
  );

  let bestExactCandidate: FrontAnchoredPlacementCandidate | null = null;
  let bestApproximateCandidate: FrontAnchoredPlacementCandidate | null = null;

  for (const rawFrontOffset of sortedOffsets) {
    const frontOffset = Math.max(epsilon, rawFrontOffset);
    const candidate = evaluateFrontAnchoredPlacement({
      ring: openBasisRing,
      houseWidth,
      houseDepth,
      frontOffset,
      maxDepth,
    });
    if (!candidate) {
      continue;
    }

    if (candidate.exactFit) {
      if (
        !bestExactCandidate ||
        candidate.minClearance > bestExactCandidate.minClearance + 0.01 ||
        (Math.abs(candidate.minClearance - bestExactCandidate.minClearance) <=
          0.01 &&
          candidate.frontOffset < bestExactCandidate.frontOffset) ||
        (Math.abs(candidate.minClearance - bestExactCandidate.minClearance) <=
          0.01 &&
          Math.abs(candidate.frontOffset - bestExactCandidate.frontOffset) <=
            0.01 &&
          Math.abs(candidate.centerX) < Math.abs(bestExactCandidate.centerX))
      ) {
        bestExactCandidate = candidate;
      }
      continue;
    }

    if (
      !bestApproximateCandidate ||
      candidate.overflow < bestApproximateCandidate.overflow - 0.01 ||
      (Math.abs(candidate.overflow - bestApproximateCandidate.overflow) <= 0.01 &&
        candidate.minClearance > bestApproximateCandidate.minClearance + 0.01) ||
      (Math.abs(candidate.overflow - bestApproximateCandidate.overflow) <= 0.01 &&
        Math.abs(candidate.minClearance - bestApproximateCandidate.minClearance) <=
          0.01 &&
        candidate.frontOffset < bestApproximateCandidate.frontOffset)
    ) {
      bestApproximateCandidate = candidate;
    }
  }

  const finalFrontOffset =
    bestExactCandidate?.frontOffset ??
    bestApproximateCandidate?.frontOffset ??
    epsilon;
  const finalCenterX =
    bestExactCandidate?.centerX ?? bestApproximateCandidate?.centerX ?? 0;
  const halfWidth = houseWidth / 2;

  const rectangleBasisRing: Pt[] = [
    [finalCenterX - halfWidth, finalFrontOffset],
    [finalCenterX + halfWidth, finalFrontOffset],
    [finalCenterX + halfWidth, finalFrontOffset + houseDepth],
    [finalCenterX - halfWidth, finalFrontOffset + houseDepth],
    [finalCenterX - halfWidth, finalFrontOffset],
  ];

  return turf.polygon([
    rectangleBasisRing.map((point) => placementBasis.toLngLat(point)),
  ]) as GeoJSON.Feature<GeoJSON.Polygon>;
};

const buildFrontAnchoredHouseBoundary = (
  innerLL: Pt[],
  houseWidth: number,
  houseDepth: number
) => buildTrueSizeFrontAnchoredHouseBoundary(innerLL, houseWidth, houseDepth);

const buildRectangularHouseBoundary = ({
  innerLL,
  houseArea,
  houseWidth,
  houseDepth,
  frontAnchored,
}: {
  innerLL: Pt[];
  houseArea: number;
  houseWidth?: number;
  houseDepth?: number;
  frontAnchored: boolean;
}) => {
  if (houseArea <= 0 || innerLL.length < 5) {
    return null;
  }

  const projection = createLocalProjectionFromRing(innerLL);
  const innerLocal = projectRingToLocal(innerLL, projection);
  const frontLeft = innerLocal[0];
  const frontRight = innerLocal[1];
  const rearRight = innerLocal[2];
  const rearLeft = innerLocal[3];

  const frontMid: Pt = [
    (frontLeft[0] + frontRight[0]) / 2,
    (frontLeft[1] + frontRight[1]) / 2,
  ];
  const rearMid: Pt = [
    (rearLeft[0] + rearRight[0]) / 2,
    (rearLeft[1] + rearRight[1]) / 2,
  ];

  const alongFront = unit([
    frontRight[0] - frontLeft[0],
    frontRight[1] - frontLeft[1],
  ]);
  const inward = unit([rearMid[0] - frontMid[0], rearMid[1] - frontMid[1]]);

  const availableFrontWidth = Math.hypot(
    frontRight[0] - frontLeft[0],
    frontRight[1] - frontLeft[1]
  );
  const availableRearWidth = Math.hypot(
    rearRight[0] - rearLeft[0],
    rearRight[1] - rearLeft[1]
  );
  const availableDepth = Math.hypot(
    rearMid[0] - frontMid[0],
    rearMid[1] - frontMid[1]
  );
  const widthCapacity = Math.min(availableFrontWidth, availableRearWidth);

  if (widthCapacity <= 0 || availableDepth <= 0) {
    return null;
  }

  const targetAspectRatio = houseWidth && houseDepth
    ? houseWidth / houseDepth
    : widthCapacity / availableDepth;
  const safeAspectRatio =
    Number.isFinite(targetAspectRatio) && targetAspectRatio > 0
      ? targetAspectRatio
      : 1;

  const targetWidth =
    houseWidth && houseWidth > 0
      ? houseWidth
      : Math.sqrt(houseArea * safeAspectRatio);
  const targetDepth =
    houseDepth && houseDepth > 0 ? houseDepth : houseArea / targetWidth;

  const fitScale = Math.min(
    1,
    widthCapacity / targetWidth,
    availableDepth / targetDepth
  );

  if (!Number.isFinite(fitScale) || fitScale <= 0) {
    return null;
  }

  const actualWidth = targetWidth * fitScale;
  const actualDepth = targetDepth * fitScale;
  const frontInset = frontAnchored
    ? Math.min(0.05, Math.max(availableDepth - actualDepth, 0))
    : Math.max((availableDepth - actualDepth) / 2, 0);
  const frontCenter: Pt = [
    frontMid[0] + inward[0] * frontInset,
    frontMid[1] + inward[1] * frontInset,
  ];
  const halfWidth = actualWidth / 2;

  const placedFrontLeft: Pt = [
    frontCenter[0] - alongFront[0] * halfWidth,
    frontCenter[1] - alongFront[1] * halfWidth,
  ];
  const placedFrontRight: Pt = [
    frontCenter[0] + alongFront[0] * halfWidth,
    frontCenter[1] + alongFront[1] * halfWidth,
  ];
  const placedRearRight: Pt = [
    placedFrontRight[0] + inward[0] * actualDepth,
    placedFrontRight[1] + inward[1] * actualDepth,
  ];
  const placedRearLeft: Pt = [
    placedFrontLeft[0] + inward[0] * actualDepth,
    placedFrontLeft[1] + inward[1] * actualDepth,
  ];

  return turf.polygon([
    unprojectRingFromLocal(
      [
        placedFrontLeft,
        placedFrontRight,
        placedRearRight,
        placedRearLeft,
        placedFrontLeft,
      ],
      projection
    ),
  ]) as GeoJSON.Feature<GeoJSON.Polygon>;
};

const matchRingOrientation = (
  referenceRing: [Pt, Pt, Pt, Pt, Pt],
  ring: [Pt, Pt, Pt, Pt, Pt]
): [Pt, Pt, Pt, Pt, Pt] => {
  const projection = createLocalProjectionFromRing(referenceRing);
  const referenceLocal = projectRingToLocal(referenceRing, projection);
  const ringLocal = projectRingToLocal(ring, projection);

  const referenceOrientation = polygonOrientation(referenceLocal);
  const ringOrientation = polygonOrientation(ringLocal);
  if (
    referenceOrientation === 0 ||
    ringOrientation === 0 ||
    Math.sign(referenceOrientation) === Math.sign(ringOrientation)
  ) {
    return ring;
  }

  const openRing = ring.slice(0, 4);
  return [openRing[0], openRing[3], openRing[2], openRing[1], openRing[0]];
};

const alignHouseRingToLotRing = (
  lotRing: [Pt, Pt, Pt, Pt, Pt],
  houseRingCoordinates: [number, number][]
): [Pt, Pt, Pt, Pt, Pt] | null => {
  const normalizedHouseRing = normalizeClosedQuadRing(houseRingCoordinates);
  if (!normalizedHouseRing) {
    return null;
  }

  const orientedHouseRing = matchRingOrientation(lotRing, normalizedHouseRing);
  const lotFrontBearing = turf.bearing(lotRing[0], lotRing[1]);
  const lotFrontMidpoint = turf.midpoint(
    turf.point(lotRing[0]),
    turf.point(lotRing[1])
  ).geometry.coordinates as Pt;

  let bestEdgeIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < 4; index += 1) {
    const edgeStart = orientedHouseRing[index];
    const edgeEnd = orientedHouseRing[index + 1];
    const edgeMidpoint = turf.midpoint(
      turf.point(edgeStart),
      turf.point(edgeEnd)
    ).geometry.coordinates as Pt;
    const midpointDistance = turf.distance(
      turf.point(edgeMidpoint),
      turf.point(lotFrontMidpoint),
      { units: "meters" }
    );
    const edgeBearing = turf.bearing(edgeStart, edgeEnd);
    const parallelPenalty = getParallelBearingDifference(
      edgeBearing,
      lotFrontBearing
    );
    const score = midpointDistance + parallelPenalty * 0.5;

    if (score < bestScore) {
      bestScore = score;
      bestEdgeIndex = index;
    }
  }

  return rotateRingToStartAtEdge(orientedHouseRing, bestEdgeIndex);
};

const midpoint = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

const projectPointOntoSegment = (point: Pt, start: Pt, end: Pt): Pt => {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return start;
  }

  const t =
    ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared;
  const clampedT = Math.max(0, Math.min(1, t));

  return [start[0] + dx * clampedT, start[1] + dy * clampedT];
};

const formatDimensionMeters = (distance: number) => {
  const rounded = Math.round(distance * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}m` : `${rounded.toFixed(1)}m`;
};

const getFloorPlanContentDimensions = (
  image: HTMLImageElement
): { width: number; height: number } | null => {
  if (!image.naturalWidth || !image.naturalHeight) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  context.drawImage(image, 0, 0);
  const { data, width, height } = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );
  const colorThreshold = 245;
  const alphaThreshold = 8;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const alpha = data[offset + 3];
      const isContent =
        alpha > alphaThreshold &&
        (red < colorThreshold || green < colorThreshold || blue < colorThreshold);

      if (!isContent) {
        continue;
      }

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};

const getFloorPlanImageOrientation = ({
  imageWidth,
  imageHeight,
  houseWidth,
  houseDepth,
}: {
  imageWidth: number;
  imageHeight: number;
  houseWidth?: number;
  houseDepth?: number;
}): FloorPlanImageOrientation => {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    !houseWidth ||
    !houseDepth ||
    houseWidth <= 0 ||
    houseDepth <= 0
  ) {
    return "default";
  }

  const imageAspect = imageWidth / imageHeight;
  const houseAspect = houseWidth / houseDepth;

  if (!Number.isFinite(imageAspect) || !Number.isFinite(houseAspect)) {
    return "default";
  }

  const directScore = Math.abs(Math.log(imageAspect / houseAspect));
  const quarterTurnScore = Math.abs(Math.log(imageAspect * houseAspect));

  return quarterTurnScore + 0.12 < directScore
    ? "quarter-turn-ccw"
    : "default";
};

const getFloorPlanImageCoordinates = (
  ring: [[number, number], [number, number], [number, number], [number, number]],
  orientation: FloorPlanImageOrientation = "default"
): [[number, number], [number, number], [number, number], [number, number]] => {
  // Floorplan assets are authored with the frontage along the bottom edge,
  // but their handedness is mirrored relative to the lot ring.
  const base: [[number, number], [number, number], [number, number], [number, number]] = [
    ring[2], // TL
    ring[3], // TR
    ring[0], // BR
    ring[1], // BL
  ];

  if (orientation === "quarter-turn-ccw") {
    return [
      base[3], // TL
      base[0], // TR
      base[1], // BR
      base[2], // BL
    ];
  }

  return base;
};

type HouseDimensionMeasurement = {
  index: number;
  lotLengthMeters: number;
  houseLengthMeters: number;
  gapMeters: number;
  outerProjected: Pt;
  innerMid: Pt;
  labelPoint: Pt;
  sideDirection: Pt;
};

type HouseDimensionMeasurementResult = {
  houseRing: [Pt, Pt, Pt, Pt, Pt];
  projection: ReturnType<typeof createLocalProjectionFromRing>;
  measurements: HouseDimensionMeasurement[];
};

const getHouseDimensionMeasurements = (
  lotRing: [Pt, Pt, Pt, Pt, Pt],
  houseBoundary: GeoJSON.Feature<GeoJSON.Polygon>
): HouseDimensionMeasurementResult | null => {
  const houseRing = alignHouseRingToLotRing(
    lotRing,
    houseBoundary.geometry.coordinates[0] as [number, number][]
  );
  if (!houseRing) {
    return null;
  }

  const projection = createLocalProjectionFromRing(lotRing);
  const lotLocal = projectRingToLocal(lotRing, projection);
  const houseLocal = projectRingToLocal(houseRing, projection);

  const measurements: HouseDimensionMeasurement[] = [];

  for (let index = 0; index < 4; index += 1) {
    const outerStart = lotLocal[index];
    const outerEnd = lotLocal[index + 1];
    const innerStart = houseLocal[index];
    const innerEnd = houseLocal[index + 1];

    const innerMid = midpoint(innerStart, innerEnd);
    const outerProjected = projectPointOntoSegment(innerMid, outerStart, outerEnd);
    const gapMeters = Math.hypot(
      innerMid[0] - outerProjected[0],
      innerMid[1] - outerProjected[1]
    );

    if (!Number.isFinite(gapMeters) || gapMeters < 0.1) {
      continue;
    }

    measurements.push({
      index,
      lotLengthMeters: Math.hypot(
        outerEnd[0] - outerStart[0],
        outerEnd[1] - outerStart[1]
      ),
      houseLengthMeters: Math.hypot(
        innerEnd[0] - innerStart[0],
        innerEnd[1] - innerStart[1]
      ),
      gapMeters,
      outerProjected,
      innerMid,
      labelPoint: midpoint(outerProjected, innerMid),
      sideDirection: unit([
        outerEnd[0] - outerStart[0],
        outerEnd[1] - outerStart[1],
      ]),
    });
  }

  return measurements.length > 0 ? { houseRing, projection, measurements } : null;
};

const buildHouseDimensionOverlay = (
  lotRing: [Pt, Pt, Pt, Pt, Pt],
  houseBoundary: GeoJSON.Feature<GeoJSON.Polygon>
): GeoJSON.FeatureCollection<GeoJSON.Geometry> | null => {
  const measurementData = getHouseDimensionMeasurements(lotRing, houseBoundary);
  if (!measurementData) {
    return null;
  }

  const features: GeoJSON.Feature<GeoJSON.Geometry>[] = [];

  for (const measurement of measurementData.measurements) {
    const capHalfLength = Math.max(
      0.25,
      Math.min(0.8, measurement.gapMeters * 0.15)
    );

    features.push(
      turf.lineString(
        unprojectRingFromLocal(
          [measurement.outerProjected, measurement.innerMid],
          measurementData.projection
        )
      ) as GeoJSON.Feature<GeoJSON.LineString>
    );
    features.push(
      turf.lineString(
        unprojectRingFromLocal(
          [
            [
              measurement.outerProjected[0] -
                measurement.sideDirection[0] * capHalfLength,
              measurement.outerProjected[1] -
                measurement.sideDirection[1] * capHalfLength,
            ],
            [
              measurement.outerProjected[0] +
                measurement.sideDirection[0] * capHalfLength,
              measurement.outerProjected[1] +
                measurement.sideDirection[1] * capHalfLength,
            ],
          ],
          measurementData.projection
        )
      ) as GeoJSON.Feature<GeoJSON.LineString>
    );
    features.push(
      turf.lineString(
        unprojectRingFromLocal(
          [
            [
              measurement.innerMid[0] -
                measurement.sideDirection[0] * capHalfLength,
              measurement.innerMid[1] -
                measurement.sideDirection[1] * capHalfLength,
            ],
            [
              measurement.innerMid[0] +
                measurement.sideDirection[0] * capHalfLength,
              measurement.innerMid[1] +
                measurement.sideDirection[1] * capHalfLength,
            ],
          ],
          measurementData.projection
        )
      ) as GeoJSON.Feature<GeoJSON.LineString>
    );
    features.push(
      turf.point(
        unprojectPointFromLocal(measurement.labelPoint, measurementData.projection),
        {
        label: formatDimensionMeters(measurement.gapMeters),
        }
      ) as GeoJSON.Feature<GeoJSON.Point>
    );
  }

  return features.length > 0
    ? turf.featureCollection(features)
    : null;
};

// -----------------------------
// Props
// -----------------------------
interface MapLayersProps {
  map: mapboxgl.Map | null;
  selectedLot:
    | (mapboxgl.MapboxGeoJSONFeature & { properties: LotProperties })
    | null;
  setbackValues: SetbackValues;
  fsrBuildableArea: number | null;
  selectedFloorPlan: FloorPlan | null;
  showFloorPlanModal: boolean;
  showFacadeModal: boolean;
  setSValuesMarkers: (markers: mapboxgl.Marker[]) => void;
  onPlacementWarningChange?: (message: string | null) => void;
}

const getFloorPlanFitWarning = ({
  houseBoundary,
  lotBoundary,
  setbackBoundary,
}: {
  houseBoundary: GeoJSON.Feature<GeoJSON.Polygon>;
  lotBoundary: GeoJSON.Feature<GeoJSON.Polygon>;
  setbackBoundary: GeoJSON.Feature<GeoJSON.Polygon> | null;
}) => {
  const fitsLotBoundary = turf.booleanWithin(houseBoundary, lotBoundary);
  const fitsSetbackBoundary = setbackBoundary
    ? turf.booleanWithin(houseBoundary, setbackBoundary)
    : true;

  if (fitsLotBoundary && fitsSetbackBoundary) {
    return null;
  }

  if (!fitsLotBoundary && !fitsSetbackBoundary) {
    return "This floor plan extends outside the lot boundary and the buildable setback area.";
  }

  if (!fitsLotBoundary) {
    return "This floor plan extends outside the lot boundary.";
  }

  return "This floor plan does not fit within the buildable setback area for this lot.";
};

// Calculate distances and compare, auto-rotate if needed
const calculateAndCompareDistances = (
  _map: mapboxgl.Map,
  midpoint01: [number, number],
  midpoint23: [number, number]
) => {
  // Get the lot frontage midpoint from the red marker
  const lotFrontageMarker = document.getElementById("frontage-midpoint-marker");
  if (!lotFrontageMarker) {
    // console.log("❌ Lot frontage midpoint marker not found");
    return;
  }

  // Get the lot frontage midpoint coordinates from the marker's position
  // We need to get this from the map marker's lngLat
  const lotFrontageMidpoint = getLotFrontageMidpointFromMarker();
  if (!lotFrontageMidpoint) {
    // console.log("❌ Could not get lot frontage midpoint coordinates");
    return;
  }

  // Calculate distances from lot frontage midpoint to house boundary edge midpoints
  const distance01 = turf.distance(
    turf.point(lotFrontageMidpoint),
    turf.point(midpoint01),
    { units: "meters" }
  );
  const distance23 = turf.distance(
    turf.point(lotFrontageMidpoint),
    turf.point(midpoint23),
    { units: "meters" }
  );

  // Check if 0-1 distance is greater than 2-3 distance
  if (distance01 > distance23) {
    // console.log("🔄 Distance 0-1 > 2-3, rotating floorplan 180°");
    // Use the existing rotation store
    const { setManualRotation } = useRotationStore.getState();
    setManualRotation(180);
  } else {
    // console.log("✅ Distance 0-1 <= 2-3, no rotation needed");
  }
};

// Global variable to store lot frontage midpoint
let globalLotFrontageMidpoint: [number, number] | null = null;

// Helper function to get lot frontage midpoint
const getLotFrontageMidpointFromMarker = (): [number, number] | null => {
  return globalLotFrontageMidpoint;
};

// Function to set the global lot frontage midpoint (called from MapControls)
export const setGlobalLotFrontageMidpoint = (coordinates: [number, number]) =>
  (globalLotFrontageMidpoint = coordinates);

// Show house boundary points with labels (0, 1, 2, 3)
const showHouseBoundaryPoints = (
  map: mapboxgl.Map,
  coordinates: [number, number][]
) => {
  // Remove existing house boundary point markers
  for (let i = 0; i < 4; i++) {
    const existingMarker = document.getElementById(`house-boundary-point-${i}`);
    if (existingMarker) {
      existingMarker.remove();
    }
  }

  // Calculate and show midpoints for edges 0-1 and 2-3
  const midpoint01 = turf.midpoint(
    turf.point(coordinates[0]),
    turf.point(coordinates[1])
  ).geometry.coordinates as [number, number];
  const midpoint23 = turf.midpoint(
    turf.point(coordinates[2]),
    turf.point(coordinates[3])
  ).geometry.coordinates as [number, number];

  // Calculate distances from lot frontage midpoint to house boundary edge midpoints
  calculateAndCompareDistances(map, midpoint01, midpoint23);
};

// Calculate house dimensions and positioning
const calculateHouseBoundary = (
  selectedFloorPlan: FloorPlan,
  lotRing: Pt[],
  innerCenter: any
): HouseBoundaryData | null => {
  if (!selectedFloorPlan.houseArea || selectedFloorPlan.houseArea <= 0) {
    return null;
  }

  if (selectedFloorPlan.houseWidth && selectedFloorPlan.houseDepth) {
    const houseWidth = selectedFloorPlan.houseWidth;

    const houseDepth = selectedFloorPlan.houseDepth;

    const coordinates = lotRing;

    // Calculate sides distances from the lot geometry
    const side1 = turf.distance(coordinates[0], coordinates[1], {
      units: "meters",
    });
    const side2 = turf.distance(coordinates[1], coordinates[2], {
      units: "meters",
    });
    const side3 = turf.distance(coordinates[2], coordinates[3], {
      units: "meters",
    });
    const side4 = turf.distance(coordinates[3], coordinates[0], {
      units: "meters",
    });

    // Find the longest side to determine orientation
    const sides = [side1, side2, side3, side4];
    const maxSideIndex = sides.indexOf(Math.max(...sides));

    // Calculate the angle of the longest side
    let angle = 0;
    if (maxSideIndex === 0) {
      angle = turf.bearing(coordinates[0], coordinates[1]);
    } else if (maxSideIndex === 1) {
      angle = turf.bearing(coordinates[1], coordinates[2]);
    } else if (maxSideIndex === 2) {
      angle = turf.bearing(coordinates[2], coordinates[3]);
    } else {
      angle = turf.bearing(coordinates[3], coordinates[0]);
    }

    // Calculate the width and depth in degrees using Turf
    const centerPoint = innerCenter.geometry.coordinates;
    const point1 = turf.point([centerPoint[0], centerPoint[1]]);
    const point2 = turf.point([centerPoint[0] + 0.001, centerPoint[1]]); // 0.001 degree longitude
    const point3 = turf.point([centerPoint[0], centerPoint[1] + 0.001]); // 0.001 degree latitude

    const lngToMeters =
      turf.distance(point1, point2, { units: "meters" }) * 1000; // Convert to meters per degree
    const latToMeters =
      turf.distance(point1, point3, { units: "meters" }) * 1000; // Convert to meters per degree

    const widthInDegrees = houseWidth / lngToMeters;
    const depthInDegrees = houseDepth / latToMeters;

    return {
      center: innerCenter.geometry.coordinates,
      widthInDegrees: widthInDegrees,
      depthInDegrees: depthInDegrees,
      houseWidth: houseWidth,
      houseDepth: houseDepth,
      angle,
      scaleFactor: 1,
    };
  }

  return null;
};

// -----------------------------
// Component
// -----------------------------
export const MapLayers = ({
  map,
  selectedLot,
  setbackValues,
  fsrBuildableArea,
  selectedFloorPlan,
  showFloorPlanModal,
  showFacadeModal,
  setSValuesMarkers,
  onPlacementWarningChange,
}: MapLayersProps) => {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  // Track and manage concurrent floorplan renders so only the latest can affect loader state
  const floorplanRunIdRef = useRef(0);
  const floorPlanImageOrientationRef = useRef<FloorPlanImageOrientation>("default");
  const floorPlanImageMetricsRef = useRef<{
    naturalWidth: number;
    naturalHeight: number;
    contentWidth: number | null;
    contentHeight: number | null;
  } | null>(null);
  const floorPlanFitWarningRef = useRef<string | null>(null);

  // Manual rotation state from Zustand
  const {
    manualRotation,
    pendingRotation,
    setManualRotation,
    setPendingRotation,
    applyPendingRotation,
    setIsCalculating,
  } = useRotationStore();

  // Track previous FSR violation state to show toast only once
  const prevExceedsFSRRef = useRef(false);

  const removeFloorPlanOverlay = useCallback(
    (targetMap: mapboxgl.Map | null) => {
      if (!targetMap) {
        return;
      }

      if (targetMap.getLayer(FLOORPLAN_LAYER_ID)) {
        targetMap.removeLayer(FLOORPLAN_LAYER_ID);
      }
      if (targetMap.getSource(FLOORPLAN_SOURCE_ID)) {
        targetMap.removeSource(FLOORPLAN_SOURCE_ID);
      }
    },
    []
  );

  const updatePlacementWarning = useCallback(
    (message: string | null) => {
      floorPlanFitWarningRef.current = message;
      onPlacementWarningChange?.(message);
      if (message) {
        removeFloorPlanOverlay(map);
      }
    },
    [map, onPlacementWarningChange, removeFloorPlanOverlay]
  );

  // Reset manual rotation when switching lots or floorplans
  useEffect(() => {
    setManualRotation(0);
    setPendingRotation(null);
  }, [
    selectedLot?.properties?.ID,
    selectedFloorPlan?.url,
    setManualRotation,
    setPendingRotation,
  ]);

  // Additional reset when selectedFloorPlan changes (more immediate)
  useEffect(() => {
    if (selectedFloorPlan) {
      setManualRotation(0);
      setPendingRotation(null);
    }
  }, [selectedFloorPlan, setManualRotation, setPendingRotation]);

  // Reset FSR violation toast state when switching lots or floorplans
  useEffect(() => {
    prevExceedsFSRRef.current = false;
  }, [selectedLot?.properties?.ID, selectedFloorPlan?.url]);

  useEffect(() => {
    if (!selectedLot || !selectedFloorPlan) {
      updatePlacementWarning(null);
    }
  }, [selectedFloorPlan, selectedLot, updatePlacementWarning]);

  useEffect(() => {
    floorPlanImageOrientationRef.current = "default";
    floorPlanImageMetricsRef.current = null;
    floorPlanFitWarningRef.current = null;
  }, [selectedFloorPlan?.url, selectedLot?.properties?.ID]);

  // Separate useEffect for immediate rotation updates
  useEffect(() => {
    if (!map || !selectedFloorPlan) return;

    const sourceId = FLOORPLAN_SOURCE_ID;
    const layerId = FLOORPLAN_LAYER_ID;

    // Check if layer exists, if not, store pending rotation and show loader
    // console.log("🔍 Checking if floorplan layer exists:", map.getLayer(layerId));
    if (!map.getLayer(layerId)) {
      // console.log("❌ Floorplan layer not found, storing pending rotation:", manualRotation);
      setPendingRotation(manualRotation);
      // Avoid flashing the loader again on rapid re-entry
      try {
        const { isCalculating } = useRotationStore.getState();
        if (!isCalculating) {
          setIsCalculating(true);
        }
      } catch {
        setIsCalculating(true);
      }
      return;
    }

    // Determine the rotation to apply (use pending rotation if available, otherwise use current)
    let rotationToApply = manualRotation;
    if (pendingRotation !== null) {
      // console.log("🔄 Applying pending rotation:", pendingRotation);
      applyPendingRotation();
      rotationToApply = pendingRotation; // Use the pending rotation value for this execution
    }

    // Get the current house boundary data
    const houseBoundarySource = map.getSource("house-area-boundary-source");
    if (houseBoundarySource && houseBoundarySource.type === "geojson") {
      const houseBoundaryData = (
        houseBoundarySource as mapboxgl.GeoJSONSource
      ).serialize();
      if (
        houseBoundaryData.data &&
        typeof houseBoundaryData.data === "object" &&
        "geometry" in houseBoundaryData.data
      ) {
        const houseBoundaryCoords = (houseBoundaryData.data as any).geometry
          .coordinates[0];

        // Apply rotation
        const closedRing: [number, number][] = [
          houseBoundaryCoords[0],
          houseBoundaryCoords[1],
          houseBoundaryCoords[2],
          houseBoundaryCoords[3],
          houseBoundaryCoords[0],
        ];
        const housePoly = turf.polygon([closedRing]);
        const pivot = turf.centroid(housePoly).geometry.coordinates as [
          number,
          number
        ];
        const rotated = turf.transformRotate(housePoly, rotationToApply, {
          pivot,
        });
        const rCoordsFull = rotated.geometry.coordinates[0] as [
          number,
          number
        ][];
        const rCoords = rCoordsFull.slice(0, 4);

        // Update coordinates for Mapbox
        const floorPlanCoordinates = getFloorPlanImageCoordinates([
          rCoords[0],
          rCoords[1],
          rCoords[2],
          rCoords[3],
        ], floorPlanImageOrientationRef.current);

        // Update the existing source
        if (map.getSource(sourceId)) {
          // console.log("✅ Updating floorplan source coordinates");
          (map.getSource(sourceId) as mapboxgl.ImageSource).setCoordinates(
            floorPlanCoordinates
          );
        }

        // Auto-rotation logic: Check if we should rotate 180° based on distance to lot frontage
        if (globalLotFrontageMidpoint && manualRotation === 0) {
          // Calculate midpoints of the rotated house boundary edges
          const rotatedMidpoint01 = turf.midpoint(
            turf.point(rCoords[0]),
            turf.point(rCoords[1])
          ).geometry.coordinates as [number, number];
          const rotatedMidpoint23 = turf.midpoint(
            turf.point(rCoords[2]),
            turf.point(rCoords[3])
          ).geometry.coordinates as [number, number];

          // Calculate distances from lot frontage midpoint to rotated house boundary edge midpoints
          const distance01 = turf.distance(
            turf.point(globalLotFrontageMidpoint),
            turf.point(rotatedMidpoint01),
            { units: "meters" }
          );
          const distance23 = turf.distance(
            turf.point(globalLotFrontageMidpoint),
            turf.point(rotatedMidpoint23),
            { units: "meters" }
          );

          // console.log("🔄 Auto-rotation check - Distance 0-1:", distance01.toFixed(2), "m, Distance 2-3:", distance23.toFixed(2), "m");

          // If distance to edge 0-1 is greater than distance to edge 2-3, rotate 180°
          if (distance01 > distance23) {
            // console.log("🔄 Auto-rotating to 180° because distance01 > distance23");
            setManualRotation(180);
          }
        }

        // Check if rotated floorplan exceeds boundaries and log results
        if (selectedLot) {
          const geometry = selectedLot.geometry as GeoJSON.Polygon;
          const coordinates = geometry.coordinates[0] as [number, number][];
          const setbackRing =
            getPlacementRing(selectedLot)?.ring ??
            normalizeClosedRing(coordinates);
          if (!setbackRing) {
            updatePlacementWarning(null);
            return;
          }

          // Create setback boundary
          const innerLL = getPlacementInsetRing(setbackRing, {
            front: setbackValues.front,
            side: setbackValues.side,
            rear: setbackValues.rear,
          });

          if (innerLL && innerLL.length >= 5) {
            const innerPoly = turf.polygon([innerLL]);
            const lotPoly = turf.polygon([setbackRing]);
            const innerArea = turf.area(innerPoly);
            const desired = fsrBuildableArea
              ? Math.min(fsrBuildableArea, innerArea)
              : innerArea;
            const scale = Math.sqrt(desired / innerArea);
            const innerCenter = turf.center(innerPoly);
            const fsrBoundary = turf.transformScale(innerPoly, scale, {
              origin: innerCenter,
            });

            // Check if rotated floorplan exceeds FSR boundary
            const exceedsFSR = !turf.booleanWithin(rotated, fsrBoundary);
            // Update previous state
            prevExceedsFSRRef.current = exceedsFSR;
            const warning = getFloorPlanFitWarning({
              houseBoundary: rotated,
              lotBoundary: lotPoly,
              setbackBoundary: innerPoly,
            });
            updatePlacementWarning(warning);
          } else {
            updatePlacementWarning(
              "This floor plan does not fit within the buildable setback area for this lot."
            );
          }
        }
      }
    }
  }, [
    manualRotation,
    pendingRotation,
    map,
    selectedLot,
    selectedFloorPlan,
    setbackValues,
    fsrBuildableArea,
    setPendingRotation,
    applyPendingRotation,
    setManualRotation,
    updatePlacementWarning,
  ]);

  // Handle pending rotations when layer becomes available
  useEffect(() => {
    if (!map || !selectedFloorPlan || pendingRotation === null) return;

    const layerId = "floorplan-layer";
    if (map.getLayer(layerId)) {
      applyPendingRotation();
    }
  }, [map, selectedFloorPlan, pendingRotation, applyPendingRotation]);

  // Floorplan overlay
  useEffect(() => {
    if (!map || !selectedFloorPlan) {
      updatePlacementWarning(null);
      return;
    }

    // Start a new render run; only this run is allowed to clear the loader
    const myRunId = ++floorplanRunIdRef.current;
    setIsCalculating(true);

    const sourceId = FLOORPLAN_SOURCE_ID;
    const layerId = FLOORPLAN_LAYER_ID;

    removeFloorPlanOverlay(map);

    // Delay floorplan creation to allow rotation calculations to complete
    const createFloorplan = () => {
      const proxiedImageUrl = getImageUrlWithCorsProxy(selectedFloorPlan.url);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const contentDimensions = getFloorPlanContentDimensions(img);
        floorPlanImageMetricsRef.current = {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          contentWidth: contentDimensions?.width ?? null,
          contentHeight: contentDimensions?.height ?? null,
        };
        floorPlanImageOrientationRef.current = getFloorPlanImageOrientation({
          imageWidth: contentDimensions?.width ?? img.naturalWidth,
          imageHeight: contentDimensions?.height ?? img.naturalHeight,
          houseWidth: selectedFloorPlan.houseWidth,
          houseDepth: selectedFloorPlan.houseDepth,
        });

        // Use the house boundary coordinates for the floorplan if available
        const houseBoundarySource = map.getSource("house-area-boundary-source");

        if (houseBoundarySource && houseBoundarySource.type === "geojson") {
          const houseBoundaryData = (
            houseBoundarySource as mapboxgl.GeoJSONSource
          ).serialize();
          if (
            houseBoundaryData.data &&
            typeof houseBoundaryData.data === "object" &&
            "geometry" in houseBoundaryData.data
          ) {
            const houseBoundaryCoords = (houseBoundaryData.data as any).geometry
              .coordinates[0];

            // Align the house front (assumed indices 0-3) to the lot front (indices 0-1),
            // then use the front edge as the bottom edge for Mapbox image ordering [TL, TR, BR, BL]
            try {
              // Manual rotation only - user controls the floorplan direction
              const delta = manualRotation;

              // Rotate house ring around its centroid
              const closedRing: [number, number][] = [
                houseBoundaryCoords[0],
                houseBoundaryCoords[1],
                houseBoundaryCoords[2],
                houseBoundaryCoords[3],
                houseBoundaryCoords[0],
              ];
              const housePoly = turf.polygon([closedRing]);
              const pivot = turf.centroid(housePoly).geometry.coordinates as [
                number,
                number
              ];
              const rotated = turf.transformRotate(housePoly, delta, { pivot });
              const rCoordsFull = rotated.geometry.coordinates[0] as [
                number,
                number
              ][];
              const rCoords = rCoordsFull.slice(0, 4);

              // For manual rotation, we use the standard coordinate mapping

              // Keep rectangle shape; only rotate. Original ring order is [BL, BR, TR, TL]
              // Map to Mapbox order [TL, TR, BR, BL]
              const floorPlanCoordinates = getFloorPlanImageCoordinates([
                rCoords[0],
                rCoords[1],
                rCoords[2],
                rCoords[3],
              ], floorPlanImageOrientationRef.current);

              if (floorPlanFitWarningRef.current) {
                removeFloorPlanOverlay(map);
                if (floorplanRunIdRef.current === myRunId) {
                  setIsCalculating(false);
                }
                return;
              }

              // Remove existing layer and source if they exist
              removeFloorPlanOverlay(map);

              map.addSource(sourceId, {
                type: "image",
                url: proxiedImageUrl,
                coordinates: floorPlanCoordinates,
              });
              // Floorplan will be shown regardless of frontage coordinate availability
            } catch (error) {
              console.error(
                "Error processing frontageCoordinate - floorplan not displayed:",
                error
              );
              showToast({
                message:
                  "Failed to display floorplan. Please try selecting a different design.",
                type: "error",
                options: { autoClose: 5000 },
              });
              return; // Exit early, don't add the floorplan image
            }
          }
        }

        map.addLayer({
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: { "raster-opacity": 0.8 },
        });

        // Apply any pending rotation now that the layer exists
        if (pendingRotation !== null) {
          applyPendingRotation();
        }

        // Hide loader when layer is ready (only if still latest run)
        if (floorplanRunIdRef.current === myRunId) {
          setIsCalculating(false);
        }
      };

      img.onerror = () => {
        console.error("Failed to load floorplan image");
        showToast({
          message:
            "Failed to load floorplan image. Please check your connection or try a different design.",
          type: "error",
          options: { autoClose: 5000 },
        });
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        if (floorplanRunIdRef.current === myRunId) {
          setIsCalculating(false);
        }
      };

      img.src = proxiedImageUrl;
    };

    // Delay floorplan creation to allow rotation calculations to complete
    const timeoutId = setTimeout(() => {
      createFloorplan();
    }, 300);

    // Safety: auto-clear loader if something hangs
    const safetyId = setTimeout(() => {
      if (floorplanRunIdRef.current === myRunId) {
        setIsCalculating(false);
      }
    }, 10000);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(safetyId);
      removeFloorPlanOverlay(map);
      // If this run is still the active one, clear the loader on cleanup
      if (floorplanRunIdRef.current === myRunId) {
        setIsCalculating(false);
      }
    };
  }, [
    map,
    selectedFloorPlan,
    manualRotation,
    removeFloorPlanOverlay,
    setIsCalculating,
    updatePlacementWarning,
  ]);

  // S values + Setbacks + FSR boundary
  useEffect(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    setSValuesMarkers([]);

    if (!map || !selectedLot) {
      updatePlacementWarning(null);
      return;
    }

    const geometry = selectedLot.geometry as GeoJSON.Polygon;
    const coordinates = geometry.coordinates[0] as [number, number][];
    if (!coordinates || coordinates.length < 4) return;
    const placementResult = getPlacementRing(selectedLot);
    const setbackRing =
      placementResult?.ring ?? normalizeClosedRing(coordinates);
    if (!setbackRing) return;
    const dimensionRing = toClosedQuadRing(setbackRing);

    const { s1, s2, s3, s4 } = selectedLot.properties;
    const newMarkers: mapboxgl.Marker[] = [];

    // Per-side setbacks ring
    const innerLL = getPlacementInsetRing(setbackRing, {
      front: setbackValues.front,
      side: setbackValues.side,
      rear: setbackValues.rear,
    });

    if (innerLL && innerLL.length >= 5) {
      const innerPoly = turf.polygon([innerLL]);
      const lotPoly = turf.polygon([setbackRing]);

      // Draw setback boundary
      if (map.getLayer("setback-boundary-layer"))
        map.removeLayer("setback-boundary-layer");
      if (map.getSource("setback-boundary-source"))
        map.removeSource("setback-boundary-source");
      map.addSource("setback-boundary-source", {
        type: "geojson",
        data: innerPoly,
      });
      // map.addLayer({
      //   id: 'setback-boundary-layer',
      //   type: 'line',
      //   source: 'setback-boundary-source',
      //   paint: { 'line-color': '#FF0000', 'line-width': 2, 'line-dasharray': [2, 2] }
      // });

      // Add center marker for testing
      // const centerMarker = new mapboxgl.Marker({
      //   color: '#00FF00',
      //   scale: 0.8
      // })
      //   .setLngLat(turf.centroid(innerPoly).geometry.coordinates as [number, number])
      //   .addTo(map);
      // newMarkers.push(centerMarker);

      // FSR boundary
      let innerArea = turf.area(innerPoly);
      const desired = fsrBuildableArea
        ? Math.min(fsrBuildableArea, innerArea)
        : innerArea;
      const scale = Math.sqrt(desired / innerArea);
      const innerCenter = turf.center(innerPoly);
      const fsrBoundary = turf.transformScale(innerPoly, scale, {
        origin: innerCenter,
      });

      if (map.getLayer("fsr-boundary-layer"))
        map.removeLayer("fsr-boundary-layer");
      if (map.getSource("fsr-boundary-source"))
        map.removeSource("fsr-boundary-source");
      map.addSource("fsr-boundary-source", {
        type: "geojson",
        data: fsrBoundary,
      });
      // map.addLayer({
      //   id: 'fsr-boundary-layer',
      //   type: 'line',
      //   source: 'fsr-boundary-source',
      //   paint: { 'line-color': '#FF9800', 'line-width': 1.5, 'line-dasharray': [4, 4] }
      // });

      // Log FSR area in square meters
      // try {
      //   const fsrAreaM2 = turf.area(fsrBoundary);
      //   console.log('[FSR] Area (m²):', fsrAreaM2.toFixed(2));
      // } catch {}

      // Log FSR width and depth (meters) based on axis-aligned bbox
      // try {
      //   const bbox = turf.bbox(fsrBoundary) as [number, number, number, number];
      //   const west  = turf.point([bbox[0], bbox[1]]);
      //   const east  = turf.point([bbox[2], bbox[1]]);
      //   const south = turf.point([bbox[0], bbox[1]]);
      //   const north = turf.point([bbox[0], bbox[3]]);
      //   const fsrWidthM = turf.distance(west, east, { units: 'meters' });
      //   const fsrDepthM = turf.distance(south, north, { units: 'meters' });
      //   console.log('[FSR] Width (m):', fsrWidthM.toFixed(2), 'Depth (m):', fsrDepthM.toFixed(2));
      // } catch {}

      // FSR area label - only show when we have a valid FSR value
      if (
        fsrBuildableArea &&
        !selectedFloorPlan &&
        !showFloorPlanModal &&
        !showFacadeModal
      ) {
        const fsrAreaLabel = new mapboxgl.Marker({
          element: createSValueLabel(`${Math.round(desired)} m²`, "center"),
          anchor: "center",
        })
          .setLngLat(innerCenter.geometry.coordinates as [number, number])
          .addTo(map);
        newMarkers.push(fsrAreaLabel);
      }

      // House Design Area Boundary
      if (
        selectedFloorPlan &&
        selectedFloorPlan.houseArea &&
        selectedFloorPlan.houseArea > 0
      ) {
        const houseArea = selectedFloorPlan.houseArea;
        const houseDesired = houseArea
          ? Math.min(houseArea, desired)
          : houseArea;
        const innerCenter = turf.center(innerPoly);
        const boundaryData = calculateHouseBoundary(
          selectedFloorPlan,
          setbackRing,
          innerCenter
        );
        const frontageAnchoredBoundary =
          placementResult?.frontageAligned &&
          selectedFloorPlan.houseWidth &&
          selectedFloorPlan.houseDepth
            ? buildFrontAnchoredHouseBoundary(
                innerLL,
                selectedFloorPlan.houseWidth,
                selectedFloorPlan.houseDepth
              )
            : null;
        const areaOnlyRectangularBoundary =
          !selectedFloorPlan.houseWidth || !selectedFloorPlan.houseDepth
            ? buildRectangularHouseBoundary({
                innerLL,
                houseArea: houseDesired,
                frontAnchored: Boolean(placementResult?.frontageAligned),
              })
            : null;

        let houseBoundary;
        if (frontageAnchoredBoundary) {
          houseBoundary = frontageAnchoredBoundary;
        } else if (boundaryData) {
          const setbackCenter = turf.centroid(innerPoly);
          const rectCoordinates = [
            [
              setbackCenter.geometry.coordinates[0] -
                boundaryData.widthInDegrees / 2,
              setbackCenter.geometry.coordinates[1] -
                boundaryData.depthInDegrees / 2,
            ],
            [
              setbackCenter.geometry.coordinates[0] +
                boundaryData.widthInDegrees / 2,
              setbackCenter.geometry.coordinates[1] -
                boundaryData.depthInDegrees / 2,
            ],
            [
              setbackCenter.geometry.coordinates[0] +
                boundaryData.widthInDegrees / 2,
              setbackCenter.geometry.coordinates[1] +
                boundaryData.depthInDegrees / 2,
            ],
            [
              setbackCenter.geometry.coordinates[0] -
                boundaryData.widthInDegrees / 2,
              setbackCenter.geometry.coordinates[1] +
                boundaryData.depthInDegrees / 2,
            ],
            [
              setbackCenter.geometry.coordinates[0] -
                boundaryData.widthInDegrees / 2,
              setbackCenter.geometry.coordinates[1] -
                boundaryData.depthInDegrees / 2,
            ],
          ];

          const rect = turf.polygon([rectCoordinates]);
          houseBoundary = turf.transformRotate(rect, boundaryData.angle, {
            pivot: setbackCenter.geometry.coordinates,
          });
        } else if (areaOnlyRectangularBoundary) {
          houseBoundary = areaOnlyRectangularBoundary;
        } else {
          houseBoundary = buildRectangularHouseBoundary({
            innerLL,
            houseArea: houseDesired,
            frontAnchored: false,
          });
        }

        if (!houseBoundary) {
          updatePlacementWarning(null);
          return;
        }

        const warning = getFloorPlanFitWarning({
          houseBoundary: houseBoundary as GeoJSON.Feature<GeoJSON.Polygon>,
          lotBoundary: lotPoly,
          setbackBoundary: innerPoly,
        });
        updatePlacementWarning(warning);

        // Keep the rendered footprint at true size; if it overflows the
        // envelope, that should be visible rather than silently shrinking it.
        if (map.getLayer("house-area-boundary-layer"))
          map.removeLayer("house-area-boundary-layer");
        if (map.getSource("house-area-boundary-source"))
          map.removeSource("house-area-boundary-source");
        map.addSource("house-area-boundary-source", {
          type: "geojson",
          data: houseBoundary,
        });
        if (map.getLayer("house-dimension-labels-layer"))
          map.removeLayer("house-dimension-labels-layer");
        if (map.getLayer("house-dimension-lines-layer"))
          map.removeLayer("house-dimension-lines-layer");
        if (map.getSource("house-dimension-source"))
          map.removeSource("house-dimension-source");

        const houseDimensions = dimensionRing
          ? buildHouseDimensionOverlay(
              dimensionRing,
              houseBoundary as GeoJSON.Feature<GeoJSON.Polygon>
            )
          : null;
        if (houseDimensions) {
          map.addSource("house-dimension-source", {
            type: "geojson",
            data: houseDimensions,
          });
          map.addLayer({
            id: "house-dimension-lines-layer",
            type: "line",
            source: "house-dimension-source",
            filter: ["==", "$type", "LineString"],
            paint: {
              "line-color": "#4B5563",
              "line-width": 1.5,
              "line-dasharray": [1.5, 1],
            },
          });
          map.addLayer({
            id: "house-dimension-labels-layer",
            type: "symbol",
            source: "house-dimension-source",
            filter: ["==", "$type", "Point"],
            layout: {
              "text-field": ["get", "label"],
              "text-size": 11,
              "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
              "text-anchor": "center",
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            },
            paint: {
              "text-color": "#111827",
              "text-halo-color": "rgba(255, 255, 255, 0.92)",
              "text-halo-width": 1.5,
            },
          });
        }
        // map.addLayer({
        //   id: 'house-area-boundary-layer',
        //   type: 'line',
        //   source: 'house-area-boundary-source',
        //   paint: { 'line-color': '#15cf04', 'line-width': 2, 'line-dasharray': [4, 4] }
        // });

        // Show house boundary points with labels (0, 1, 2, 3)
        const houseBoundaryCoords = houseBoundary.geometry.coordinates[0] as [
          number,
          number
        ][];
        showHouseBoundaryPoints(map, houseBoundaryCoords);

        // House area label
        if (!selectedFloorPlan && !showFloorPlanModal && !showFacadeModal) {
          const houseAreaLabel = new mapboxgl.Marker({
            element: createSValueLabel(
              `${Math.round(houseArea)} m² House`,
              "center"
            ),
            anchor: "center",
          })
            .setLngLat(innerCenter.geometry.coordinates as [number, number])
            .addTo(map);
          newMarkers.push(houseAreaLabel);
        }
      }
    } else if (selectedFloorPlan) {
      updatePlacementWarning(
        "This floor plan does not fit within the buildable setback area for this lot."
      );
    } else {
      updatePlacementWarning(null);
    }

    // S labels on sides - Map s-values correctly to coordinates
    const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

    // Calculate actual distances for debugging
    // const actualDistances = [
    //   turf.distance(coordinates[0], coordinates[1], { units: 'meters' }),
    //   turf.distance(coordinates[1], coordinates[2], { units: 'meters' }),
    //   turf.distance(coordinates[2], coordinates[3], { units: 'meters' }),
    //   turf.distance(coordinates[3], coordinates[0], { units: 'meters' })
    // ];

    // Map s-values to the correct sides based on distance matching
    const sValues = [s1 ?? 0, s2 ?? 0, s3 ?? 0, s4 ?? 0];
    const mappedSValues = mapSValuesToSides(coordinates, sValues);

    const sides: Array<{
      a: Pt;
      b: Pt;
      val: number | null | undefined;
      pos: "top" | "right" | "bottom" | "left";
    }> = [
      {
        a: coordinates[0],
        b: coordinates[1],
        val: mappedSValues.s1,
        pos: "top",
      },
      {
        a: coordinates[1],
        b: coordinates[2],
        val: mappedSValues.s2,
        pos: "right",
      },
      {
        a: coordinates[2],
        b: coordinates[3],
        val: mappedSValues.s3,
        pos: "bottom",
      },
      {
        a: coordinates[3],
        b: coordinates[0],
        val: mappedSValues.s4,
        pos: "left",
      },
    ];

    sides.forEach((side) => {
      if (side.val == null) return;
      if (!showFloorPlanModal && !showFacadeModal) {
        const mpt = mid(side.a, side.b);
        const marker = new mapboxgl.Marker({
          element: createSValueLabel(`${side.val}m`, side.pos),
          anchor: "center",
        })
          .setLngLat(mpt)
          .addTo(map);
        newMarkers.push(marker);
      }
    });

    markersRef.current = newMarkers;
    setSValuesMarkers(newMarkers);

    return () => {
      newMarkers.forEach((m) => m.remove());
      if (map) {
        if (map.getLayer("setback-boundary-layer"))
          map.removeLayer("setback-boundary-layer");
        if (map.getSource("setback-boundary-source"))
          map.removeSource("setback-boundary-source");
        if (map.getLayer("fsr-boundary-layer"))
          map.removeLayer("fsr-boundary-layer");
        if (map.getSource("fsr-boundary-source"))
          map.removeSource("fsr-boundary-source");
        if (map.getLayer("house-area-boundary-layer"))
          map.removeLayer("house-area-boundary-layer");
        if (map.getSource("house-area-boundary-source"))
          map.removeSource("house-area-boundary-source");
        if (map.getLayer("house-dimension-labels-layer"))
          map.removeLayer("house-dimension-labels-layer");
        if (map.getLayer("house-dimension-lines-layer"))
          map.removeLayer("house-dimension-lines-layer");
        if (map.getSource("house-dimension-source"))
          map.removeSource("house-dimension-source");
      }
      // Clean up house boundary point markers
      for (let i = 0; i < 4; i++) {
        const existingMarker = document.getElementById(
          `house-boundary-point-${i}`
        );
        if (existingMarker) {
          existingMarker.remove();
        }
      }
      // Clean up edge midpoint markers
      const edgeMidpoint01 = document.getElementById("edge-midpoint-0-1");
      if (edgeMidpoint01) edgeMidpoint01.remove();
      const edgeMidpoint23 = document.getElementById("edge-midpoint-2-3");
      if (edgeMidpoint23) edgeMidpoint23.remove();
    };
  }, [
    map,
    selectedLot,
    setbackValues,
    fsrBuildableArea,
    selectedFloorPlan,
    showFloorPlanModal,
    showFacadeModal,
    setSValuesMarkers,
    updatePlacementWarning,
  ]);

  return null;
};

export default MapLayers;

// Separate loader component that overlays the map
export const MapLoader = ({
  isCalculating,
  map,
  selectedLot,
}: {
  isCalculating: boolean;
  map: mapboxgl.Map | null;
  selectedLot: any;
}) => {
  if (!isCalculating || !map || !selectedLot) return null;

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "4px solid rgba(255, 255, 255, 0.3)",
            borderTop: "4px solid var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        ></div>
      </div>
    </>
  );
};
