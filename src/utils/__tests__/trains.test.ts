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
  stations: [],
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

  it('matches stops by altId and by suffix-stripped name', () => {
    const altRoute: LineRoute = {
      lineId: 'elizabeth',
      polylines: [],
      stations: [],
      sequences: [
        {
          direction: 'outbound',
          stops: [
            { id: 'ST1', altId: 'NAP1', name: 'Delta Rail Station', lat: 51.5, lon: 0.1 },
            { id: 'ST2', altId: 'NAP2', name: 'Echo Rail Station', lat: 51.52, lon: 0.12 },
          ],
        },
      ],
    };
    // naptanId matches only via altId.
    const byAlt = computeTrainPositions(
      [pred({ naptanId: 'NAP2', stationName: undefined, timeToStation: 10 })],
      altRoute
    );
    expect(byAlt).toHaveLength(1);
    expect(byAlt[0].lat).toBe(51.52);

    // No id match at all; names differ only by station-type suffix.
    const byName = computeTrainPositions(
      [pred({ naptanId: 'ZZZ', stationName: 'Echo Underground Station', timeToStation: 10 })],
      altRoute
    );
    expect(byName).toHaveLength(1);
    expect(byName[0].lat).toBe(51.52);
  });

  it("uses the vehicle's other stops to pick the right branch at a shared trunk station", () => {
    const branched: LineRoute = {
      lineId: 'northern',
      polylines: [],
      stations: [],
      sequences: [
        {
          direction: 'outbound',
          stops: [
            { id: 'XA', name: 'Branch A Prev', lat: 51.0, lon: -0.1 },
            { id: 'T', name: 'Trunk', lat: 51.5, lon: -0.1 },
            { id: 'A2', name: 'Branch A Next', lat: 51.6, lon: -0.1 },
          ],
        },
        {
          direction: 'outbound',
          stops: [
            { id: 'XB', name: 'Branch B Prev', lat: 52.0, lon: -0.1 },
            { id: 'T', name: 'Trunk', lat: 51.5, lon: -0.1 },
            { id: 'B2', name: 'Branch B Next', lat: 51.4, lon: -0.1 },
          ],
        },
      ],
    };
    // Next stop is the shared trunk (60s away → halfway from the previous
    // stop); the vehicle's later prediction at B2 identifies branch B.
    const trains = computeTrainPositions(
      [
        pred({ naptanId: 'T', timeToStation: 60 }),
        pred({ naptanId: 'B2', timeToStation: 240 }),
      ],
      branched
    );
    expect(trains).toHaveLength(1);
    // Halfway between XB (52.0) and T (51.5), NOT between XA (51.0) and T.
    expect(trains[0].lat).toBeCloseTo(51.75, 5);
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
