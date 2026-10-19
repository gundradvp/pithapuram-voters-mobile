export interface BoothIndexItem {
  part_no: number;
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
}

export interface BoothInfo {
  part_no: number;
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
}

export interface BoothData {
  booth_info: BoothInfo;
  volunteers: BoothVolunteer[];
  voters: MobileVoter[];
}

export interface WinningScoreCalculation {
  totalElectors: number;
  expectedTurnoutPct: number;
  expectedPollVotes: number;
  targetVotesToWin: number;
  projectedJspVotes: number;
  projectedOpponentVotes: number;
  projectedNeutralVotes: number;
  projectedLead: number;
  victoryProbability: number; // 0 to 100%
  status: 'safe_win' | 'likely_win' | 'battleground' | 'deficit_danger';
  neededToGuarantee: number;
}

export type TabType = 'voters' | 'families' | 'influencers' | 'warroom' | 'offline' | 'houses' | 'kriya' | 'stats';

export type CampaignRole = 'candidate' | 'sarpanch' | 'mptc_zptc' | 'ward_member';
