import request from 'supertest';
import { describe, it, expect, vi } from 'vitest';
import app from '../server/index.js';

describe('Backend API Tests', () => {
    it('GET /api/health should return status ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });

    it('GET /api/manga should return a list', async () => {
        const res = await request(app).get('/api/manga');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });


    it('GET /api/libraries should return libraries', async () => {
        const res = await request(app).get('/api/libraries');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/tags should return tags list', async () => {
        const res = await request(app).get('/api/tags');
        expect(res.status).toBe(200);
    });

    it('GET /api/search/suggestions should return suggestions', async () => {
        const res = await request(app).get('/api/search/suggestions');
        expect(res.status).toBe(200);
    });
});
