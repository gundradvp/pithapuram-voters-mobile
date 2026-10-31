export type ElectionCategory = 'assembly' | 'municipal' | 'panchayat' | 'mptc' | 'zptc';

export interface LocalElectionUnit {
  id: string; // e.g. "ward_14", "gp_chendurthi_w1"
  part_no: string | number;
  ward_no?: number;
  election_type: ElectionCategory;
  category_label: string;
  local_body: string;
  mandal?: string;
  village: string;
  clean_village: string;
  ps_address: string;
  sections?: string;
  total_voters: number;
  male_count?: number;
  female_count?: number;
  exact_kriya_count?: number;
  similar_kriya_count?: number;
  total_kriya_count?: number;
  kriya_percentage?: number;
  volunteers_count?: number;
  is_loaded: boolean;
}

export interface BoothIndexItem {
  part_no: number | string;
  village: string;
  clean_village: string;
  mandal: string;
  ps_address: string;
  total_voters: number;
  exact_kriya_count: number;
  similar_kriya_count: number;
  total_kriya_count: number;
  kriya_percentage: number;
  volunteers_count: number;
  election_type?: ElectionCategory;
  ward_no?: number;
  local_body?: string;
  is_loaded?: boolean;
}

export interface BoothInfo {
  part_no: number | string;
  village: string;
  clean_village: string;
  mandal: string;
  ps_address: string;
  sections: string;
  total_voters: number;
  male_count: number;
  female_count: number;
  exact_kriya_count: number;
  similar_kriya_count: number;
  total_kriya_count: number;
  kriya_percentage: number;
  election_type?: ElectionCategory;
  ward_no?: number;
  local_body?: string;
  is_loaded?: boolean;
}

export interface BoothVolunteer {
  name: string;
  mobile: string;
  count: number;
}

export type VoterSurveyStatus = 'voted' | 'supporter' | 'doubtful' | 'opponent' | 'shifted' | 'visited';

export type SupportCategory = 'full_support' | 'strong_lean' | 'soft_lean' | 'neutral_swing' | 'doubtful' | 'opponent';

export interface Influencer {
  id: string;
  name: string;
  mobile: string;
  role: string;
  village?: string;
  notes?: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  houseNumbers: string[];
  headName?: string;
  influencerId?: string;
  influencerName?: string;
  influencerMobile?: string;
  supportPct: number; // 100, 75, 50, 40, 25, 0
  supportCategory: SupportCategory;
  memberSnos: number[];
  campaignNotes?: string;
}

export interface VoterVisit {
  id: string;
  date: string; // formatted e.g. "20 Apr, 10:30 AM"
  visitorName: string; // e.g. "Ward Member", "Karyakartha", "Sarpanch"
  sentimentAfter: number; // 100, 75, 50, 40, 25, 0
  notes: string;
  keyIssue?: string; // "Pension", "Road", "Drinking Water", "Youth Job", "DWCRA"
}

export type MoneyInfluenceStatus = 
  | 'none'
  | 'opponent_paid_safe'    // 💰 ప్రత్యర్థి డబ్బు ఇచ్చారు - కానీ మనకే ఓటు (Took Cash, Votes JSP)
  | 'opponent_paid_swung'   // 💸 డబ్బుతో చేజారిన ఓటు (Bought by Opponent - Swung)
  | 'at_risk_cash'          // ⚠️ డబ్బు ప్రభావం పడే ప్రమాదం ఉంది (Vulnerable to Cash)
  | 'counter_secured';      // 🛡️ మన బృందం కౌంటర్ చేసి భరోసా ఇచ్చింది (Countered & Secured)

export interface VoterCampaignProfile {
  customPhone?: string;
  altPhone?: string;
  supportPct?: number; // 100, 75, 50, 40, 25, 0
  influencerId?: string;
  influencerName?: string;
  influencerMobile?: string;
  familyId?: string;
  notes?: string;
  survey_status?: VoterSurveyStatus | null;
  visits?: VoterVisit[];
  moneyStatus?: MoneyInfluenceStatus;
  moneyNotes?: string;
}

export interface MobileVoter {
  s: number;
  id: string;
  n: string;
  r: string;
  hn: string;
  a: string;
  g: string;
  sec: string;
  kriya: boolean;
  k_type?: 'exact' | 'similar_phonetic' | 'similar_name' | 'similar_household';
  k_conf?: number;
  k_label?: string;
  k_id?: number | string;
  k_m?: string;
  v_name?: string;
  v_mob?: string;
  k_photo?: string;
  photo?: string;
  photo_url?: string;
  card?: string;
  card_url?: string;
  ward_no?: number;
  ac_part?: number;
  ac_sno?: number;
}

export interface BoothData {
  booth_info: BoothInfo;
  volunteers: BoothVolunteer[];
  voters: MobileVoter[];
}

export interface WinningScoreCalculation {
  mode: 'entry' | 'auto'; // 'entry': Pure candidate ground entry | 'auto': Statistical simulation
  totalElectors: number;
  expectedTurnoutPct: number;
  expectedPollVotes: number;
  targetVotesToWin: number;
  projectedJspVotes: number;
  projectedOpponentVotes: number;
  projectedNeutralVotes: number;
  unsurveyedVotes?: number;
  surveyedCount?: number;
  projectedLead: number;
  victoryProbability: number; // 0 to 100%
  status: 'safe_win' | 'likely_win' | 'battleground' | 'deficit_danger';
  neededToGuarantee: number;
  // Money Influence Metrics
  cashOpponentPaidSafeCount?: number;
  cashOpponentPaidSwungCount?: number;
  cashAtRiskCount?: number;
  cashSecuredCount?: number;
}

export type TabType = 'voters' | 'families' | 'influencers' | 'warroom' | 'offline' | 'houses' | 'kriya' | 'stats';

export type CampaignRole = 'candidate' | 'sarpanch' | 'mptc_zptc' | 'ward_member';
