import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-profiles-and-assignments-persister',
      configureServer(server) {
        // 1. Save Profiles Endpoint
        server.middlewares.use('/api/save-profiles', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const { partNo, profiles } = JSON.parse(body);
                if (!partNo || !profiles) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Missing partNo or profiles' }));
                  return;
                }
                const dir = path.resolve(__dirname, 'public/profiles');
                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
                }
                const filePath = path.join(dir, `profiles_${partNo}.json`);
                fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, count: Object.keys(profiles).length }));
              } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e?.message || 'Server error' }));
              }
            });
          } else {
            res.writeHead(405);
            res.end();
          }
        });

        // 2. Save Volunteer Assignments Endpoint (Cross-device persistence)
        server.middlewares.use('/api/save-assignments', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const { assignments } = JSON.parse(body);
                if (!assignments || !Array.isArray(assignments)) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Missing or invalid assignments array' }));
                  return;
                }
                const filePath = path.resolve(__dirname, 'public/assignments.json');
                fs.writeFileSync(filePath, JSON.stringify(assignments, null, 2), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, count: assignments.length }));
              } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e?.message || 'Server error' }));
              }
            });
          } else {
            res.writeHead(405);
            res.end();
          }
        });
      }
    }
  ],
  server: {
    port: 3002,
    host: true
  }
});
