import {
  getArrivals,
  normaliseArrival,
  normaliseJourney,
  normaliseLineStatus,
} from '../tfl';
import type { RawJourney, RawLine, RawPrediction } from '@/types/tfl';

describe('normaliseArrival', () => {
  it('maps fields and strips station suffixes from the destination', () => {
    const raw: RawPrediction = {
      id: '1',
      lineId: 'victoria',
      lineName: 'Victoria',
      platformName: 'Northbound - Platform 1',
      destinationName: 'Walthamstow Central Underground Station',
      towards: 'Walthamstow Central',
      timeToStation: 92,
      modeName: 'tube',
    };
    const a = normaliseArrival(raw);
    expect(a.lineName).toBe('Victoria');
    expect(a.destinationName).toBe('Walthamstow Central');
    expect(a.timeToStation).toBe(92);
    expect(a.modeName).toBe('tube');
  });

  it('falls back to towards then a placeholder when destination is missing', () => {
    expect(normaliseArrival({ id: '2', towards: 'Brixton' }).destinationName).toBe(
      'Brixton'
    );
    expect(normaliseArrival({ id: '3' }).destinationName).toBe(
      'Check front of vehicle'
    );
    expect(normaliseArrival({ id: '3' }).timeToStation).toBe(0);
  });
});

describe('getArrivals hub fallback', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('aggregates children arrivals when a hub itself reports none', async () => {
    const pred = (id: string, timeToStation: number): RawPrediction => ({
      id,
      lineId: 'jubilee',
      lineName: 'Jubilee',
      destinationName: 'Stratford',
      timeToStation,
      modeName: 'tube',
    });
    const respond = (url: string): unknown => {
      if (url.includes('/StopPoint/HUBCW/Arrivals')) return [];
      if (url.includes('/StopPoint/HUBCW'))
        return {
          id: 'HUBCW',
          stopType: 'TransportInterchange',
          children: [
            { id: '940TUBE', stopType: 'NaptanMetroStation' },
            { id: '910RAIL', stopType: 'NaptanRailStation' },
            { id: 'ENTRANCE', stopType: 'NaptanMetroEntrance' },
          ],
        };
      if (url.includes('/StopPoint/940TUBE/Arrivals')) return [pred('a', 120)];
      if (url.includes('/StopPoint/910RAIL/Arrivals')) return [pred('b', 60)];
      throw new Error(`unexpected url ${url}`);
    };
    const fetchMock = jest.fn(async (url: string) => ({
      ok: true,
      json: async () => respond(url),
    }));
    global.fetch = fetchMock as never;

    const arrivals = await getArrivals('HUBCW');

    expect(arrivals.map((a) => a.id)).toEqual(['b', 'a']); // soonest first
    const requested = fetchMock.mock.calls.map((c) => String(c[0]));
    // Entrances are not arrival-capable and must not be queried.
    expect(requested.some((u) => u.includes('ENTRANCE'))).toBe(false);
  });

  it('aggregates children even when the hub reports partial arrivals itself, deduped', async () => {
    const dlrPred = (id: string, timeToStation: number): RawPrediction => ({
      id,
      lineName: 'DLR',
      destinationName: 'Lewisham',
      timeToStation,
      modeName: 'dlr',
    });
    const respond = (url: string): unknown => {
      if (url.includes('/StopPoint/HUBX/Arrivals')) return [dlrPred('direct', 300)];
      if (url.includes('/StopPoint/HUBX'))
        return {
          id: 'HUBX',
          stopType: 'TransportInterchange',
          children: [{ id: '940CHILD', stopType: 'NaptanMetroStation' }],
        };
      if (url.includes('/StopPoint/940CHILD/Arrivals'))
        // 'direct' also appears at the child — must not duplicate.
        return [dlrPred('direct', 300), dlrPred('child-only', 60)];
      throw new Error(`unexpected url ${url}`);
    };
    global.fetch = jest.fn(async (url: string) => ({
      ok: true,
      json: async () => respond(url),
    })) as never;

    const arrivals = await getArrivals('HUBX');
    expect(arrivals.map((a) => a.id)).toEqual(['child-only', 'direct']);
  });

  it('drops predictions without a numeric timeToStation (no phantom "Due")', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => [
        { id: 'no-time', lineName: 'X', destinationName: 'Y' },
        { id: 'timed', lineName: 'X', destinationName: 'Y', timeToStation: 120 },
      ],
    })) as never;

    const arrivals = await getArrivals('940GZZLUVIC');
    expect(arrivals.map((a) => a.id)).toEqual(['timed']);
  });

  it('does not fetch children when the stop has its own arrivals', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => [
        {
          id: 'x',
          lineName: 'Victoria',
          destinationName: 'Brixton',
          timeToStation: 90,
          modeName: 'tube',
        },
      ],
    }));
    global.fetch = fetchMock as never;

    const arrivals = await getArrivals('940GZZLUVIC');

    expect(arrivals).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('normaliseLineStatus', () => {
  it('treats severity 10 as no disruption', () => {
    const raw: RawLine = {
      id: 'central',
      name: 'Central',
      modeName: 'tube',
      lineStatuses: [{ id: 0, statusSeverity: 10, statusSeverityDescription: 'Good Service' }],
    };
    const s = normaliseLineStatus(raw);
    expect(s.hasDisruption).toBe(false);
    expect(s.statusDescription).toBe('Good Service');
    expect(s.reason).toBeUndefined();
  });

  it('flags disruptions and surfaces the reason', () => {
    const raw: RawLine = {
      id: 'district',
      name: 'District',
      modeName: 'tube',
      lineStatuses: [
        {
          id: 0,
          statusSeverity: 6,
          statusSeverityDescription: 'Severe Delays',
          reason: 'District Line: Signal failure at Earls Court.',
        },
      ],
    };
    const s = normaliseLineStatus(raw);
    expect(s.hasDisruption).toBe(true);
    expect(s.reason).toContain('Signal failure');
  });
});

describe('normaliseJourney', () => {
  it('counts changes as transit legs minus one and decodes the path', () => {
    const raw: RawJourney = {
      startDateTime: '2024-01-01T09:00:00',
      arrivalDateTime: '2024-01-01T09:25:00',
      duration: 25,
      legs: [
        {
          duration: 5,
          mode: { id: 'walking', name: 'walking' },
          instruction: { summary: 'Walk to Euston' },
          path: { lineString: '[[51.52,-0.13],[51.53,-0.14]]' },
        },
        {
          duration: 12,
          mode: { id: 'tube', name: 'tube' },
          instruction: { summary: 'Victoria line to Oxford Circus' },
          routeOptions: [
            { name: 'Victoria', directions: ['southbound'], lineIdentifier: { id: 'victoria', name: 'Victoria' } },
          ],
        },
        {
          duration: 8,
          mode: { id: 'tube', name: 'tube' },
          instruction: { summary: 'Central line to Bank' },
          routeOptions: [
            { name: 'Central', lineIdentifier: { id: 'central', name: 'Central' } },
          ],
        },
      ],
    };
    const j = normaliseJourney(raw, 0);
    expect(j.durationMins).toBe(25);
    expect(j.legs).toHaveLength(3);
    expect(j.changes).toBe(1); // two transit legs -> one change
    expect(j.legs[0].path).toHaveLength(2);
    expect(j.legs[1].lineName).toBe('Victoria');
    expect(j.legs[1].direction).toBe('southbound');
  });

  it('reports a direct journey as zero changes', () => {
    const raw: RawJourney = {
      duration: 10,
      legs: [
        { duration: 10, mode: { id: 'tube' }, instruction: { summary: 'x' } },
      ],
    };
    expect(normaliseJourney(raw, 0).changes).toBe(0);
  });
});
