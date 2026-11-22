import { BoothInfo, MobileVoter, VoterCampaignProfile } from '../types';
import { extractSurname } from './surnameClassifier';

export type ExcelExportFormat = 'surname_9_fields' | 'sno_9_fields' | 'full_22_fields';

export interface ExportVotersToExcelOptions {
  voters: MobileVoter[];
  profiles: Record<number, VoterCampaignProfile>;
  boothInfo: BoothInfo;
  scopeTitle?: string; // e.g. "ఎంపిక చేసిన ఓటర్లు" or "ఫిల్టర్ చేసిన ఓటర్లు"
  filePrefix?: string; // e.g. "Selected_Voters" or "Filtered_Voters"
  format?: ExcelExportFormat; // Defaults to 'surname_9_fields'
}

function escapeCsv(val: any): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function formatPhoneForExcel(phone: string): string {
  if (!phone) return '""';
  const clean = phone.trim();
  // Using ="..." forces Excel/Sheets to treat phone as text string, preventing scientific notation and preserving leading 0s
  return `="${clean.replace(/"/g, '""')}"`;
}

/**
 * 1. Export 9-field Excel CSV (Order by Surname or S.No)
 * Fields: S.No, ఓటరు పేరు (Voter Name), ఇంటి పేరు, సంబంధం / బంధువు పేరు (Relative Name), House No, AGE, లింగం (Gender), ఓటరు గుర్తింపు కార్డు (EPIC ID), PHONE
 */
export function exportVotersBySurnameExcel({
  voters,
  profiles,
  boothInfo,
  scopeTitle,
  filePrefix = 'Voters',
  format = 'surname_9_fields'
}: ExportVotersToExcelOptions): void {
  if (!voters || voters.length === 0) return;

  const partNo = boothInfo.part_no || boothInfo.ward_no || 'booth';
  const village = (boothInfo.clean_village || boothInfo.ps_address || 'Pithapuram').replace(/\s+/g, '_');

  // Exact 9 fields requested
  const headers = [
    'S.No',
    'ఓటరు పేరు (Voter Name)',
    'ఇంటి పేరు',
    'సంబంధం / బంధువు పేరు (Relative Name)',
    'House No',
    'AGE',
    'లింగం (Gender)',
    'ఓటరు గుర్తింపు కార్డు (EPIC ID)',
    'PHONE'
  ];

  // Prepare & Sort voters
  const prepared = voters.map(v => {
    const prof = profiles[v.s] || {};
    const { en: surnameEn, te: surnameTe } = extractSurname(v, prof);
    const customPhone = (prof.customPhone || '').trim();
    const kriyaPhone = (v.k_m || '').trim();
    const volunteerPhone = (v.v_mob || '').trim();
    const primaryPhone = customPhone || kriyaPhone || volunteerPhone;
    const gender = v.g === 'M' ? 'పురుషుడు (M)' : v.g === 'F' ? 'స్త్రీ (F)' : v.g || '';

    return {
      sno: v.s,
      voterName: v.n || '',
      surnameTe: surnameTe || surnameEn || '',
      surnameEn: surnameEn || '',
      relName: v.r || '',
      houseNo: v.hn || '',
      age: v.a || '',
      gender: gender,
      epicId: v.id || '',
      phone: primaryPhone
    };
  });

  if (format === 'surname_9_fields') {
    // Sort by Surname ascending (Telugu alphabetical order), then secondary by S.No
    prepared.sort((a, b) => {
      const cmp = a.surnameTe.localeCompare(b.surnameTe, 'te-IN');
      if (cmp !== 0) return cmp;
      return a.sno - b.sno;
    });
  } else {
    // Sort by S.No ascending
    prepared.sort((a, b) => a.sno - b.sno);
  }

  const rows = prepared.map(item => [
    item.sno,
    escapeCsv(item.voterName),
    escapeCsv(item.surnameTe),
    escapeCsv(item.relName),
    escapeCsv(item.houseNo),
    item.age,
    escapeCsv(item.gender),
    escapeCsv(item.epicId),
    formatPhoneForExcel(item.phone)
  ].join(','));

  const phoneCount = prepared.filter(p => !!p.phone).length;
  const sortLabel = format === 'surname_9_fields' ? 'ఇంటిపేర్ల క్రమంలో (Order by Surname)' : 'క్రమ సంఖ్యల క్రమంలో (S.No Order)';
  const titleText = scopeTitle || `బూత్ #${partNo} ఓటర్ల జాబితా (${sortLabel} - మొత్తం: ${prepared.length} మంది)`;

  const headerMeta1 = escapeCsv(`పిఠాపురం నియోజకవర్గం - బూత్ #${partNo} (${boothInfo.clean_village || boothInfo.ps_address || 'గ్రామం'}) - ${titleText}`);
  const headerMeta2 = escapeCsv(`మొత్తం ఓటర్లు: ${prepared.length} మంది | ఫోన్ నంబర్లు ఉన్నవారు: ${phoneCount} మంది (${Math.round((phoneCount / prepared.length) * 100)}%) | క్రమపద్ధతి: ${sortLabel} | తేదీ: ${new Date().toLocaleDateString('te-IN')}`);

  // \uFEFF Byte Order Mark ensures Microsoft Excel & Google Sheets render Telugu fonts properly
  const csvContent = '\uFEFF' + [
    headerMeta1,
    headerMeta2,
    '',
    headers.join(','),
    ...rows
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  const suffix = format === 'surname_9_fields' ? 'By_Surname_9Fields' : 'By_SNo_9Fields';
  link.download = `Booth_${partNo}_${village}_${filePrefix}_${prepared.length}_Voters_${suffix}_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 2. Full 22-field Excel CSV Export (Complete Analysis)
 */
export function exportVotersToExcelCsv({
  voters,
  profiles,
  boothInfo,
  scopeTitle,
  filePrefix = 'Voters',
  format = 'surname_9_fields'
}: ExportVotersToExcelOptions): void {
  // If user selected 9-field format, delegate directly
  if (format === 'surname_9_fields' || format === 'sno_9_fields') {
    exportVotersBySurnameExcel({ voters, profiles, boothInfo, scopeTitle, filePrefix, format });
    return;
  }

  if (!voters || voters.length === 0) return;

  const partNo = boothInfo.part_no || boothInfo.ward_no || 'booth';
  const village = (boothInfo.clean_village || boothInfo.ps_address || 'Pithapuram').replace(/\s+/g, '_');

  const headers = [
    'క్రమ సంఖ్య (S.No)',
    'ఓటరు పేరు (Voter Name)',
    'ఇంటిపేరు - తెలుగు (Surname Te)',
    'ఇంటిపేరు - ఇంగ్లీష్ (Surname En)',
    'సంబంధం / బంధువు పేరు (Relative Name)',
    'ఇంటి నెంబర్ (House No)',
    'వయస్సు (Age)',
    'లింగం (Gender)',
    'ఓటరు గుర్తింపు కార్డు (EPIC ID)',
    'మొబైల్ ఫోన్ (Mobile Phone)',
    'రెండో ఫోన్ (Alt Phone)',
    'ఫోన్ ఉందా? (Has Phone)',
    'ఫోన్ మూలం (Phone Source)',
    'క్రియా సభ్యులా? (Kriya Member)',
    'JSP మద్దతు శాతం (Support %)',
    'పోలింగ్ / సర్వే స్థితి (Polling Status)',
    'సెక్షన్ / వీధి (Street / Section)',
    'వార్డు నెంబర్ (Ward No)',
    'పోలింగ్ బూత్ (Booth Part No)',
    'కేటాయించిన నాయకుడు (Assigned Leader)',
    'కస్టమ్ మారుపేరు / సెర్చ్ నేమ్ (Custom Alias)',
    'గమనికలు (Notes)'
  ];

  const rows = voters.map((v) => {
    const prof = profiles[v.s] || {};
    const { en: surnameEn, te: surnameTe } = extractSurname(v, prof);

    // Primary Phone
    const customPhone = (prof.customPhone || '').trim();
    const kriyaPhone = (v.k_m || '').trim();
    const volunteerPhone = (v.v_mob || '').trim();

    const primaryPhone = customPhone || kriyaPhone || volunteerPhone;
    const altPhone = prof.altPhone?.trim() || (customPhone && kriyaPhone && customPhone !== kriyaPhone ? kriyaPhone : '');

    let phoneSource = 'లేదు (None)';
    if (customPhone) {
      phoneSource = 'సర్వే / యూజర్ ఎంట్రీ (Custom Survey)';
    } else if (kriyaPhone) {
      phoneSource = 'క్రియా డేటా (Kriya Portal)';
    } else if (volunteerPhone) {
      phoneSource = 'వాలంటీర్ డేటా (Volunteer)';
    }

    const pct = prof.supportPct !== undefined ? `${prof.supportPct}%` : (v.kriya ? '100%' : '50% (తటస్థం)');

    let status = 'పెండింగ్ / పరిశీలనలో (Pending)';
    if (prof.survey_status === 'voted') status = 'ఓటేశారు (Voted)';
    else if (prof.survey_status === 'deceased') status = 'మరణించారు (Deceased)';
    else if (prof.survey_status === 'out_of_city') status = 'వలస / ఊర్లో లేరు (Migrated)';
    else if (prof.survey_status === 'supporter') status = 'పక్కా మద్దతుదారు (Supporter)';

    const gender = v.g === 'M' ? 'పురుషుడు (M)' : v.g === 'F' ? 'స్త్రీ (F)' : v.g || '';

    return [
      v.s,
      escapeCsv(v.n),
      escapeCsv(surnameTe),
      escapeCsv(surnameEn),
      escapeCsv(v.r),
      escapeCsv(v.hn),
      v.a || '',
      escapeCsv(gender),
      escapeCsv(v.id),
      formatPhoneForExcel(primaryPhone),
      formatPhoneForExcel(altPhone),
      escapeCsv(primaryPhone ? 'YES' : 'NO'),
      escapeCsv(phoneSource),
      v.kriya ? 'అవును (YES)' : 'కాదు (NO)',
      escapeCsv(pct),
      escapeCsv(status),
      escapeCsv(v.sec || ''),
      escapeCsv(v.ward_no ? `వార్డు #${v.ward_no}` : (boothInfo.ward_no ? `వార్డు #${boothInfo.ward_no}` : '')),
      escapeCsv(`Part #${v.ac_part || boothInfo.part_no || ''}`),
      escapeCsv(prof.influencerName || ''),
      escapeCsv(prof.customAlias || ''),
      escapeCsv(prof.notes || '')
    ].join(',');
  });

  const titleText = scopeTitle || `బూత్ #${partNo} ఓటర్ల జాబితా (మొత్తం: ${voters.length} మంది)`;
  const phoneCount = voters.filter(v => {
    const prof = profiles[v.s] || {};
    return !!(prof.customPhone || v.k_m || v.v_mob);
  }).length;

  const headerMeta1 = escapeCsv(`పిఠాపురం నియోజకవర్గం - బూత్ #${partNo} (${boothInfo.clean_village || boothInfo.ps_address || 'గ్రామం'}) - ${titleText}`);
  const headerMeta2 = escapeCsv(`మొత్తం ఓటర్లు: ${voters.length} మంది | ఫోన్ నంబర్లు ఉన్నవారు: ${phoneCount} మంది (${Math.round((phoneCount / voters.length) * 100)}%) | తేదీ: ${new Date().toLocaleDateString('te-IN')}`);

  // \uFEFF Byte Order Mark ensures Microsoft Excel & Google Sheets render Telugu fonts properly
  const csvContent = '\uFEFF' + [
    headerMeta1,
    headerMeta2,
    '',
    headers.join(','),
    ...rows
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `Booth_${partNo}_${village}_${filePrefix}_${voters.length}_Voters_Full_Analysis_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
