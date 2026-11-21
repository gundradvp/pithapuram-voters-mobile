const fs = require('fs');
const path = require('path');
const https = require('https');

const COMMIT_SHA = 'main';

const filesToSync = [
  "sync.js",
  "sync.cjs",
  "index.html",
  "package.json",
  "vite.config.ts",
  "GUIDE_HOW_TO_USE.md",
  "src/App.tsx",
  "src/index.css",
  "src/main.tsx",
  "src/types.ts",
  "src/utils/auth.ts",
  "src/utils/boothDirectoryHelper.ts",
  "src/utils/demoData.ts",
  "src/utils/duplicateDetector.ts",
  "src/utils/i18n.ts",
  "src/utils/phoneticSearch.ts",
  "src/utils/photoResolver.ts",
  "src/utils/safeStorage.ts",
  "src/utils/storage.ts",
  "src/utils/supabaseSync.ts",
  "src/utils/surnameClassifier.ts",
  "src/utils/surnameExporter.ts",
  "src/utils/teluguTransliterator.ts",
  "src/utils/theme.ts",
  "src/utils/voterExcelExporter.ts",
  "src/components/AdminAssignmentModal.tsx",
  "src/components/BoothAssignmentModal.tsx",
  "src/components/BoothDirectoryModal.tsx",
  "src/components/BottomNavMobile.tsx",
  "src/components/BulkAssignModal.tsx",
  "src/components/CreateFamilyModal.tsx",
  "src/components/DuplicateCompareModal.tsx",
  "src/components/ExportSurnamesModal.tsx",
  "src/components/FamiliesTabMobile.tsx",
  "src/components/FamilyWhatsAppCardModal.tsx",
  "src/components/GroupPrintModal.tsx",
  "src/components/HeaderMobile.tsx",
  "src/components/HourlyTurnoutModal.tsx",
  "src/components/HousesTabMobile.tsx",
  "src/components/InfluencerAssignModal.tsx",
  "src/components/InfluencersTabMobile.tsx",
  "src/components/KriyaTabMobile.tsx",
  "src/components/LogVisitModal.tsx",
  "src/components/LoginModal.tsx",
  "src/components/OfflineTabMobile.tsx",
  "src/components/OutOfVillageLogisticsModal.tsx",
  "src/components/PhoneEditorModal.tsx",
  "src/components/PollingFastPunchModal.tsx",
  "src/components/ReOcrReviewModal.tsx",
  "src/components/SpeedDialModal.tsx",
  "src/components/StatsTabMobile.tsx",
  "src/components/SupportLeaningPicker.tsx",
  "src/components/SurnameLeaningModal.tsx",
  "src/components/SyncBackupModal.tsx",
  "src/components/ThemeSelectorModal.tsx",
  "src/components/VoterSlipModal.tsx",
  "src/components/VotersExcelGrid.tsx",
  "src/components/VotersTabMobile.tsx",
  "src/components/WarRoomTabMobile.tsx",
  "src/components/WardMarginPredictorModal.tsx",
  "src/components/WinningScoreBanner.tsx",
  "public/_redirects",
  "public/assignments.json",
  "public/booths_index.json",
  "public/booths/gp_nagulapalli.json",
  "public/booths/booth_gp_nagulapalli.json",
  "public/booths/gp_nagulapalli_w1.json",
  "public/booths/booth_gp_nagulapalli_w1.json",
  "public/booths/gp_nagulapalli_w2.json",
  "public/booths/booth_gp_nagulapalli_w2.json",
  "public/booths/gp_nagulapalli_w3.json",
  "public/booths/booth_gp_nagulapalli_w3.json",
  "public/booths/gp_nagulapalli_w4.json",
  "public/booths/booth_gp_nagulapalli_w4.json",
  "public/booths/gp_nagulapalli_w5.json",
  "public/booths/booth_gp_nagulapalli_w5.json",
  "public/booths/gp_nagulapalli_w6.json",
  "public/booths/booth_gp_nagulapalli_w6.json",
  "public/booths/gp_nagulapalli_w7.json",
  "public/booths/booth_gp_nagulapalli_w7.json",
  "public/booths/gp_nagulapalli_w8.json",
  "public/booths/booth_gp_nagulapalli_w8.json",
  "public/booths/gp_nagulapalli_w9.json",
  "public/booths/booth_gp_nagulapalli_w9.json",
  "public/booths/gp_nagulapalli_w10.json",
  "public/booths/booth_gp_nagulapalli_w10.json",
  "public/booths/gp_nagulapalli_w11.json",
  "public/booths/booth_gp_nagulapalli_w11.json",
  "public/booths/gp_nagulapalli_w12.json",
  "public/booths/booth_gp_nagulapalli_w12.json",
  "public/booths/gp_nagulapalli_w13.json",
  "public/booths/booth_gp_nagulapalli_w13.json",
  "public/booths/gp_nagulapalli_w14.json",
  "public/booths/booth_gp_nagulapalli_w14.json",
  "public/local_elections_index.json",
  "public/profiles/profiles_gp_durgada.json",
  "public/profiles/profiles_gp_durgada_w14.json",
  "public/profiles/profiles_gp_tatiparthy.json",
  "public/profiles/profiles_mptc_durgada_1.json",
  "public/profiles/profiles_ward_14.json",
  "public/booths/gp_durgada.json",
  "public/booths/booth_gp_durgada.json",
  "public/booths/gp_tatiparthy.json",
  "public/booths/booth_gp_tatiparthy.json",
  "public/booths/mptc_durgada_1.json",
  "public/booths/booth_mptc_durgada_1.json",
  "public/booths/mptc_durgada_2.json",
  "public/booths/booth_mptc_durgada_2.json",
  "public/booths/mptc_durgada_3.json",
  "public/booths/booth_mptc_durgada_3.json",
  "public/booths/mptc_tatiparthy_1.json",
  "public/booths/booth_mptc_tatiparthy_1.json",
  "public/booths/mptc_tatiparthy_2.json",
  "public/booths/booth_mptc_tatiparthy_2.json",
  "public/booths/mptc_chebrolu_4.json",
  "public/booths/booth_mptc_chebrolu_4.json",
  "public/booths/ward_14.json",
  "public/booths/booth_ward_14.json",
  "public/booths/gollaprolu_ward_11.json",
  "public/booths/booth_gollaprolu_ward_11.json",
  "public/booths/gp_vannepudi.json",
  "public/booths/booth_gp_vannepudi.json",
  "public/booths/gp_tatiparthy_w1.json",
  "public/booths/booth_gp_tatiparthy_w1.json",
  "public/booths/gp_tatiparthy_w2.json",
  "public/booths/booth_gp_tatiparthy_w2.json",
  "public/booths/gp_tatiparthy_w3.json",
  "public/booths/booth_gp_tatiparthy_w3.json",
  "public/booths/gp_tatiparthy_w4.json",
  "public/booths/booth_gp_tatiparthy_w4.json",
  "public/booths/gp_tatiparthy_w5.json",
  "public/booths/booth_gp_tatiparthy_w5.json",
  "public/booths/gp_tatiparthy_w6.json",
  "public/booths/booth_gp_tatiparthy_w6.json",
  "public/booths/gp_tatiparthy_w7.json",
  "public/booths/booth_gp_tatiparthy_w7.json",
  "public/booths/gp_tatiparthy_w8.json",
  "public/booths/booth_gp_tatiparthy_w8.json",
  "public/booths/gp_tatiparthy_w9.json",
  "public/booths/booth_gp_tatiparthy_w9.json",
  "public/booths/gp_tatiparthy_w10.json",
  "public/booths/booth_gp_tatiparthy_w10.json",
  "public/booths/gp_tatiparthy_w11.json",
  "public/booths/booth_gp_tatiparthy_w11.json",
  "public/booths/gp_tatiparthy_w12.json",
  "public/booths/booth_gp_tatiparthy_w12.json",
  "public/booths/gp_tatiparthy_w13.json",
  "public/booths/booth_gp_tatiparthy_w13.json",
  "public/booths/gp_tatiparthy_w14.json",
  "public/booths/booth_gp_tatiparthy_w14.json",
  "public/booths/gp_durgada_w1.json",
  "public/booths/booth_gp_durgada_w1.json",
  "public/booths/gp_durgada_w2.json",
  "public/booths/booth_gp_durgada_w2.json",
  "public/booths/gp_durgada_w3.json",
  "public/booths/booth_gp_durgada_w3.json",
  "public/booths/gp_durgada_w4.json",
  "public/booths/booth_gp_durgada_w4.json",
  "public/booths/gp_durgada_w5.json",
  "public/booths/booth_gp_durgada_w5.json",
  "public/booths/gp_durgada_w6.json",
  "public/booths/booth_gp_durgada_w6.json",
  "public/booths/gp_durgada_w7.json",
  "public/booths/booth_gp_durgada_w7.json",
  "public/booths/gp_durgada_w8.json",
  "public/booths/booth_gp_durgada_w8.json",
  "public/booths/gp_durgada_w9.json",
  "public/booths/booth_gp_durgada_w9.json",
  "public/booths/gp_durgada_w10.json",
  "public/booths/booth_gp_durgada_w10.json",
  "public/booths/gp_durgada_w11.json",
  "public/booths/booth_gp_durgada_w11.json",
  "public/booths/gp_durgada_w12.json",
  "public/booths/booth_gp_durgada_w12.json",
  "public/booths/gp_durgada_w13.json",
  "public/booths/booth_gp_durgada_w13.json",
  "public/booths/gp_durgada_w14.json",
  "public/booths/booth_gp_durgada_w14.json",
  "public/booths/gp_durgada_w15.json",
  "public/booths/booth_gp_durgada_w15.json",
  "public/booths/gp_durgada_w16.json",
  "public/booths/booth_gp_durgada_w16.json",
  "public/booths/booth_9.json",
  "public/booths/booth_11.json",
  "public/booths/booth_12.json",
  "public/booths/booth_13.json",
  "public/booths/booth_14.json",
  "public/booths/booth_15.json",
  "public/booths/booth_16.json",
  "public/booths/booth_17.json",
  "public/booths/booth_18.json",
  "public/booths/booth_19.json",
  "public/booths/booth_23.json",
  "public/booths/booth_24.json",
  "public/booths/booth_25.json"
];

function fetchWithHttps(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Bolt-Voter-Sync)',
        'Cache-Control': 'no-cache'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchWithHttps(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(90000, () => {
      req.destroy();
      reject(new Error('Timeout after 90s'));
    });
  });
}

async function syncFile(file, index, total) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Fast duplicate copy check to avoid re-downloading large identical booth files
  if (file.startsWith('public/booths/booth_')) {
    const counterpart = file.replace('public/booths/booth_', 'public/booths/');
    if (fs.existsSync(counterpart)) {
      fs.copyFileSync(counterpart, file);
      console.log('✅ [' + index + '/' + total + '] Linked from counterpart: ' + file);
      return true;
    }
  } else if (file.startsWith('public/booths/gp_') || file.startsWith('public/booths/mptc_') || file.startsWith('public/booths/ward_')) {
    const counterpart = file.replace('public/booths/', 'public/booths/booth_');
    if (fs.existsSync(counterpart)) {
      fs.copyFileSync(counterpart, file);
      console.log('✅ [' + index + '/' + total + '] Linked from counterpart: ' + file);
      return true;
    }
  }

  const ts = Date.now();
  const rawUrl = 'https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/' + COMMIT_SHA + '/' + file + '?t=' + ts;
  const cdnUrl = 'https://cdn.jsdelivr.net/gh/gundradvp/pithapuram-voters-mobile@' + COMMIT_SHA + '/' + file;

  let content = null;
  try {
    content = await fetchWithHttps(rawUrl);
  } catch (e) {
    try {
      content = await fetchWithHttps(cdnUrl);
    } catch (e2) {}
  }

  if (content === null) {
    console.error('❌ [' + index + '/' + total + '] Failed to fetch: ' + file);
    return false;
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ [' + index + '/' + total + '] Updated ' + file);
  return true;
}

async function run() {
  console.log('🚀 Starting sync of JSP Pithapuram Voter Mobile App into Bolt...');
  console.log('📦 Total files queued: ' + filesToSync.length);
  let successCount = 0;
  for (let i = 0; i < filesToSync.length; i++) {
    const ok = await syncFile(filesToSync[i], i + 1, filesToSync.length);
    if (ok) successCount++;
  }
  console.log('\n🎉 DONE! ' + successCount + '/' + filesToSync.length + ' files successfully updated inside Bolt!');
  console.log('👉 If preview does not refresh automatically, run: npm run dev');
}

run();
