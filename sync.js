const fs = require('fs');
const path = require('path');
const https = require('https');

const COMMIT_SHA = 'main';

const filesToSync = [
  'sync.js',
  'index.html',
  'package.json',
  'src/types.ts',
  'src/utils/auth.ts',
  'src/utils/theme.ts',
  'src/utils/storage.ts',
  'src/utils/photoResolver.ts',
  'src/utils/i18n.ts',
  'src/utils/phoneticSearch.ts',
  'src/utils/surnameClassifier.ts',
  'src/index.css',
  'src/App.tsx',
  'src/components/LoginModal.tsx',
  'src/components/AdminAssignmentModal.tsx',
  'src/components/ThemeSelectorModal.tsx',
  'src/components/BoothAssignmentModal.tsx',
  'src/components/HeaderMobile.tsx',
  'src/components/BottomNavMobile.tsx',
  'src/components/VotersTabMobile.tsx',
  'src/components/FamiliesTabMobile.tsx',
  'src/components/WarRoomTabMobile.tsx',
  'src/components/InfluencersTabMobile.tsx',
  'src/components/OfflineTabMobile.tsx',
  'src/components/WinningScoreBanner.tsx',
  'src/components/CreateFamilyModal.tsx',
  'src/components/LogVisitModal.tsx',
  'src/components/SupportLeaningPicker.tsx',
  'src/components/PhoneEditorModal.tsx',
  'src/components/InfluencerAssignModal.tsx',
  'src/components/VoterSlipModal.tsx',
  'src/components/GroupPrintModal.tsx',
  'src/components/SurnameLeaningModal.tsx',
  'public/local_elections_index.json',
  'public/booths/booth_ward_14.json',
  'public/booths/ward_14.json',
  'public/booths/booth_gollaprolu_ward_11.json',
  'public/booths/gollaprolu_ward_11.json',
  'public/booths/gp_vannepudi.json',
  'public/booths/booth_gp_vannepudi.json',
  'public/booths/mptc_durgada_1.json',
  'public/booths/booth_mptc_durgada_1.json',
  'public/booths/mptc_durgada_3.json',
  'public/booths/booth_mptc_durgada_3.json',
  'public/booths/gp_durgada.json',
  'public/booths/booth_gp_durgada.json',
  'public/booths/booth_9.json',
  'public/booths/booth_11.json',
  'public/booths/booth_12.json',
  'public/booths/booth_13.json',
  'public/booths/booth_14.json',
  'public/booths/booth_15.json',
  'public/booths/booth_16.json',
  'public/booths/booth_17.json',
  'public/booths/booth_18.json',
  'public/booths/booth_19.json',
  'public/booths/booth_23.json',
  'public/booths/booth_24.json',
  'public/booths/booth_25.json'
];

function fetchWithHttps(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Bolt-Sync/1.0)',
        'Accept': '*/*'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchWithHttps(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function syncFile(file, index, total) {
  const ts = Date.now();
  const rawUrl = `https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/${COMMIT_SHA}/${file}?t=${ts}`;
  const cdnUrl = `https://cdn.jsdelivr.net/gh/gundradvp/pithapuram-voters-mobile@${COMMIT_SHA}/${file}`;

  let content = null;
  try {
    content = await fetchWithHttps(rawUrl);
  } catch (e) {
    try {
      content = await fetchWithHttps(cdnUrl);
    } catch (e2) {}
  }

  if (content === null) {
    console.error(`❌ [${index}/${total}] Failed to fetch: ${file}`);
    return false;
  }

  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log(`✅ [${index}/${total}] Updated ${file}`);
  return true;
}

async function run() {
  console.log(`🚀 Starting sync of JSP Pithapuram Voter Mobile App into Bolt...`);
  let successCount = 0;
  for (let i = 0; i < filesToSync.length; i++) {
    const ok = await syncFile(filesToSync[i], i + 1, filesToSync.length);
    if (ok) successCount++;
  }
  console.log(`\n🎉 DONE! ${successCount}/${filesToSync.length} files successfully updated inside Bolt!`);
  console.log(`👉 Run 'npm run dev' to restart your preview.`);
}

run();
