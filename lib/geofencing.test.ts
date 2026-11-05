import { describe, expect, it } from 'vitest';
import {
  calculateDistanceMeters,
  validateProjectGeofence,
  DEFAULT_GEOFENCE_RADIUS_METERS,
} from './geofencing';

const PROJECT_LAT = 14.6133;
const PROJECT_LNG = -90.4875;

describe('DEFAULT_GEOFENCE_RADIUS_METERS', () => {
  it('is 500 meters', () => {
    expect(DEFAULT_GEOFENCE_RADIUS_METERS).toBe(500);
  });
});

describe('calculateDistanceMeters', () => {
  it('returns 0 for identical coordinates', () => {
    expect(calculateDistanceMeters(14.6133, -90.4875, 14.6133, -90.4875)).toBe(0);
  });

  it('is symmetric (A→B == B→A)', () => {
    const ab = calculateDistanceMeters(14.6133, -90.4875, 14.62, -90.5);
    const ba = calculateDistanceMeters(14.62, -90.5, 14.6133, -90.4875);
    expect(ab).toBe(ba);
  });

  it('Palacio Nacional to Aeropuerto La Aurora is 5-8 km', () => {
    const dist = calculateDistanceMeters(14.6349, -90.5128, 14.5831, -90.5275);
    expect(dist).toBeGreaterThan(5000);
    expect(dist).toBeLessThan(8000);
  });

  it('increases as points move further apart', () => {
    const close = calculateDistanceMeters(
      PROJECT_LAT,
      PROJECT_LNG,
      PROJECT_LAT + 0.001,
      PROJECT_LNG
    );
    const far = calculateDistanceMeters(PROJECT_LAT, PROJECT_LNG, PROJECT_LAT + 0.1, PROJECT_LNG);
    expect(far).toBeGreaterThan(close);
  });

  it('returns a positive integer result', () => {
    const d = calculateDistanceMeters(PROJECT_LAT, PROJECT_LNG, PROJECT_LAT + 0.002, PROJECT_LNG);
    expect(d).toBeGreaterThan(0);
    expect(Number.isInteger(d)).toBe(true);
  });
});

describe('validateProjectGeofence', () => {
  it('returns isWithinGeofence=true for 0 distance', () => {
    const r = validateProjectGeofence(PROJECT_LAT, PROJECT_LNG, PROJECT_LAT, PROJECT_LNG);
    expect(r.isWithinGeofence).toBe(true);
    expect(r.distanceMeters).toBe(0);
  });

  it('marks user within geofence when ~30m away (on-site simulation)', () => {
    const r = validateProjectGeofence(
      PROJECT_LAT + 0.00022,
      PROJECT_LNG + 0.00018,
      PROJECT_LAT,
      PROJECT_LNG
    );
    expect(r.isWithinGeofence).toBe(true);
  });

  it('marks user outside geofence when 1+ km away', () => {
    const r = validateProjectGeofence(
      PROJECT_LAT + 0.01,
      PROJECT_LNG + 0.01,
      PROJECT_LAT,
      PROJECT_LNG
    );
    expect(r.isWithinGeofence).toBe(false);
    expect(r.distanceMeters).toBeGreaterThan(DEFAULT_GEOFENCE_RADIUS_METERS);
  });

  it('respects a custom allowed radius', () => {
    const tight = validateProjectGeofence(
      PROJECT_LAT + 0.0005,
      PROJECT_LNG,
      PROJECT_LAT,
      PROJECT_LNG,
      10
    );
    const relaxed = validateProjectGeofence(
      PROJECT_LAT + 0.0005,
      PROJECT_LNG,
      PROJECT_LAT,
      PROJECT_LNG,
      1000
    );
    expect(tight.isWithinGeofence).toBe(false);
    expect(relaxed.isWithinGeofence).toBe(true);
  });

  it('includes both user and project coords in result', () => {
    const r = validateProjectGeofence(PROJECT_LAT + 0.001, PROJECT_LNG, PROJECT_LAT, PROJECT_LNG);
    expect(r.userCoords.lat).toBeCloseTo(PROJECT_LAT + 0.001, 5);
    expect(r.projectCoords.lat).toBeCloseTo(PROJECT_LAT, 5);
    expect(r.allowedRadiusMeters).toBe(DEFAULT_GEOFENCE_RADIUS_METERS);
  });

  it('within-geofence message contains verificada', () => {
    const r = validateProjectGeofence(PROJECT_LAT, PROJECT_LNG, PROJECT_LAT, PROJECT_LNG);
    expect(r.message).toContain('verificada');
  });

  it('outside-geofence message contains perímetro', () => {
    const r = validateProjectGeofence(PROJECT_LAT + 0.1, PROJECT_LNG, PROJECT_LAT, PROJECT_LNG);
    expect(r.message).toContain('perímetro');
  });
});
