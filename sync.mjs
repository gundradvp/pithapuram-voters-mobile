import fs from 'node:fs';
import path from 'node:path';

const COMMIT_SHA = 'main';

const filesToSync = [
  'sync.js',
  'sync.cjs',
  'sync.mjs',
  'public/_redirects',
  'index.html',
  'package.json',
  'vite.config.ts',
  'src/main.tsx',
  'src/types.ts',
  'src/utils/safeStorage.ts',
  'src/utils/auth.ts',
  'src/utils/boothDirectoryHelper.ts',
  'src/utils/theme.ts',
  'src/utils/storage.ts',
  'src/utils/photoResolver.ts',
  'src/utils/i18n.ts',
  'src/utils/phoneticSearch.ts',
  'src/utils/surnameClassifier.ts',
  'src/utils/duplicateDetector.ts',
  'src/index.css',
  'src/App.tsx',
  'src/components/LoginModal.tsx',
  'src/components/AdminAssignmentModal.tsx',
  'src/components/ThemeSelectorModal.tsx',
  'src/components/BoothAssignmentModal.tsx',
  'src/components/BoothDirectoryModal.tsx',
  'src/components/HeaderMobile.tsx',
  'src/components/BottomNavMobile.tsx',
  'src/components/VotersTabMobile.tsx',
  'src/components/VotersExcelGrid.tsx',
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
  'src/components/BulkAssignModal.tsx',
  'src/components/SurnameLeaningModal.tsx',
  'src/components/DuplicateCompareModal.tsx',
  'src/components/SyncBackupModal.tsx',
  'src/utils/supabaseSync.ts',
  'src/utils/demoData.ts',
  'src/components/HousesTabMobile.tsx',
  'src/components/HourlyTurnoutModal.tsx',
  'src/components/SpeedDialModal.tsx',
  'src/components/StatsTabMobile.tsx',
  'src/components/KriyaTabMobile.tsx',
  'GUIDE_HOW_TO_USE.md',
  'public/assignments.json',
  'public/profiles/profiles_ward_14.json',
  'public/profiles/profiles_gp_durgada.json',
  "public/local_elections_index.json",
  "public/booths_index.json",
  "public/booths/gp_durgada.json",
  "public/booths/booth_gp_durgada.json",
  "public/booths/mptc_durgada_1.json",
  "public/booths/booth_mptc_durgada_1.json",
  "public/booths/mptc_durgada_2.json",
  "public/booths/booth_mptc_durgada_2.json",
  "public/booths/mptc_durgada_3.json",
  "public/booths/booth_mptc_durgada_3.json",
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
  "public/booths/gp_tatiparthy.json",
  "public/booths/booth_gp_tatiparthy.json",
  "public/booths/mptc_tatiparthy_1.json",
  "public/booths/booth_mptc_tatiparthy_1.json",
  "public/booths/mptc_tatiparthy_2.json",
  "public/booths/booth_mptc_tatiparthy_2.json",
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
  'public/profiles/profiles_mptc_durgada_1.json',
  'public/booths_index.json',
  'public/local_elections_index.json'
];

async function syncFile(file, index, total) {
  const ts = Date.now();
  const rawUrl = `https://raw.githubusercontent.com/gundradvp/pithapuram-voters-mobile/${COMMIT_SHA}/${file}?t=${ts}`;

  try {
    const res = await fetch(rawUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, text, 'utf8');
    console.log(`✅ [${index}/${total}] Updated ${file}`);
    return true;
  } catch (err) {
    console.error(`❌ [${index}/${total}] Failed: ${file} (${err.message})`);
    return false;
  }
}

async function run() {
  console.log(`🚀 Starting sync in Bolt (ESM Mode)...`);
  let count = 0;
  for (let i = 0; i < filesToSync.length; i++) {
    const ok = await syncFile(filesToSync[i], i + 1, filesToSync.length);
    if (ok) count++;
  }
  console.log(`\n🎉 DONE! ${count}/${filesToSync.length} files updated in Bolt!`);
  console.log(`👉 Run 'npm run dev' to restart preview.`);
}

run();
