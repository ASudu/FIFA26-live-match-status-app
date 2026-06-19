import os
import json
import logging
import requests
from flask import Flask, jsonify, render_template

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)

FIFA_API_URL = "https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023&idCompetition=17"
CACHE_FILE = "wc_matches.json"

# Country code mapping from 3-letter FIFA code to 2-letter ISO code (for flagcdn)
COUNTRY_MAP = {
    'ALG': 'dz', 'ARG': 'ar', 'AUS': 'au', 'AUT': 'at', 'BEL': 'be',
    'BIH': 'ba', 'BRA': 'br', 'CAN': 'ca', 'CIV': 'ci', 'COD': 'cd',
    'COL': 'co', 'CPV': 'cv', 'CRO': 'hr', 'CUW': 'cw', 'CZE': 'cz',
    'ECU': 'ec', 'EGY': 'eg', 'ENG': 'gb-eng', 'ESP': 'es', 'FRA': 'fr',
    'GER': 'de', 'GHA': 'gh', 'HAI': 'ht', 'IRN': 'ir', 'IRQ': 'iq',
    'JOR': 'jo', 'JPN': 'jp', 'KOR': 'kr', 'KSA': 'sa', 'MAR': 'ma',
    'MEX': 'mx', 'NED': 'nl', 'NOR': 'no', 'NZL': 'nz', 'PAN': 'pa',
    'PAR': 'py', 'POR': 'pt', 'QAT': 'qa', 'RSA': 'za', 'SCO': 'gb-sct',
    'SEN': 'sn', 'SUI': 'ch', 'SWE': 'se', 'TUN': 'tn', 'TUR': 'tr',
    'URU': 'uy', 'USA': 'us', 'UZB': 'uz'
}

def load_cached_matches():
    """Loads matches from the local JSON cache if available."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading local cache: {e}")
    return []

def get_matches_from_fifa():
    """Fetches the latest matches from the official FIFA API."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
    try:
        logger.info(f"Fetching updates from FIFA API: {FIFA_API_URL}")
        response = requests.get(FIFA_API_URL, headers=headers, timeout=12)
        if response.status_code == 200:
            data = response.json()
            results = data.get("Results", [])
            if results:
                # Cache the fresh results locally
                with open(CACHE_FILE, "w", encoding="utf-8") as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)
                logger.info(f"Successfully fetched and cached {len(results)} matches.")
                return results
            else:
                logger.warning("FIFA API returned successful status but empty results.")
        else:
            logger.error(f"FIFA API responded with status code: {response.status_code}")
    except Exception as e:
        logger.error(f"Failed to fetch matches from FIFA API: {e}")
    
    # Fallback to local cache if API fails
    logger.info("Falling back to local cache.")
    return load_cached_matches()

def process_matches(raw_matches):
    """Processes and formats raw match data for the UI."""
    processed = []
    
    # Group names and stage name helpers
    for m in raw_matches:
        match_num = m.get("MatchNumber")
        date_str = m.get("Date", "")
        local_date_str = m.get("LocalDate", "")
        match_time = m.get("MatchTime", "")
        status = m.get("MatchStatus") # 0 = Finished, 3 = Live, 1 = Upcoming
        
        stage = "Group Stage"
        stage_names = m.get("StageName", [])
        if stage_names:
            desc = stage_names[0].get("Description", "")
            if desc:
                stage = desc
        
        group = ""
        group_names = m.get("GroupName", [])
        if group_names:
            desc = group_names[0].get("Description", "")
            if desc:
                group = desc
                
        stadium_info = m.get("Stadium", {})
        stadium_name = "TBD Stadium"
        stadium_names = stadium_info.get("Name", []) if stadium_info else []
        if stadium_names:
            stadium_name = stadium_names[0].get("Description", "TBD Stadium")
            
        city_name = "TBD City"
        city_names = stadium_info.get("CityName", []) if stadium_info else []
        if city_names:
            city_name = city_names[0].get("Description", "TBD City")
            
        referee = "TBD"
        officials = m.get("Officials", [])
        if officials:
            ref = next((o for o in officials if o.get("OfficialType") == 1), None)
            if ref and ref.get("Name"):
                referee = ref["Name"][0].get("Description", "TBD")
        
        # Home & Away details
        home_raw = m.get("Home", {}) or {}
        away_raw = m.get("Away", {}) or {}
        
        home_id = home_raw.get("IdCountry", "")
        away_id = away_raw.get("IdCountry", "")
        
        home_name = "TBD"
        home_names = home_raw.get("TeamName", [])
        if home_names:
            home_name = home_names[0].get("Description", "TBD")
        elif m.get("PlaceHolderA"):
            home_name = m.get("PlaceHolderA")
            
        away_name = "TBD"
        away_names = away_raw.get("TeamName", [])
        if away_names:
            away_name = away_names[0].get("Description", "TBD")
        elif m.get("PlaceHolderB"):
            away_name = m.get("PlaceHolderB")

        # Flagcdn URLs for flags
        home_flag_code = COUNTRY_MAP.get(home_id, "")
        away_flag_code = COUNTRY_MAP.get(away_id, "")
        
        home_flag = f"https://flagcdn.com/w80/{home_flag_code}.png" if home_flag_code else None
        away_flag = f"https://flagcdn.com/w80/{away_flag_code}.png" if away_flag_code else None
        
        # In case it's a specific UK team and we want fallback flag placeholders or similar
        # (Already handled in mapping like gb-eng, gb-sct, etc.)
        
        home_score = home_raw.get("Score")
        away_score = away_raw.get("Score")
        
        # Determine current state display
        status_text = "Upcoming"
        if status == 0:
            status_text = "Finished"
        elif status == 3:
            status_text = "Live"
            
        processed.append({
            "matchNumber": match_num,
            "idMatch": m.get("IdMatch"),
            "date": date_str,
            "localDate": local_date_str,
            "matchTime": match_time,
            "status": status,
            "statusText": status_text,
            "stage": stage,
            "group": group,
            "stadium": stadium_name,
            "city": city_name,
            "referee": referee,
            "home": {
                "id": home_id,
                "name": home_name,
                "flag": home_flag,
                "score": home_score if status in [0, 3] else None
            },
            "away": {
                "id": away_id,
                "name": away_name,
                "flag": away_flag,
                "score": away_score if status in [0, 3] else None
            }
        })
    
    # Sort matches by MatchNumber to preserve chronological calendar order
    processed.sort(key=lambda x: x.get("matchNumber", 999))
    return processed

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/matches")
def api_matches():
    raw_matches = get_matches_from_fifa()
    processed = process_matches(raw_matches)
    
    # Calculate tournament stats
    total_matches = len(processed)
    played = sum(1 for m in processed if m["status"] == 0)
    live = sum(1 for m in processed if m["status"] == 3)
    upcoming = sum(1 for m in processed if m["status"] == 1)
    
    goals = 0
    for m in processed:
        if m["status"] in [0, 3]:
            h_score = m["home"].get("score")
            a_score = m["away"].get("score")
            if h_score is not None:
                goals += int(h_score)
            if a_score is not None:
                goals += int(a_score)
                
    stats = {
        "total": total_matches,
        "played": played,
        "live": live,
        "upcoming": upcoming,
        "goals": goals
    }
    
    return jsonify({
        "matches": processed,
        "stats": stats
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
