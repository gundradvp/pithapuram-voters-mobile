#!/usr/bin/env python3
"""
Targeted Re-OCR Engine for Selected Durgada Voter Cards
Usage:
  python3 reocr_cards.py --snos 15,7280
  python3 reocr_cards.py --file public/reocr_queue.json
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path
import cv2
import pytesseract

APP_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = APP_DIR / "public"
BOOTHS_DIR = PUBLIC_DIR / "booths"
CARDS_DIR = PUBLIC_DIR / "cards" / "durgada"
MASTER_DB_PATH = Path("/Users/durgajo/ptpvoter.json")

def telugu_to_english(tel):
    if not tel: return ''
    tel = tel.strip()
    vowels = {
        0x0c05: 'A', 0x0c06: 'Aa', 0x0c07: 'I', 0x0c08: 'Ee', 0x0c09: 'U', 0x0c0a: 'Oo',
        0x0c0b: 'Ru', 0x0c0e: 'E', 0x0c0f: 'E', 0x0c10: 'Ai', 0x0c12: 'O', 0x0c13: 'O', 0x0c14: 'Au'
    }
    matras = {
        0x0c3e: 'a', 0x0c3f: 'i', 0x0c40: 'i', 0x0c41: 'u', 0x0c42: 'u', 0x0c43: 'ru',
        0x0c46: 'e', 0x0c47: 'e', 0x0c48: 'ai', 0x0c4a: 'o', 0x0c4b: 'o', 0x0c4c: 'au'
    }
    consonants = {
        0x0c15: 'k', 0x0c16: 'kh', 0x0c17: 'g', 0x0c18: 'gh', 0x0c19: 'ng',
        0x0c1a: 'ch', 0x0c1b: 'chh', 0x0c1c: 'j', 0x0c1d: 'jh', 0x0c1e: 'ny',
        0x0c1f: 't', 0x0c20: 'th', 0x0c21: 'd', 0x0c22: 'dh', 0x0c23: 'n',
        0x0c24: 't', 0x0c25: 'th', 0x0c26: 'd', 0x0c27: 'dh', 0x0c28: 'n',
        0x0c2a: 'p', 0x0c2b: 'ph', 0x0c2c: 'b', 0x0c2d: 'bh', 0x0c2e: 'm',
        0x0c2f: 'y', 0x0c30: 'r', 0x0c31: 'r', 0x0c32: 'l', 0x0c33: 'l',
        0x0c35: 'v', 0x0c36: 's', 0x0c37: 'sh', 0x0c38: 's', 0x0c39: 'h'
    }
    VIRAMA = 0x0c4d
    ANUSVARA = 0x0c02
    
    words = tel.split()
    res_words = []
    for word in words:
        out = []
        i = 0
        n = len(word)
        while i < n:
            cp = ord(word[i])
            if cp in vowels:
                out.append(vowels[cp])
            elif cp in consonants:
                cons = consonants[cp]
                if i + 1 < n:
                    next_cp = ord(word[i+1])
                    if next_cp == VIRAMA:
                        out.append(cons)
                        i += 1
                    elif next_cp in matras:
                        out.append(cons + matras[next_cp])
                        i += 1
                    elif next_cp == ANUSVARA:
                        out.append(cons + 'am')
                        i += 1
                    else:
                        out.append(cons + 'a')
                else:
                    out.append(cons + 'a')
            elif cp == ANUSVARA:
                out.append('m')
            elif word[i].isalnum():
                out.append(word[i])
            i += 1
        res_words.append(''.join(out).capitalize())
    return ' '.join(res_words)

def clean_ocr_text(t):
    if not t: return ''
    return re.sub(r'^[^\u0C00-\u0C7F]+', '', t).strip()

def run_targeted_reocr(snos, booth_id="gp_durgada"):
    gp_path = BOOTHS_DIR / f"{booth_id}.json"
    if not gp_path.exists():
        gp_path = BOOTHS_DIR / "gp_durgada.json"
        
    with open(gp_path, "r", encoding="utf-8") as f:
        booth_data = json.load(f)
        
    voters = booth_data.get("voters", [])
    by_sno = {int(v.get("sno") or v.get("s")): v for v in voters if (v.get("sno") or v.get("s"))}
    
    # Load Master DB if available
    master_by_epic = {}
    durgada_by_door = {}
    if MASTER_DB_PATH.exists():
        try:
            with open(MASTER_DB_PATH, "r", encoding="utf-8") as f:
                raw_master = json.load(f)
            records = raw_master.get("serviceResult", {}).get("results", [])
            for r in records:
                vid = (r.get("voter_id") or "").strip().upper()
                if vid:
                    master_by_epic[vid] = r
                p_no = str(r.get("polling_station_no") or "").strip()
                if p_no in ["10", "11", "12", "13", "14", "15", "16"]:
                    d_no = (r.get("door_no") or "").strip().lower()
                    if d_no:
                        durgada_by_door.setdefault(d_no, []).append(r)
        except Exception as e:
            sys.stderr.write(f"Warning: Could not load master DB: {e}\n")

    updated_voters = []

    for sno in snos:
        v = by_sno.get(sno)
        if not v:
            continue
            
        card_rel = (v.get("card") or v.get("card_url") or "").lstrip("/")
        card_path = PUBLIC_DIR / card_rel
        if not card_path.exists():
            continue
            
        img = cv2.imread(str(card_path))
        if img is None:
            continue
            
        h, w, _ = img.shape
        
        # 1. OCR bottom area for EPIC with multi-pass preprocessing
        bottom = img[int(h * 0.70):h, 0:int(w * 0.88)]
        gray_b = cv2.cvtColor(bottom, cv2.COLOR_BGR2GRAY)
        res_b = cv2.resize(gray_b, (0, 0), fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        
        # Pass 1: English PSM 6
        txt_b1 = pytesseract.image_to_string(res_b, config="--psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:- ")
        # Pass 2: English+Telugu raw
        txt_b2 = pytesseract.image_to_string(res_b, lang="eng+tel")
        # Pass 3: Grayscale Otsu thresholding
        _, thresh = cv2.threshold(gray_b, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        res_thresh = cv2.resize(thresh, (0, 0), fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        txt_b3 = pytesseract.image_to_string(res_thresh, config="--psm 6")
        
        comb_b = f"{txt_b1} {txt_b2} {txt_b3}".upper()
        comb_b = comb_b.replace("౪00", "YOU").replace("౪0౮", "YOU").replace("౪0", "YOU").replace("Y0U", "YOU")
        comb_b = comb_b.replace("801", "BCK").replace("861", "BCK").replace("8CK", "BCK").replace("380", "BCK")
        
        candidates = set()
        for m in re.finditer(r"([A-Z0-9]{3})[:\s\.\-]*([A-Z0-9]{6,8})", comb_b):
            pfx = m.group(1)
            digs = m.group(2)
            if pfx in ["YOU", "YDU", "YQU", "VOU"]: pfx = "YOU"
            elif pfx in ["BCK", "8CK", "RCK", "SCK", "BGK", "BGJ", "861", "801"]: pfx = "BCK"
            char_map = {"I": "1", "L": "1", "O": "0", "D": "0", "S": "5", "G": "6", "B": "8", "Z": "2", "A": "4", "T": "7"}
            norm_digs = "".join(char_map.get(c, c) for c in digs)
            if len(norm_digs) == 7 and norm_digs.isdigit():
                candidates.add(f"{pfx}{norm_digs}")
                
        # 2. OCR body area for Telugu Name, Rel Name, Door No, Age, Gender
        body = img[int(h * 0.16):int(h * 0.75), 0:int(w * 0.80)]
        body_txt = pytesseract.image_to_string(body, lang="tel")
        
        name_te = ""
        rel_te = ""
        rel_type_te = "తండ్రి"
        rel_type_en = "Father"
        door_no = ""
        age = 0
        gender_en = "Male"
        gender_te = "పురుషుడు"
        
        for l in body_txt.split("\n"):
            l = l.strip()
            if "ఓటరు" in l and "పేరు" in l and not name_te:
                parts = re.split(r"[:\.\-]\s*", l, maxsplit=1)
                if len(parts) > 1: name_te = clean_ocr_text(parts[1])
            elif "భర్త" in l and not rel_te:
                rel_type_te = "భర్త"
                rel_type_en = "Husband"
                parts = re.split(r"[:\.\-]\s*", l, maxsplit=1)
                if len(parts) > 1: rel_te = clean_ocr_text(parts[1])
            elif "తండ్రి" in l and not rel_te:
                rel_type_te = "తండ్రి"
                rel_type_en = "Father"
                parts = re.split(r"[:\.\-]\s*", l, maxsplit=1)
                if len(parts) > 1: rel_te = clean_ocr_text(parts[1])
            elif "ఇంటి" in l and not door_no:
                m_d = re.search(r"[:\.\-]\s*([0-9\-\/A-Za-z]+)", l)
                if m_d: door_no = m_d.group(1).strip()
            elif "వయస్సు" in l and not age:
                m_a = re.search(r"(\d+)", l)
                if m_a: age = int(m_a.group(1))
                if "స్త్రీ" in l or "స్రీ" in l:
                    gender_en = "Female"
                    gender_te = "మహిళ"
                    
        # 3. Match candidate against Master DB
        matched_rec = None
        chosen_epic = None
        for c in candidates:
            if c in master_by_epic:
                matched_rec = master_by_epic[c]
                chosen_epic = c
                break
                
        if candidates and not chosen_epic:
            chosen_epic = list(candidates)[0]
            
        if not chosen_epic:
            chosen_epic = v.get("epic") or f"YOU8{sno:06d}"
            
        if matched_rec:
            name_en = matched_rec.get("name") or telugu_to_english(name_te or v.get("name_te"))
            rel_name_en = matched_rec.get("relative_name") or telugu_to_english(rel_te or v.get("rel_name_te"))
            rel_type_en = matched_rec.get("relation_type") or rel_type_en
            rel_type_te = "భర్త" if rel_type_en == "Husband" else "తండ్రి"
            door_no = matched_rec.get("door_no") or door_no or v.get("door_no")
            age = int(matched_rec.get("age") or age or v.get("age") or 0)
            gender_en = matched_rec.get("gender") or gender_en
            gender_te = "మహిళ" if gender_en == "Female" else "పురుషుడు"
        else:
            name_en = telugu_to_english(name_te or v.get("name_te"))
            rel_name_en = telugu_to_english(rel_te or v.get("rel_name_te"))
            door_no = door_no or v.get("door_no")
            age = age or int(v.get("age") or 0)
            
        final_name_te = name_te or v.get("name_te") or name_en
        final_rel_te = rel_te or v.get("rel_name_te") or rel_name_en
        
        # Apply to voter
        v["epic"] = chosen_epic
        v["id"] = chosen_epic
        v["name_te"] = final_name_te
        v["name_en"] = name_en
        v["rel_name_te"] = final_rel_te
        v["rel_name_en"] = rel_name_en
        v["rel_type_en"] = rel_type_en
        v["rel_type_te"] = rel_type_te
        v["n"] = f"{name_en} ({final_name_te})" if name_en and final_name_te else (name_en or final_name_te)
        v["r"] = f"{rel_name_en} ({final_rel_te}) ({rel_type_en})" if rel_name_en and final_rel_te else f"{final_rel_te} ({rel_type_te})"
        if door_no:
            v["door_no"] = door_no
            v["house_no"] = door_no
            v["hn"] = door_no
        if age:
            v["age"] = age
            v["a"] = str(age)
        v["gender_en"] = gender_en
        v["gender_te"] = gender_te
        v["g"] = "F" if gender_en == "Female" else "M"
        
        updated_voters.append(v)

    # Save to disk
    with open(gp_path, "w", encoding="utf-8") as f:
        json.dump(booth_data, f, ensure_ascii=False, indent=2)
        
    booth_gp = BOOTHS_DIR / f"booth_{booth_id}.json"
    if booth_gp.exists():
        with open(booth_gp, "w", encoding="utf-8") as f:
            json.dump(booth_data, f, ensure_ascii=False, indent=2)
            
    # Also sync ward files
    try:
        from scratch.sync_durgada_files import sync_files
    except:
        pass
        
    return updated_voters

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Targeted Re-OCR for Voter Cards")
    parser.add_argument("--snos", help="Comma-separated S.Nos (e.g. 15,7280)")
    parser.add_argument("--file", help="Path to JSON file containing S.Nos array")
    parser.add_argument("--booth", default="gp_durgada", help="Booth ID")
    args = parser.parse_args()
    
    snos_to_process = []
    if args.snos:
        snos_to_process = [int(s.strip()) for s in args.snos.split(",") if s.strip().isdigit()]
    elif args.file:
        fpath = Path(args.file)
        if fpath.exists():
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    snos_to_process = [int(x) for x in data if str(x).isdigit()]
                elif isinstance(data, dict) and "snos" in data:
                    snos_to_process = [int(x) for x in data["snos"] if str(x).isdigit()]
                    
    if not snos_to_process:
        print(json.dumps({"error": "No valid S.Nos provided", "updated": []}))
        sys.exit(1)
        
    updated = run_targeted_reocr(snos_to_process, args.booth)
    print(json.dumps({"success": True, "count": len(updated), "snos": [v["s"] for v in updated]}))
