import { MobileVoter, BoothInfo } from '../types';

export interface WardPollingStationDetails {
  name: string;
  latitude?: string | number;
  longitude?: string | number;
  coordinates?: string;
  displayText: string;
}

export const resolveWardPollingStationDetails = (voter: MobileVoter | any, boothInfo?: BoothInfo): WardPollingStationDetails => {
  const w = voter?.ward_no ?? voter?.w ?? boothInfo?.ward_no;
  const villageStr = ((boothInfo?.village || boothInfo?.clean_village || voter?.gram_panchayat_en || voter?.gram_panchayat_te || '') + '').toLowerCase();
  const isDurgada = villageStr.includes('durgada') || villageStr.includes('దుర్గడ') || String(boothInfo?.part_no || '').includes('durgada');

  if (w) {
    const wNum = Number(w);

    // 1. Dynamic Directory from Local Storage (configured by user in Polling Booth Directory modal)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedDir = localStorage.getItem('jsp_polling_booth_directory_v1');
        if (savedDir) {
          const parsed = JSON.parse(savedDir);
          if (Array.isArray(parsed)) {
            const match = parsed.find((b: any) => Array.isArray(b.wards) && b.wards.map(Number).includes(wNum));
            if (match) {
              const eng = match.name;
              const tel = match.name_te;
              const lat = match.latitude;
              const lng = match.longitude;
              const coords = lat && lng ? `${lat}, ${lng}` : undefined;
              const nameStr = eng && tel ? `${eng} (${tel}), దుర్గడ` : `${tel || eng}, దుర్గడ`;
              return {
                name: nameStr,
                latitude: lat,
                longitude: lng,
                coordinates: coords,
                displayText: coords ? `${nameStr} [${coords}]` : nameStr
              };
            }
          }
        }
      }
    } catch (e) {
      console.error('Error resolving booth directory from storage:', e);
    }

    // 2. Exact Directory Mapping from attached Durgada Booth Directory (Wards 1-16) with Coordinates
    if (isDurgada) {
      if (wNum === 1 || wNum === 2) {
        return {
          name: 'Pallapu veedhi (పల్లపు వీధి పోలింగ్ కేంద్రం), దుర్గడ',
          latitude: '17.211792',
          longitude: '82.345596',
          coordinates: '17.211792, 82.345596',
          displayText: 'Pallapu veedhi (పల్లపు వీధి పోలింగ్ కేంద్రం), దుర్గడ [17.211792, 82.345596]'
        };
      }
      if (wNum === 3) {
        return {
          name: 'SC peta Anganwadi (ఎస్సీ పేట అంగన్‌వాడీ కేంద్రం), దుర్గడ',
          latitude: '17.216517',
          longitude: '82.343077',
          coordinates: '17.216517, 82.343077',
          displayText: 'SC peta Anganwadi (ఎస్సీ పేట అంగన్‌వాడీ కేంద్రం), దుర్గడ [17.216517, 82.343077]'
        };
      }
      if (wNum === 4) {
        return {
          name: 'EBC colony (ఈబీసీ కాలనీ పోలింగ్ కేంద్రం), దుర్గడ',
          latitude: '17.212392',
          longitude: '82.341193',
          coordinates: '17.212392, 82.341193',
          displayText: 'EBC colony (ఈబీసీ కాలనీ పోలింగ్ కేంద్రం), దుర్గడ [17.212392, 82.341193]'
        };
      }
      if (wNum >= 5 && wNum <= 7) {
        return {
          name: 'Kothapeta MPP (కొత్తపేట ఎంపీపీ ప్రాథమిక పాఠశాల), దుర్గడ',
          latitude: '17.217058',
          longitude: '82.348113',
          coordinates: '17.217058, 82.348113',
          displayText: 'Kothapeta MPP (కొత్తపేట ఎంపీపీ ప్రాథమిక పాఠశాల), దుర్గడ [17.217058, 82.348113]'
        };
      }
      if (wNum >= 8 && wNum <= 11) {
        return {
          name: 'ZPHS High School (జెడ్పీహెచ్ఎస్ ఉన్నత పాఠశాల), దుర్గడ',
          latitude: '17.214610',
          longitude: '82.335897',
          coordinates: '17.214610, 82.335897',
          displayText: 'ZPHS High School (జెడ్పీహెచ్ఎస్ ఉన్నత పాఠశాల), దుర్గడ [17.214610, 82.335897]'
        };
      }
      if (wNum >= 12 && wNum <= 16) {
        return {
          name: 'SC peta (ఎస్సీ పేట పోలింగ్ కేంద్రం), దుర్గడ',
          latitude: '17.216677',
          longitude: '82.342257',
          coordinates: '17.216677, 82.342257',
          displayText: 'SC peta (ఎస్సీ పేట పోలింగ్ కేంద్రం), దుర్గడ [17.216677, 82.342257]'
        };
      }
    }
  }

  // 3. Fallbacks
  const fallbackName = boothInfo?.ps_address || voter?.polling_station_name || 'స్థానిక పోలింగ్ కేంద్రం';
  const fallbackLat = (boothInfo as any)?.latitude;
  const fallbackLng = (boothInfo as any)?.longitude;
  const fallbackCoords = fallbackLat && fallbackLng ? `${fallbackLat}, ${fallbackLng}` : undefined;

  return {
    name: fallbackName,
    latitude: fallbackLat,
    longitude: fallbackLng,
    coordinates: fallbackCoords,
    displayText: fallbackCoords ? `${fallbackName} [${fallbackCoords}]` : fallbackName
  };
};

export const resolveWardPollingStation = (voter: MobileVoter | any, boothInfo?: BoothInfo): string => {
  const details = resolveWardPollingStationDetails(voter, boothInfo);
  return details.name;
};
