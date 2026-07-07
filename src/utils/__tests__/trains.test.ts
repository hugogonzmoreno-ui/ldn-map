import { computeTrainPositions, decodeRouteLineStrings } from '../trains';
import type { LineRoute, RawPrediction } from '@/types/tfl';

describe('decodeRouteLineStrings', () => {
  it('decodes nested [lon, lat] geometry (TfL Route/Sequence order)', () => {
    const input = ['[[[-0.13,51.52],[-0.14,51.53]]]'];
    const [line] = decodeRouteLineStrings(input);
    expect(line).toEqual([
      { latitude: 51.52, longitude: -0.13 },
      { latitude: 51.53, longitude: -0.14 },
    ]);
  });

  it('also accepts [lat, lon] order and skips malformed strings', () => {
    const [line] = decodeRouteLineStrings([
      '[[51.52,-0.13],[51.53,-0.14]]',
      'not json',
    ]);
    expect(line[0]).toEqual({ latitude: 51.52, longitude: -0.13 });
    expect(decodeRouteLineStrings(['not json'])).toEqual([]);
  });

  it('splits multiple branches into separate polylines', () => {
    const lines = decodeRouteLineStrings([
      '[[[-0.1,51.5],[-0.2,51.6]],[[-0.3,51.7],[-0.4,51.8]]]',
    ]);
    expect(lines).toHaveLength(2);
  });
});

const route: LineRoute = {
  lineId: 'victoria',
  polylines: [],
  sequences: [
    {
      direction: 'outbound',
      stops: [
        { id: 'A', name: 'Alpha Underground Station', lat: 51.5, lon: -0.1 },
        { id: 'B', name: 'Bravo Underground Station', lat: 51.52, lon: -0.12 },
        { id: 'C', name: 'Charlie Underground Station', lat: 51.54, lon: -0.14 },
      ],
    },
  ],
};

const pred = (over: Partial<RawPrediction>): RawPrediction => ({
  id: Math.random().toString(),
  vehicleId: '231',
  lineId: 'victoria',
  direction: 'outbound',
  towards: 'Charlie',
  ...over,
});

describe('computeTrainPositions', () => {
  it('interpolates a train halfway between the previous and next station', () => {
    const trains = computeTrainPositions(
      [
        pred({ naptanId: 'B', stationName: 'Bravo Underground Station', timeToStation: 60 }),
        pred({ naptanId: 'C', stationName: 'Charlie Underground Station', timeToStation: 240 }),
      ],
      route
    );
    expect(trains).toHaveLength(1);
    const t = trains[0];
    // 60s / 120s segment = halfway between A and B.
    expect(t.lat).toBeCloseTo(51.51, 5);
    expect(t.lon).toBeCloseTo(-0.11, 5);
    expect(t.nextStopName).toBe('Bravo');
    expect(t.timeToNext).toBe(60);
    expect(t.towards).toBe('Charlie');
  });

  it('snaps to the station when nearly arrived or at the first stop', () => {
    const nearly = computeTrainPositions(
      [pred({ naptanId: 'B', timeToStation: 10 })],
      route
    )[0];
    expect(nearly.lat).toBe(51.52);

    const atOrigin = computeTrainPositions(
      [pred({ naptanId: 'A', timeToStation: 300 })],
      route
    )[0];
    expect(atOrigin.lat).toBe(51.5);
  });

  it('prefers currentLocation for the label when present', () => {
    const t = computeTrainPositions(
      [
        pred({
          naptanId: 'B',
          timeToStation: 90,
          currentLocation: 'Between Alpha and Bravo',
        }),
      ],
      route
    )[0];
    expect(t.label).toBe('Between Alpha and Bravo');
  });

  it('falls back across directions and drops unplaceable/idless vehicles', () => {
    const wrongDirection = computeTrainPositions(
      [pred({ naptanId: 'B', direction: 'inbound', timeToStation: 60 })],
      route
    );
    expect(wrongDirection).toHaveLength(1); // found via fallback search

    const dropped = computeTrainPositions(
      [
        pred({ naptanId: 'ZZZ', stationName: 'Nowhere', timeToStation: 60 }),
        pred({ naptanId: 'B', vehicleId: undefined, timeToStation: 60 }),
        pred({ naptanId: 'B', vehicleId: '000', timeToStation: 60 }),
      ],
      route
    );
    expect(dropped).toHaveLength(0);
  });

  it('groups predictions per vehicle', () => {
    const trains = computeTrainPositions(
      [
        pred({ vehicleId: '1', naptanId: 'B', timeToStation: 60 }),
        pred({ vehicleId: '1', naptanId: 'C', timeToStation: 200 }),
        pred({ vehicleId: '2', naptanId: 'C', timeToStation: 30 }),
      ],
      route
    );
    expect(trains.map((t) => t.vehicleId)).toEqual(['1', '2']);
  });
});
