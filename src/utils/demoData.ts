import { BoothData, BoothInfo, MobileVoter, VoterCampaignProfile } from '../types';

export const DEMO_BOOTH_INFO: BoothInfo = {
  part_no: 999,
  village: 'పిఠాపురం',
  clean_village: 'పిఠాపురం (డెమో బూత్)',
  mandal: 'పిఠాపురం',
  ps_address: 'ఎం.పి.పి ప్రాథమిక పాఠశాల, డెమో బజార్, పిఠాపురం',
  sections: '14వ వార్డు బొజ్జ వీధి, రావుల వారి వీధి, గౌతు వీధి, కొత్తెం వీధి',
  total_voters: 50,
  male_count: 26,
  female_count: 24,
  exact_kriya_count: 8,
  similar_kriya_count: 2,
  total_kriya_count: 10,
  kriya_percentage: 20,
  election_type: 'municipal',
  ward_no: 14,
  local_body: 'పిఠాపురం పురపాలక సంఘం'
};

export const DEMO_VOTERS: MobileVoter[] = [
  { s: 1, id: 'YOU1001001', n: 'శ్రీరాములు బొజ్జ (SRIRAMULU BOJJA)', r: 'సూర్యారావు (Father)', a: '78', g: 'M', hn: '1-10', sec: '14వ వార్డు - బొజ్జ వీధి', kriya: true, k_type: 'exact', k_m: '9848011221' },
  { s: 2, id: 'YOU1001002', n: 'లక్ష్మి బొజ్జ (LAKSHMI BOJJA)', r: 'శ్రీరాములు (Husband)', a: '72', g: 'F', hn: '1-10', sec: '14వ వార్డు - బొజ్జ వీధి', kriya: false },
  { s: 3, id: 'YOU1001003', n: 'వెంకటేశ్వరరావు బొజ్జ (VENKATESWARARAO BOJJA)', r: 'శ్రీరాములు (Father)', a: '45', g: 'M', hn: '1-10', sec: '14వ వార్డు - బొజ్జ వీధి', kriya: true, k_type: 'exact', k_m: '9440123456' },
  { s: 4, id: 'YOU1001004', n: 'సునీత బొజ్జ (SUNITHA BOJJA)', r: 'వెంకటేశ్వరరావు (Husband)', a: '40', g: 'F', hn: '1-10', sec: '14వ వార్డు - బొజ్జ వీధి', kriya: false },
  { s: 5, id: 'YOU1001005', n: 'పవన్ కుమార్ బొజ్జ (PAWAN KUMAR BOJJA)', r: 'వెంకటేశ్వరరావు (Father)', a: '21', g: 'M', hn: '1-10', sec: '14వ వార్డు - బొజ్జ వీధి', kriya: false },

  { s: 6, id: 'YOU1001006', n: 'సత్యనారాయణ రావుల (SATYANARAYANA RAVULA)', r: 'రామారావు (Father)', a: '58', g: 'M', hn: '2-15', sec: '14వ వార్డు - రావుల వారి వీధి', kriya: true, k_type: 'exact', k_m: '9849098765' },
  { s: 7, id: 'YOU1001007', n: 'పార్వతి రావుల (PARVATHI RAVULA)', r: 'సత్యనారాయణ (Husband)', a: '52', g: 'F', hn: '2-15', sec: '14వ వార్డు - రావుల వారి వీధి', kriya: false },
  { s: 8, id: 'YOU1001008', n: 'రామకృష్ణ రావుల (RAMAKRISHNA RAVULA)', r: 'సత్యనారాయణ (Father)', a: '29', g: 'M', hn: '2-15', sec: '14వ వార్డు - రావుల వారి వీధి', kriya: true, k_type: 'similar_phonetic', k_m: '9989012345' },
  { s: 9, id: 'YOU1001009', n: 'భవాని రావుల (BHAVANI RAVULA)', r: 'రామకృష్ణ (Husband)', a: '26', g: 'F', hn: '2-15', sec: '14వ వార్డు - రావుల వారి వీధి', kriya: false },

  { s: 10, id: 'YOU1001010', n: 'అప్పలరాజు గౌతు (APPALARAJU GOTHU)', r: 'వీరన్న (Father)', a: '62', g: 'M', hn: '3-20', sec: '14వ వార్డు - గౌతు వీధి', kriya: false, k_m: '9490112233' },
  { s: 11, id: 'YOU1001011', n: 'మంగ గౌతు (MANGA GOTHU)', r: 'అప్పలరాజు (Husband)', a: '56', g: 'F', hn: '3-20', sec: '14వ వార్డు - గౌతు వీధి', kriya: false },
  { s: 12, id: 'YOU1001012', n: 'సురేష్ గౌతు (SURESH GOTHU)', r: 'అప్పలరాజు (Father)', a: '33', g: 'M', hn: '3-20', sec: '14వ వార్డు - గౌతు వీధి', kriya: false },
  { s: 13, id: 'YOU1001013', n: 'పద్మ గౌతు (PADMA GOTHU)', r: 'సురేష్ (Husband)', a: '28', g: 'F', hn: '3-20', sec: '14వ వార్డు - గౌతు వీధి', kriya: false },

  { s: 14, id: 'YOU1001014', n: 'వీరభద్రరావు కొత్తెం (VEERABHADRARAO KOTHAM)', r: 'సుబ్బారావు (Father)', a: '81', g: 'M', hn: '4-05', sec: '14వ వార్డు - కొత్తెం వీధి', kriya: false },
  { s: 15, id: 'YOU1001015', n: 'నాగరత్నం కొత్తెం (NAGARATNAM KOTHAM)', r: 'వీరభద్రరావు (Husband)', a: '75', g: 'F', hn: '4-05', sec: '14వ వార్డు - కొత్తెం వీధి', kriya: false },
  { s: 16, id: 'YOU1001016', n: 'శ్రీనివాస్ కొత్తెం (SRINIVAS KOTHAM)', r: 'వీరభద్రరావు (Father)', a: '48', g: 'M', hn: '4-05', sec: '14వ వార్డు - కొత్తెం వీధి', kriya: false, k_m: '9866123456' },
  { s: 17, id: 'YOU1001017', n: 'విజయ కొత్తెం (VIJAYA KOTHAM)', r: 'శ్రీనివాస్ (Husband)', a: '44', g: 'F', hn: '4-05', sec: '14వ వార్డు - కొత్తెం వీధి', kriya: false },

  { s: 18, id: 'YOU1001018', n: 'దుర్గా ప్రసాద్ గుండ్ర (DURGA PRASAD GUNDRA)', r: 'వెంకటరమణ (Father)', a: '35', g: 'M', hn: '5-12', sec: '14వ వార్డు - మెయిన్ రోడ్డు', kriya: true, k_type: 'exact', k_m: '9000273028' },
  { s: 19, id: 'YOU1001019', n: 'మాధవి గుండ్ర (MADHAVI GUNDRA)', r: 'దుర్గా ప్రసాద్ (Husband)', a: '31', g: 'F', hn: '5-12', sec: '14వ వార్డు - మెయిన్ రోడ్డు', kriya: false },
  { s: 20, id: 'YOU1001020', n: 'వెంకటరమణ గుండ్ర (VENKATARAMANA GUNDRA)', r: 'అప్పారావు (Father)', a: '66', g: 'M', hn: '5-12', sec: '14వ వార్డు - మెయిన్ రోడ్డు', kriya: false },

  { s: 21, id: 'YOU1001021', n: 'చంద్రశేఖర్ బండారు (CHANDRASEKHAR BANDARU)', r: 'సోమేశ్వరరావు (Father)', a: '49', g: 'M', hn: '6-18', sec: '14వ వార్డు - బండారు వీధి', kriya: false, k_m: '9848556677' },
  { s: 22, id: 'YOU1001022', n: 'అనురాధ బండారు (ANURADHA BANDARU)', r: 'చంద్రశేఖర్ (Husband)', a: '43', g: 'F', hn: '6-18', sec: '14వ వార్డు - బండారు వీధి', kriya: false },
  { s: 23, id: 'YOU1001023', n: 'సాయి బండారు (SAI BANDARU)', r: 'చంద్రశేఖర్ (Father)', a: '22', g: 'M', hn: '6-18', sec: '14వ వార్డు - బండారు వీధి', kriya: false },

  { s: 24, id: 'YOU1001024', n: 'నాగేశ్వరరావు కాకర్లపల్లి (NAGESWARARAO KAKARLAPALLI)', r: 'రామచంద్రరాజు (Father)', a: '55', g: 'M', hn: '7-22', sec: '14వ వార్డు - కాకర్లపల్లి వారి వీధి', kriya: false },
  { s: 25, id: 'YOU1001025', n: 'సుజాత కాకర్లపల్లి (SUJATHA KAKARLAPALLI)', r: 'నాగేశ్వరరావు (Husband)', a: '50', g: 'F', hn: '7-22', sec: '14వ వార్డు - కాకర్లపల్లి వారి వీధి', kriya: false },
  { s: 26, id: 'YOU1001026', n: 'ప్రదీప్ కాకర్లపల్లి (PRADEEP KAKARLAPALLI)', r: 'నాగేశ్వరరావు (Father)', a: '27', g: 'M', hn: '7-22', sec: '14వ వార్డు - కాకర్లపల్లి వారి వీధి', kriya: false, k_m: '9121334455' },

  { s: 27, id: 'YOU1001027', n: 'మణికంఠ చింతా (MANIKANTA CHINTA)', r: 'గోవిందు (Father)', a: '38', g: 'M', hn: '8-30', sec: '14వ వార్డు - చింతా వారి వీధి', kriya: true, k_type: 'exact', k_m: '9700445566' },
  { s: 28, id: 'YOU1001028', n: 'లలిత చింతా (LALITHA CHINTA)', r: 'మణికంఠ (Husband)', a: '34', g: 'F', hn: '8-30', sec: '14వ వార్డు - చింతా వారి వీధి', kriya: false },
  { s: 29, id: 'YOU1001029', n: 'గోవిందు చింతా (GOVINDU CHINTA)', r: 'ముత్యాలు (Father)', a: '76', g: 'M', hn: '8-30', sec: '14వ వార్డు - చింతా వారి వీధి', kriya: false },

  { s: 30, id: 'YOU1001030', n: 'రాజబాబు కడలి (RAJABABU KADALI)', r: 'తాండవకృష్ణ (Father)', a: '42', g: 'M', hn: '9-01', sec: '14వ వార్డు - కడలి వీధి', kriya: false },
  { s: 31, id: 'YOU1001031', n: 'తులసి కడలి (THULASI KADALI)', r: 'రాజబాబు (Husband)', a: '37', g: 'F', hn: '9-01', sec: '14వ వార్డు - కడలి వీధి', kriya: false },

  { s: 32, id: 'YOU1001032', n: 'వెంకటరమణ పాలిక (VENKATARAMANA PALIKA)', r: 'కృష్ణమూర్తి (Father)', a: '54', g: 'M', hn: '10-04', sec: '14వ వార్డు - పాలిక వీధి', kriya: false },
  { s: 33, id: 'YOU1001033', n: 'లక్ష్మీకాంతం పాలిక (LAKSHMI KANTHAM PALIKA)', r: 'వెంకటరమణ (Husband)', a: '49', g: 'F', hn: '10-04', sec: '14వ వార్డు - పాలిక వీధి', kriya: false },
  { s: 34, id: 'YOU1001034', n: 'కళ్యాణ్ పాలిక (KALYAN PALIKA)', r: 'వెంకటరమణ (Father)', a: '23', g: 'M', hn: '10-04', sec: '14వ వార్డు - పాలిక వీధి', kriya: true, k_type: 'exact', k_m: '9908112233' },

  { s: 35, id: 'YOU1001035', n: 'సుబ్బారావు మేడిశెట్టి (SUBBARAO MEDISETTI)', r: 'అచ్చన్న (Father)', a: '61', g: 'M', hn: '11-14', sec: '14వ వార్డు - మేడిశెట్టి వీధి', kriya: false },
  { s: 36, id: 'YOU1001036', n: 'వరలక్ష్మి మేడిశెట్టి (VARALAKSHMI MEDISETTI)', r: 'సుబ్బారావు (Husband)', a: '55', g: 'F', hn: '11-14', sec: '14వ వార్డు - మేడిశెట్టి వీధి', kriya: false },

  { s: 37, id: 'YOU1001037', n: 'శివశంకర్ నల్లా (SIVA SHANKAR NALLA)', r: 'వెంకన్న (Father)', a: '39', g: 'M', hn: '12-25', sec: '14వ వార్డు - నల్లా వారి వీధి', kriya: false, k_m: '9441889900' },
  { s: 38, id: 'YOU1001038', n: 'రాధిక నల్లా (RADHIKA NALLA)', r: 'శివశంకర్ (Husband)', a: '35', g: 'F', hn: '12-25', sec: '14వ వార్డు - నల్లా వారి వీధి', kriya: false },

  { s: 39, id: 'YOU1001039', n: 'చిట్టిబాబు కాశి (CHITTI BABU KASI)', r: 'గంగయ్య (Father)', a: '51', g: 'M', hn: '13-08', sec: '14వ వార్డు - కాశి వీధి', kriya: false },
  { s: 40, id: 'YOU1001040', n: 'ధనలక్ష్మి కాశి (DHANALAKSHMI KASI)', r: 'చిట్టిబాబు (Husband)', a: '46', g: 'F', hn: '13-08', sec: '14వ వార్డు - కాశి వీధి', kriya: false },

  { s: 41, id: 'YOU1001041', n: 'ప్రసాద్ దాడి (PRASAD DADI)', r: 'నరసింహమూర్తి (Father)', a: '44', g: 'M', hn: '14-19', sec: '14వ వార్డు - దాడి వీధి', kriya: false },
  { s: 42, id: 'YOU1001042', n: 'రమాదేవి దాడి (RAMADEVI DADI)', r: 'ప్రసాద్ (Husband)', a: '40', g: 'F', hn: '14-19', sec: '14వ వార్డు - దాడి వీధి', kriya: false },

  { s: 43, id: 'YOU1001043', n: 'అనిల్ కుమార్ పెంటపాటి (ANIL KUMAR PENTAPATI)', r: 'శ్రీహరి (Father)', a: '28', g: 'M', hn: '15-02', sec: '14వ వార్డు - పెంటపాటి వీధి', kriya: true, k_type: 'exact', k_m: '9652114477' },
  { s: 44, id: 'YOU1001044', n: 'శ్రీహరి పెంటపాటి (SRIHARI PENTAPATI)', r: 'బంగారయ్య (Father)', a: '60', g: 'M', hn: '15-02', sec: '14వ వార్డు - పెంటపాటి వీధి', kriya: false },

  { s: 45, id: 'YOU1001045', n: 'వీర వెంకట సత్యనారాయణ మట్టా (SATYANARAYANA MATTA)', r: 'ధర్మరాజు (Father)', a: '57', g: 'M', hn: '16-11', sec: '14వ వార్డు - మట్టా వీధి', kriya: false },
  { s: 46, id: 'YOU1001046', n: 'ధర్మరాజు మట్టా (DHARMARAJU MATTA)', r: 'అప్పారావు (Father)', a: '84', g: 'M', hn: '16-11', sec: '14వ వార్డు - మట్టా వీధి', kriya: false },

  { s: 47, id: 'YOU1001047', n: 'సూర్యనారాయణ కరణం (SURYANARAYANA KARANAM)', r: 'గోపాలం (Father)', a: '52', g: 'M', hn: '17-09', sec: '14వ వార్డు - కరణం వీధి', kriya: false },
  { s: 48, id: 'YOU1001048', n: 'జ్యోతి కరణం (JYOTHI KARANAM)', r: 'సూర్యనారాయణ (Husband)', a: '47', g: 'F', hn: '17-09', sec: '14వ వార్డు - కరణం వీధి', kriya: false },

  { s: 49, id: 'YOU1001049', n: 'శ్రీను ఆకుల (SRINU AKULA)', r: 'వెంకటేశ్వర్లు (Father)', a: '36', g: 'M', hn: '18-05', sec: '14వ వార్డు - ఆకుల వీధి', kriya: false },
  { s: 50, id: 'YOU1001050', n: 'లావణ్య ఆకుల (LAVANYA AKULA)', r: 'శ్రీను (Husband)', a: '32', g: 'F', hn: '18-05', sec: '14వ వార్డు - ఆకుల వీధి', kriya: false }
];

export const DEMO_PROFILES: Record<number, VoterCampaignProfile> = {
  1: { supportPct: 100, survey_status: 'supporter', notes: 'మన ముఖ్య మద్దతుదారుడు, కుటుంబంలో 5 ఓట్లు ఉన్నాయి' },
  2: { supportPct: 100, survey_status: 'supporter' },
  3: { supportPct: 100, survey_status: 'voted', customPhone: '9440123456', notes: 'ఉదయమే వచ్చి ఓటు వేశారు' },
  4: { supportPct: 100, survey_status: 'supporter' },
  5: { supportPct: 100, survey_status: 'supporter' },

  6: { supportPct: 100, survey_status: 'supporter', notes: 'పార్టీ క్రియాశీల వాలంటీర్' },
  7: { supportPct: 100, survey_status: 'supporter' },
  8: { supportPct: 100, survey_status: 'supporter' },
  9: { supportPct: 75 },

  10: { supportPct: 75, notes: 'సానుకూల ఓటరు' },
  11: { supportPct: 75 },
  12: { supportPct: 50, notes: 'స్వింగ్ ఓటరు, యువత పథకాలపై ఆసక్తి' },
  13: { supportPct: 50 },

  14: { supportPct: 100, survey_status: 'supporter' },
  15: { supportPct: 100, survey_status: 'supporter' },
  16: { supportPct: 100, survey_status: 'voted', customPhone: '9866123456' },
  17: { supportPct: 75 },

  18: { supportPct: 100, survey_status: 'voted', customPhone: '9000273028', notes: 'బూత్ కోఆర్డినేటర్' },
  19: { supportPct: 100, survey_status: 'voted' },
  20: { supportPct: 100, survey_status: 'supporter' },

  21: { supportPct: 40, notes: 'సానుకూల స్వింగ్ ఓటరు' },
  22: { supportPct: 40 },
  23: { supportPct: 75, notes: 'మొదటిసారి ఓటు వేసే యువకుడు' },

  24: { supportPct: 0, notes: 'ప్రత్యర్థి పార్టీ వైపు మొగ్గు' },
  25: { supportPct: 0 },
  26: { supportPct: 50, notes: 'కుటుంబం ప్రత్యర్థి అయినా అబ్బాయి న్యూట్రల్' },

  27: { supportPct: 100, survey_status: 'supporter' },
  28: { supportPct: 100, survey_status: 'supporter' },
  29: { supportPct: 100, survey_status: 'supporter' },

  30: { supportPct: 50, survey_status: 'out_of_city', notes: 'హైదరాబాద్‌లో ఉద్యోగం చేస్తున్నారు' },
  31: { supportPct: 50, survey_status: 'out_of_city' },

  32: { supportPct: 75 },
  33: { supportPct: 75 },
  34: { supportPct: 100, survey_status: 'supporter' },

  46: { supportPct: 100, survey_status: 'deceased', notes: 'గత ఏడాది కాలం చేశారు' }
};

export const DEMO_BOOTH_DATA: BoothData = {
  booth_info: DEMO_BOOTH_INFO,
  volunteers: [],
  voters: DEMO_VOTERS
};
