import { BoothInfo, MobileVoter, VoterCampaignProfile } from '../types';
import { SurnameGroup } from './surnameClassifier';

/**
 * Turns an array of numbers like [1, 2, 3, 5, 8, 9, 10] into range string "1-3, 5, 8-10"
 */
export function formatSnoRanges(snos: number[]): string {
  if (!snos || snos.length === 0) return '';
  const sorted = Array.from(new Set(snos)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (cur === end + 1) {
      end = cur;
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = cur;
      end = cur;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
}

function escapeCsv(val: any): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function triggerCsvDownload(csvString: string, filename: string): void {
  // \uFEFF Byte Order Mark ensures Microsoft Excel and Google Sheets render Telugu fonts properly
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. Export Surnames Summary CSV with all respective Serial Numbers (S.Nos)
 */
export function exportSurnamesSummaryCsv(
  boothInfo: BoothInfo,
  clans: SurnameGroup[],
  customTitle?: string
): void {
  const partNo = boothInfo.part_no || boothInfo.ward_no || 'booth';
  const village = boothInfo.clean_village || boothInfo.ps_address || 'Pithapuram';

  const headers = [
    'ర్యాంక్ (#)',
    'ఇంటిపేరు (తెలుగు)',
    'Surname (English)',
    'మొత్తం ఓటర్లు (Count)',
    'బూత్ ఓట్ల % (Share)',
    'ఓటరు క్రమ సంఖ్యలు (Serial Numbers)',
    'క్రమ సంఖ్యల శ్రేణి (S.No Ranges)',
    'కలిపిన సారూప్యాలు (Merged Variants)',
    'JSP మద్దతు %',
    'పక్కా మద్దతు (100% Full)',
    'అనుకూలం (75% Strong)',
    'స్వింగ్/తటస్థం (50% Neutral)',
    'వ్యతిరేకులు (Opponents)',
    'పురుషులు (Male)',
    'మహిళలు (Female)',
    'వయోవృద్ధులు 60+ (Elders)',
    'ఇంటి నెంబర్లు (Houses)'
  ];

  const rows = clans.map((c, idx) => {
    const snos = c.voters.map(v => v.s).sort((a, b) => a - b);
    const snosListStr = snos.join(', ');
    const snosRangeStr = formatSnoRanges(snos);
    const variantsStr = (c.similarVariants || []).map(v => `${v.nameTe || v.nameEn} (${v.count})`).join(', ');
    const housesStr = (c.houseNumbers || []).join(', ');

    return [
      idx + 1,
      escapeCsv(c.nameTe || c.nameEn),
      escapeCsv(c.nameEn),
      c.totalVoters,
      `${c.pctOfBooth}%`,
      escapeCsv(snosListStr),
      escapeCsv(snosRangeStr),
      escapeCsv(variantsStr || '-'),
      `${c.supportPct}%`,
      c.fullCount,
      c.strongCount,
      c.neutralCount,
      c.opponentCount,
      c.maleCount,
      c.femaleCount,
      c.topElders?.length || 0,
      escapeCsv(housesStr)
    ].join(',');
  });

  const titleRow = escapeCsv(`పిఠాపురం నియోజకవర్గం - బూత్ #${partNo} (${village}) - ఇంటిపేర్లు & క్రమ సంఖ్యల సారాంశ జాబితా`);
  const metaRow = escapeCsv(`మొత్తం ఇంటిపేర్లు: ${clans.length} | మొత్తం ఓటర్లు: ${clans.reduce((a, b) => a + b.totalVoters, 0)} | తేదీ: ${new Date().toLocaleDateString('te-IN')}`);
  const csvContent = [titleRow, metaRow, '', headers.join(','), ...rows].join('\n');

  const cleanFileName = `Booth_${partNo}_${village.replace(/\s+/g, '_')}_Surnames_Serial_Numbers_Summary.csv`;
  triggerCsvDownload(csvContent, cleanFileName);
}

/**
 * 2. Export Detailed Voter-by-Voter CSV grouped by Surname and ordered by S.No
 */
export function exportDetailedSurnamesVotersCsv(
  boothInfo: BoothInfo,
  clans: SurnameGroup[],
  profiles: Record<number, VoterCampaignProfile> = {}
): void {
  const partNo = boothInfo.part_no || boothInfo.ward_no || 'booth';
  const village = boothInfo.clean_village || boothInfo.ps_address || 'Pithapuram';

  const headers = [
    'ఇంటిపేరు (తెలుగు)',
    'Surname (English)',
    'వంశం ర్యాంక్ (#)',
    'ఓటరు క్రమ సంఖ్య (S.No)',
    'ఓటరు పేరు (Voter Name)',
    'సంబంధం / బంధువు పేరు (Relative Name)',
    'ఇంటి నెంబర్ (House No)',
    'వయస్సు (Age)',
    'లింగం (Gender)',
    'ఓటరు గుర్తింపు కార్డు (EPIC ID)',
    'ఫోన్ నెంబర్ (Phone)',
    'మద్దతు శాతం (Support %)',
    'సర్వే స్థితి (Survey Status)',
    'క్రియా సభ్యులా? (Kriya Member)',
    'ఇన్‌ఫ్లుయెన్సర్ (Influencer)',
    'గమనికలు (Notes)'
  ];

  const rows: string[] = [];

  clans.forEach((c, clanIdx) => {
    // Sort voters within clan by Serial Number
    const sortedVoters = [...c.voters].sort((a, b) => a.s - b.s);

    sortedVoters.forEach(v => {
      const prof = profiles[v.s] || {};
      const phone = prof.customPhone || v.k_m || '';
      const pct = prof.supportPct !== undefined ? `${prof.supportPct}%` : (v.kriya ? '100%' : '50%');

      rows.push([
        escapeCsv(c.nameTe || c.nameEn),
        escapeCsv(c.nameEn),
        clanIdx + 1,
        v.s,
        escapeCsv(v.n),
        escapeCsv(v.r),
        escapeCsv(v.hn),
        v.a || '',
        v.g || '',
        escapeCsv(v.id),
        escapeCsv(phone),
        escapeCsv(pct),
        escapeCsv(prof.survey_status || 'unmarked'),
        v.kriya ? 'YES' : 'NO',
        escapeCsv(prof.influencerName || ''),
        escapeCsv(prof.notes || '')
      ].join(','));
    });
  });

  const titleRow = escapeCsv(`పిఠాపురం నియోజకవర్గం - బూత్ #${partNo} (${village}) - ఇంటిపేర్ల వారీగా ఓటర్ల క్రమ సంఖ్యల పూర్తి జాబితా`);
  const metaRow = escapeCsv(`మొత్తం వంశాలు: ${clans.length} | మొత్తం ఓటర్లు: ${rows.length} | తేదీ: ${new Date().toLocaleDateString('te-IN')}`);
  const csvContent = [titleRow, metaRow, '', headers.join(','), ...rows].join('\n');

  const cleanFileName = `Booth_${partNo}_${village.replace(/\s+/g, '_')}_Voters_By_Surname_Detailed.csv`;
  triggerCsvDownload(csvContent, cleanFileName);
}

/**
 * 3. Generate WhatsApp-friendly formatted text with Surnames & Serial numbers
 */
export function generateSurnamesWhatsAppText(
  boothInfo: BoothInfo,
  clans: SurnameGroup[],
  limitClans?: number
): string {
  const partNo = boothInfo.part_no || boothInfo.ward_no || 'booth';
  const village = boothInfo.clean_village || boothInfo.ps_address || 'పిఠాపురం';
  const targetClans = limitClans ? clans.slice(0, limitClans) : clans;
  const totalVoters = targetClans.reduce((a, b) => a + b.totalVoters, 0);

  const lines: string[] = [
    `🏛️ *పిఠాపురం — బూత్ #${partNo} (${village})*`,
    `📋 *ఇంటిపేర్లు & ఓటరు క్రమ సంఖ్యల (S.No) జాబితా*`,
    `📊 మొత్తం: *${targetClans.length} ఇంటిపేర్లు* • *${totalVoters} ఓటర్లు*`,
    `───────────────────────`
  ];

  targetClans.forEach((c, idx) => {
    const snos = c.voters.map(v => v.s).sort((a, b) => a - b);
    const snosStr = snos.join(', ');
    const rangeStr = formatSnoRanges(snos);
    const variants = c.similarVariants && c.similarVariants.length > 0
      ? ` (కలిపినవి: ${c.similarVariants.map(v => `${v.nameTe || v.nameEn} ${v.count}`).join(', ')})`
      : '';

    lines.push(`*${idx + 1}. ${c.nameTe || c.nameEn} (${c.nameEn})* — *${c.totalVoters} ఓటర్లు* (${c.pctOfBooth}%)${variants}`);
    lines.push(`🔢 *క్రమ సంఖ్యలు:* ${snosStr}`);
    if (snos.length > 3) {
      lines.push(`📍 *శ్రేణి (Ranges):* ${rangeStr}`);
    }
    lines.push(``);
  });

  lines.push(`───────────────────────`);
  lines.push(`✊ *జై జనసేన! జనసేన పార్టీ పిఠాపురం ఎన్నికల విభాగం* 🗳️`);

  return lines.join('\n');
}

/**
 * 4. Generate WhatsApp-friendly text for a SINGLE surname clan
 */
export function generateSingleClanWhatsAppText(
  boothInfo: BoothInfo,
  clan: SurnameGroup
): string {
  const partNo = boothInfo.part_no || boothInfo.ward_no || 'booth';
  const village = boothInfo.clean_village || boothInfo.ps_address || 'పిఠాపురం';
  const snos = clan.voters.map(v => v.s).sort((a, b) => a - b);
  const snosStr = snos.join(', ');
  const rangeStr = formatSnoRanges(snos);
  const variants = clan.similarVariants && clan.similarVariants.length > 0
    ? `\n🔀 *కలిపిన సారూప్యాలు:* ${clan.similarVariants.map(v => `${v.nameTe || v.nameEn} (${v.count})`).join(', ')}`
    : '';

  const lines = [
    `🏛️ *పిఠాపురం బూత్ #${partNo} (${village})*`,
    `🏷️ *వంశం:* *${clan.nameTe || clan.nameEn} (${clan.nameEn})*`,
    `📊 *మొత్తం ఓటర్లు:* *${clan.totalVoters}* (${clan.pctOfBooth}% బూత్ ఓట్లు)`,
    `🏠 *ఇళ్లు:* ${clan.houseNumbers.length} ఇళ్లు | 👨 పురుషులు: ${clan.maleCount} | 👩 మహిళలు: ${clan.femaleCount}`,
    variants,
    `🔢 *ఓటరు క్రమ సంఖ్యలు (S.Nos):*`,
    `${snosStr}`,
    snos.length > 3 ? `📍 *శ్రేణి (Ranges):* ${rangeStr}` : '',
    ``,
    `✊ *జనసేన పార్టీ పిఠాపురం సమన్వయం*`
  ].filter(Boolean);

  return lines.join('\n');
}
