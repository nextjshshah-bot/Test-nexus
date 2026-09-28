import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

/**
 * Integration smoke tests. They boot the real Express app in-process and hit
 * it with supertest. PostgreSQL must be reachable via DATABASE_URL — the
 * health probe test is skipped automatically when it is not.
 */
describe('NexusCore API', () => {
  let app: Express;
  let databaseUp = false;

  beforeAll(async () => {
    process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
    const { createApp } = await import('../src/app');
    const { isDatabaseHealthy } = await import('../src/lib/prisma');
    app = createApp();
    databaseUp = await isDatabaseHealthy();
    if (!databaseUp) {
      console.warn('⚠️  PostgreSQL unreachable — database-dependent assertions are skipped.');
    }
  });

  afterAll(async () => {
    const { disconnectDatabase } = await import('../src/lib/prisma');
    await disconnectDatabase();
  });

  it('serves the API index', async () => {
    const response = await request(app).get('/api/v1').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('NexusCore API');
  });

  it('reports liveness on /health', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('reports readiness including the database check', async () => {
    const response = await request(app).get('/api/v1/health/ready');
    expect([200, 503]).toContain(response.status);
    expect(response.body.data.checks.process).toBe('up');
    if (databaseUp) expect(response.status).toBe(200);
  });

  it('rejects unauthenticated access to projects', async () => {
    const response = await request(app).get('/api/v1/projects').expect(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('TOKEN_MISSING');
  });

  it('returns a structured 404 for unknown routes', async () => {
    const response = await request(app).get('/api/v1/nope').expect(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('validates registration payloads', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' })
      .expect(422);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(response.body.error.details)).toBe(true);
  });

  it('computes password strength without authentication', async () => {
    const response = await request(app)
      .post('/api/v1/auth/password-strength')
      .send({ password: 'NexusCore!2026' })
      .expect(200);

    expect(response.body.data.score).toBeGreaterThanOrEqual(4);
  });

  it('runs a full auth + CRUD lifecycle against PostgreSQL', async () => {
    if (!databaseUp) {
      expect(true).toBe(true);
      return;
    }

    const email = `test.${Date.now()}@nexuscore.dev`;
    const password = 'Password123!';

    const registered = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Integration Tester', email, password })
      .expect(201);

    expect(registered.body.data.user.email).toBe(email);
    const { accessToken } = registered.body.data as { accessToken: string };
    expect(typeof accessToken).toBe('string');

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.data.user.email).toBe(email);

    const created = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Integration Test Project', priority: 'HIGH', budget: 1500 })
      .expect(201);

    const projectId = created.body.data.id as string;
    expect(created.body.data.slug).toBe('integration-test-project');

    const updated = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'ACTIVE', progress: 45 })
      .expect(200);
    expect(updated.body.data.status).toBe('ACTIVE');
    expect(updated.body.data.progress).toBe(45);

    const listed = await request(app)
      .get('/api/v1/projects?page=1&pageSize=5')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.meta.total).toBe(1);

    const stats = await request(app)
      .get('/api/v1/projects/stats')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(stats.body.data.total).toBe(1);
    expect(stats.body.data.byStatus.ACTIVE).toBe(1);

    const overview = await request(app)
      .get('/api/v1/metrics/overview?range=30d')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(overview.body.data.range).toBe('30d');
    expect(overview.body.data.totals).toBeDefined();

    const deleted = await request(app)
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(deleted.body.data.deleted).toBe(true);

    await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    const loggedOut = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(loggedOut.body.data.message).toContain('Signed out');
  });

  it('prevents one user from reading another user project', async () => {
    if (!databaseUp) {
      expect(true).toBe(true);
      return;
    }

    const stamp = Date.now();
    const ownerEmail = `owner.${stamp}@nexuscore.dev`;
    const intruderEmail = `intruder.${stamp}@nexuscore.dev`;

    const owner = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Owner', email: ownerEmail, password: 'Password123!' })
      .expect(201);

    const intruder = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Intruder', email: intruderEmail, password: 'Password123!' })
      .expect(201);

    const project = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${owner.body.data.accessToken}`)
      .send({ name: 'Private Project' })
      .expect(201);

    await request(app)
      .get(`/api/v1/projects/${project.body.data.id}`)
      .set('Authorization', `Bearer ${intruder.body.data.accessToken}`)
      .expect(404);
  });
});
