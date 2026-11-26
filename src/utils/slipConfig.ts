import { BoothInfo, MobileVoter } from '../types';
import { resolveWardPollingStation } from './boothDirectoryHelper';

export interface WardCandidateConfig {
  wardNo: number;
  memberName: string;
  symbol: string;
  serialNo: string;
}

export interface WhatsAppSlipConfig {
  template: string;
  wardCandidates: Record<string, WardCandidateConfig>;
}

export const SLIP_CONFIG_STORAGE_KEY = 'jsp_whatsapp_slip_config_v1';

export const DEFAULT_WHATSAPP_SLIP_TEMPLATE = `🗳️ *ఓటర్ సమాచార పత్రం*

నమస్తే అండి, నేను మీ *జ్యోతుల సత్యనారాయణమ్మ*.
దుర్గాడ శివాలయం తరఫున సర్పంచ్ అభ్యర్థిగా పోటీలో ఉన్నాను.
దయచేసి మన దుర్గాడ శివయ్యను గెలిపించండి. మీ అమూల్యమైన ఓటును *కత్తెర* ✂️ గుర్తుపై వేసి గెలిపించవలసిందిగా ప్రార్థన. 🙏

మన వార్డ్ మెంబర్ అభ్యర్థి: *{{ward_member}}* (క్రమ సంఖ్య: *{{ward_serial}}*)
మీ అమూల్యమైన ఓటును *{{ward_symbol}}* గుర్తుపై వేసి అఖండ మెజారిటీతో గెలిపించవలసిందిగా ప్రార్థన. 🙏

*{{voter_name}}* గారు, మీ అధికారిక ఓటర్ సమాచారం:
🔢 *క్రమ సంఖ్య (S.No):* #{{sno}}
🆔 *ఓటర్ ఐడీ (EPIC):* {{epic}}
📍 *వార్డ్ నెం.:* {{ward_no}}
🏛️ *పోలింగ్ కేంద్రం:* {{polling_station}}
⏰ *పోలింగ్ సమయం:* ఉదయం 6:30 నుండి మధ్యాహ్నం 1:00 వరకు

_దయచేసి మీ ఓటు హక్కును వినియోగించుకోండి! ప్రతి ఓటూ అమూల్యం._ 🗳️`;

export const SLIP_TEMPLATE_PLACEHOLDERS: { key: string; labelTe: string; labelEn: string }[] = [
  { key: '{{voter_name}}', labelTe: 'ఓటరు పేరు', labelEn: 'Voter Name' },
  { key: '{{sno}}', labelTe: 'క్రమ సంఖ్య', labelEn: 'Voter S.No' },
  { key: '{{epic}}', labelTe: 'ఓటర్ ఐడీ (EPIC)', labelEn: 'EPIC ID' },
  { key: '{{ward_no}}', labelTe: 'వార్డ్ నెం.', labelEn: 'Ward No' },
  { key: '{{polling_station}}', labelTe: 'పోలింగ్ కేంద్రం', labelEn: 'Polling Station' },
  { key: '{{house_no}}', labelTe: 'ఇంటి నెం.', labelEn: 'House No' },
  { key: '{{ward_member}}', labelTe: 'వార్డ్ అభ్యర్థి పేరు', labelEn: 'Ward Member Name' },
  { key: '{{ward_symbol}}', labelTe: 'వార్డ్ గుర్తు', labelEn: 'Ward Symbol' },
  { key: '{{ward_serial}}', labelTe: 'వార్డ్ అభ్యర్థి క్రమ సంఖ్య', labelEn: 'Ward Candidate S.No' },
];

export function loadWhatsAppSlipConfig(): WhatsAppSlipConfig {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SLIP_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          template: typeof parsed.template === 'string' && parsed.template.trim()
            ? parsed.template
            : DEFAULT_WHATSAPP_SLIP_TEMPLATE,
          wardCandidates: parsed.wardCandidates && typeof parsed.wardCandidates === 'object'
            ? parsed.wardCandidates
            : {},
        };
      }
    }
  } catch (err) {
    console.error('Failed to load WhatsApp slip config:', err);
  }
  return {
    template: DEFAULT_WHATSAPP_SLIP_TEMPLATE,
    wardCandidates: {},
  };
}

export function saveWhatsAppSlipConfig(config: WhatsAppSlipConfig): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SLIP_CONFIG_STORAGE_KEY, JSON.stringify(config));
    }
  } catch (err) {
    console.error('Failed to save WhatsApp slip config:', err);
  }
}

export function buildWhatsAppSlipMessage(
  voter: MobileVoter,
  boothInfo: BoothInfo,
  overrideConfig?: WhatsAppSlipConfig
): string {
  const config = overrideConfig || loadWhatsAppSlipConfig();
  const rawWard = voter.ward_no ?? (voter as any).w ?? boothInfo.ward_no;
  const wardKey = rawWard !== undefined && rawWard !== null && rawWard !== '' ? String(rawWard) : '';
  const wardCandidate = wardKey ? config.wardCandidates[wardKey] : undefined;

  const pollingStation = resolveWardPollingStation(voter, boothInfo);
  const voterName = voter.n || '-';
  const sno = String(voter.s ?? (voter as any).sno ?? '-');
  const epic = voter.id || '-';
  const wardNoText = wardKey || '-';
  const houseNo = voter.hn || '-';
  const wardMember = wardCandidate?.memberName?.trim() || '—';
  const wardSymbol = wardCandidate?.symbol?.trim() || '—';
  const wardSerial = wardCandidate?.serialNo?.trim() || '—';

  const replacements: Record<string, string> = {
    '{{voter_name}}': voterName,
    '{{sno}}': sno,
    '{{epic}}': epic,
    '{{ward_no}}': wardNoText,
    '{{polling_station}}': pollingStation,
    '{{house_no}}': houseNo,
    '{{ward_member}}': wardMember,
    '{{ward_symbol}}': wardSymbol,
    '{{ward_serial}}': wardSerial,
    '{{card_url}}': '',
  };

  let msg = config.template || DEFAULT_WHATSAPP_SLIP_TEMPLATE;
  for (const [token, value] of Object.entries(replacements)) {
    msg = msg.split(token).join(value);
  }
  return msg.trim();
}

export function openWhatsAppSlip(
  voter: MobileVoter,
  boothInfo: BoothInfo,
  phone?: string
): void {
  const text = buildWhatsAppSlipMessage(voter, boothInfo);
  if (phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone) {
      const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
      window.open(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(text)}`, '_blank');
      return;
    }
  }
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}
