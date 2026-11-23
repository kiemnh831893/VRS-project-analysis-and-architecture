import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';

const app = createApp();

describe('Phase 4b staging readiness', () => {
  it('exposes liveness and database readiness checks', async () => {
    const live = await request(app).get('/api/health');
    expect(live.status).toBe(200);
    expect(live.body).toMatchObject({ status: 'ok', service: 'vrs-api' });

    const ready = await request(app).get('/api/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body).toMatchObject({ status: 'ready', database: 'connected' });
  });

  it('sets security headers and a request id without logging credentials', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('advertises rate-limit headers on normal API routes', async () => {
    const response = await request(app).get('/api/branches');

    expect(response.status).toBe(200);
    expect(response.headers.ratelimit).toContain('limit=10000');
    expect(response.headers['ratelimit-policy']).toBeDefined();
  });

  it('does not echo submitted passwords in validation errors', async () => {
    const password = 'never-echo-this-password-123';
    const response = await request(app).post('/api/auth/register').send({
      fullName: 'Invalid User',
      email: 'not-an-email',
      phone: '0900000097',
      nationalId: 'STAGING-NID',
      password,
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(response.body.details?.[0]).not.toHaveProperty('received');
  });
});
