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

        // 3. Run Targeted Re-OCR Endpoint
        server.middlewares.use('/api/run-reocr', (req, res) => {
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
                const { snos, booth } = JSON.parse(body);
                if (!snos || !Array.isArray(snos) || snos.length === 0) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'No S.Nos provided' }));
                  return;
                }

                const snosStr = snos.join(',');
                const boothId = booth || 'gp_durgada';
                const scriptPath = path.resolve(__dirname, 'scripts/reocr_cards.py');
                const pythonCmd = `python3 "${scriptPath}" --snos "${snosStr}" --booth "${boothId}"`;

                const { exec } = require('child_process');
                exec(pythonCmd, { maxBuffer: 1024 * 1024 * 10 }, (error: any, stdout: string, stderr: string) => {
                  if (error) {
                    console.error('Re-OCR script error:', error, stderr);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message, stderr }));
                    return;
                  }

                  const boothPath = path.resolve(__dirname, `public/booths/${boothId}.json`);
                  let updatedVoters: any[] = [];
                  if (fs.existsSync(boothPath)) {
                    const raw = JSON.parse(fs.readFileSync(boothPath, 'utf8'));
                    const list = raw.voters || [];
                    const snoSet = new Set(snos.map(Number));
                    updatedVoters = list.filter((v: any) => snoSet.has(Number(v.s || v.sno)));
                  }

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    success: true,
                    count: updatedVoters.length,
                    updatedVoters,
                    output: stdout.trim()
                  }));
                });
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

        // 4. Save Re-OCR Queue Endpoint
        server.middlewares.use('/api/save-reocr-queue', (req, res) => {
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
                const { snos, notes } = JSON.parse(body);
                const filePath = path.resolve(__dirname, 'public/reocr_queue.json');
                fs.writeFileSync(filePath, JSON.stringify({
                  snos: snos || [],
                  count: (snos || []).length,
                  updatedAt: new Date().toISOString(),
                  notes: notes || ''
                }, null, 2), 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, count: (snos || []).length }));
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
