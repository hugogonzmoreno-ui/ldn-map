import {
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
