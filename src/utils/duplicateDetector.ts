import { MobileVoter } from '../types';
import { extractSurname } from './surnameClassifier';

export type DuplicateMatchLevel = 'exact' | 'high' | 'probable';

export interface DuplicateMatchInfo {
  matchLevel: DuplicateMatchLevel;
  confidencePct: number;
  reasonTe: string;
  reasonEn: string;
  matchingVoters: MobileVoter[];
  matchingSnos: number[];
  clusterId: string;
}

export interface DuplicateCluster {
  id: string;
  level: DuplicateMatchLevel;
  confidencePct: number;
  reasonTe: string;
  reasonEn: string;
  voters: MobileVoter[];
  surnameId: string;
}

export interface DuplicateAnalysisResult {
  voterDupMap: Record<number, DuplicateMatchInfo>;
  clusters: DuplicateCluster[];
  totalDuplicateVotersCount: number;
  totalClustersCount: number;
  surnameDupCountMap: Record<string, number>;
}

function cleanStr(s?: string | null): string {
  if (!s) return '';
  return s
    .replace(/\(.*?\)/g, '')
    .replace(/^[rhf]\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanHouseNo(hn?: string | null): string {
  if (!hn) return '';
  const c = hn.replace(/^[h]\s*:\s*/i, '').trim().toLowerCase();
  return (c === '-' || c === '0' || c === '00' || c === '') ? '' : c;
}

function getComparableNames(v: MobileVoter): { en: string; te: string } {
  let en = cleanStr((v as any).name_en);
  let te = cleanStr((v as any).name_te);

  if (!en && v.n) {
    const enMatch = v.n.match(/^([A-Za-z\s]+)/);
    if (enMatch) en = cleanStr(enMatch[1]);
  }
  if (!en && v.n) en = cleanStr(v.n);

  if (!te && v.n) {
    const teMatch = v.n.match(/[\u0C00-\u0C7F\s]+/);
    if (teMatch) te = cleanStr(teMatch[0]);
  }

  return { en, te };
}

function getComparableRelNames(v: MobileVoter): { en: string; te: string } {
  let en = cleanStr((v as any).rel_name_en);
  let te = cleanStr((v as any).rel_name_te);

  if (!en && v.r) {
    const enMatch = v.r.match(/^([A-Za-z\s]+)/);
    if (enMatch) en = cleanStr(enMatch[1]);
  }
  if (!en && v.r) en = cleanStr(v.r);

  if (!te && v.r) {
    const teMatch = v.r.match(/[\u0C00-\u0C7F\s]+/);
    if (teMatch) te = cleanStr(teMatch[0]);
  }

  return { en, te };
}

/**
 * Fast, accurate engine to detect definite & probable duplicate votes across a booth
 * Groups duplicates by EPIC, exact name+relation, and same name+household patterns.
 */
export function analyzeDuplicateVoters(voters: MobileVoter[]): DuplicateAnalysisResult {
  const voterMap = new Map<number, MobileVoter>();
  voters.forEach(v => voterMap.set(v.s, v));

  const epicMap = new Map<string, MobileVoter[]>();
  const nameRelMap = new Map<string, MobileVoter[]>();
  const nameHnMap = new Map<string, MobileVoter[]>();

  for (const v of voters) {
    const ep = (v.id || (v as any).epic || '').trim().toUpperCase();
    if (ep.length >= 6 && ep !== 'ES' && ep !== 'DUMMY' && !ep.startsWith('NO-')) {
      if (!epicMap.has(ep)) epicMap.set(ep, []);
      epicMap.get(ep)!.push(v);
    }

    const { en: nEn, te: nTe } = getComparableNames(v);
    const { en: rEn, te: rTe } = getComparableRelNames(v);
    const g = v.g || '';

    if (nEn && rEn) {
      const key = `${nEn}|${rEn}|${g}`;
      if (!nameRelMap.has(key)) nameRelMap.set(key, []);
      nameRelMap.get(key)!.push(v);
    } else if (nTe && rTe) {
      const key = `${nTe}|${rTe}|${g}`;
      if (!nameRelMap.has(key)) nameRelMap.set(key, []);
      nameRelMap.get(key)!.push(v);
    }

    const hn = cleanHouseNo(v.hn);
    if (nEn && hn) {
      const key = `${nEn}|${hn}|${g}`;
      if (!nameHnMap.has(key)) nameHnMap.set(key, []);
      nameHnMap.get(key)!.push(v);
    } else if (nTe && hn) {
      const key = `${nTe}|${hn}|${g}`;
      if (!nameHnMap.has(key)) nameHnMap.set(key, []);
      nameHnMap.get(key)!.push(v);
    }
  }

  const adj = new Map<number, Set<number>>();
  const edgeMeta = new Map<string, { level: DuplicateMatchLevel; conf: number; reasonTe: string; reasonEn: string }>();

  function addEdge(
    s1: number,
    s2: number,
    level: DuplicateMatchLevel,
    conf: number,
    reasonTe: string,
    reasonEn: string
  ) {
    if (s1 === s2) return;
    if (!adj.has(s1)) adj.set(s1, new Set());
    if (!adj.has(s2)) adj.set(s2, new Set());
    adj.get(s1)!.add(s2);
    adj.get(s2)!.add(s1);

    const k1 = `${s1}-${s2}`;
    const k2 = `${s2}-${s1}`;
    const existing = edgeMeta.get(k1);
    if (!existing || existing.conf < conf) {
      const meta = { level, conf, reasonTe, reasonEn };
      edgeMeta.set(k1, meta);
      edgeMeta.set(k2, meta);
    }
  }

  // 1. Identical EPIC ID
  for (const [ep, list] of epicMap.entries()) {
    if (list.length > 1) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          addEdge(
            list[i].s,
            list[j].s,
            'exact',
            100,
            `ఒకే ఓటర్ EPIC ID (${ep})`,
            `Same EPIC ID (${ep})`
          );
        }
      }
    }
  }

  // 2. Identical Name + Relative Name
  for (const [, list] of nameRelMap.entries()) {
    if (list.length > 1) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const v1 = list[i];
          const v2 = list[j];
          const hn1 = cleanHouseNo(v1.hn);
          const hn2 = cleanHouseNo(v2.hn);
          const a1 = parseInt(v1.a, 10) || 0;
          const a2 = parseInt(v2.a, 10) || 0;
          const ageDiff = Math.abs(a1 - a2);

          const sameHn = hn1 && hn2 && hn1 === hn2;
          if (sameHn || ageDiff <= 3) {
            addEdge(
              v1.s,
              v2.s,
              'exact',
              98,
              sameHn
                ? `ఒకే పేరు, బంధువు పేరు & ఒకే ఇల్లు (${v1.hn || ''})`
                : `ఒకే పేరు & బంధువు పేరు (వయస్సు తేడా: ${ageDiff}y)`,
              sameHn
                ? `Same Name, Relative & House (${v1.hn || ''})`
                : `Same Name & Relative (Age Diff: ${ageDiff}y)`
            );
          } else if (ageDiff <= 6) {
            addEdge(
              v1.s,
              v2.s,
              'high',
              90,
              `ఒకే పేరు & బంధువు పేరు (వేర్వేరు ఇళ్లు / చిరునామా)`,
              `Same Name & Relative (Different House)`
            );
          }
        }
      }
    }
  }

  // 3. Identical Name + Same House Number
  for (const [, list] of nameHnMap.entries()) {
    if (list.length > 1) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const v1 = list[i];
          const v2 = list[j];
          const a1 = parseInt(v1.a, 10) || 0;
          const a2 = parseInt(v2.a, 10) || 0;
          const ageDiff = Math.abs(a1 - a2);

          if (ageDiff <= 2) {
            addEdge(
              v1.s,
              v2.s,
              'probable',
              82,
              `ఒకే పేరు & ఒకే ఇల్లు (${v1.hn || ''})`,
              `Same Name & House (${v1.hn || ''})`
            );
          }
        }
      }
    }
  }

  // Connected components to clusters
  const visited = new Set<number>();
  const clusters: DuplicateCluster[] = [];
  const voterDupMap: Record<number, DuplicateMatchInfo> = {};
  const surnameDupCountMap: Record<string, number> = {};

  for (const sno of adj.keys()) {
    if (visited.has(sno)) continue;

    const comp: number[] = [];
    const queue = [sno];
    visited.add(sno);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      comp.push(curr);
      const neighbors = adj.get(curr);
      if (neighbors) {
        for (const nbr of neighbors) {
          if (!visited.has(nbr)) {
            visited.add(nbr);
            queue.push(nbr);
          }
        }
      }
    }

    if (comp.length > 1) {
      const clusterVoters = comp.map(s => voterMap.get(s)!).filter(Boolean);

      let bestConf = 0;
      let bestLevel: DuplicateMatchLevel = 'probable';
      let bestReasonTe = '';
      let bestReasonEn = '';

      for (let i = 0; i < comp.length; i++) {
        for (let j = i + 1; j < comp.length; j++) {
          const meta = edgeMeta.get(`${comp[i]}-${comp[j]}`);
          if (meta && meta.conf > bestConf) {
            bestConf = meta.conf;
            bestLevel = meta.level;
            bestReasonTe = meta.reasonTe;
            bestReasonEn = meta.reasonEn;
          }
        }
      }

      const clusterId = `dup_cluster_${comp.sort((a, b) => a - b).join('_')}`;
      const firstVoter = clusterVoters[0];
      const snObj = extractSurname(firstVoter);
      const surnameId = snObj.en || 'OTHER';

      const clusterObj: DuplicateCluster = {
        id: clusterId,
        level: bestLevel,
        confidencePct: bestConf,
        reasonTe: bestReasonTe,
        reasonEn: bestReasonEn,
        voters: clusterVoters,
        surnameId
      };
      clusters.push(clusterObj);

      for (const v of clusterVoters) {
        const matchingVoters = clusterVoters.filter(x => x.s !== v.s);
        const matchingSnos = matchingVoters.map(x => x.s);

        voterDupMap[v.s] = {
          matchLevel: bestLevel,
          confidencePct: bestConf,
          reasonTe: bestReasonTe,
          reasonEn: bestReasonEn,
          matchingVoters,
          matchingSnos,
          clusterId
        };

        const vSn = extractSurname(v).en || 'OTHER';
        surnameDupCountMap[vSn] = (surnameDupCountMap[vSn] || 0) + 1;
      }
    }
  }

  // Sort clusters: exact first, then by size
  clusters.sort((a, b) => b.confidencePct - a.confidencePct || b.voters.length - a.voters.length);

  return {
    clusters,
    voterDupMap,
    totalDuplicateVotersCount: Object.keys(voterDupMap).length,
    totalClustersCount: clusters.length,
    surnameDupCountMap
  };
}
