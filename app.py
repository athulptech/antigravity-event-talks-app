import os
import json
import logging
from flask import Flask, render_template, jsonify, request
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CACHE_FILE = os.path.join(os.path.dirname(__file__), 'releases_cache.json')
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_entry_content(content_html):
    if not content_html:
        return []
    
    soup = BeautifulSoup(content_html, 'html.parser')
    updates = []
    
    headings = soup.find_all('h3')
    
    if not headings:
        text_content = soup.get_text().strip()
        text_content = " ".join(text_content.split())
        return [{
            "type": "General",
            "html": str(soup),
            "text": text_content
        }]
    
    for heading in headings:
        update_type = heading.get_text().strip()
        
        sibling_elements = []
        current = heading.next_sibling
        while current and current.name != 'h3':
            if not (isinstance(current, str) and not current.strip()):
                sibling_elements.append(current)
            current = current.next_sibling
            
        update_html_parts = []
        for el in sibling_elements:
            update_html_parts.append(str(el))
            
        update_html = "".join(update_html_parts).strip()
        update_text = BeautifulSoup(update_html, 'html.parser').get_text().strip()
        update_text = " ".join(update_text.split())
        
        updates.append({
            "type": update_type,
            "html": update_html,
            "text": update_text
        })
        
    return updates

def fetch_and_parse_feed():
    logger.info("Fetching BigQuery release notes feed from: %s", FEED_URL)
    response = requests.get(FEED_URL, timeout=10)
    response.raise_for_status()
    
    # Parse XML
    root = ET.fromstring(response.content)
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    parsed_entries = []
    
    for entry in root.findall('atom:entry', namespaces):
        title = entry.find('atom:title', namespaces)
        date_str = title.text.strip() if title is not None else ""
        
        entry_id = entry.find('atom:id', namespaces)
        id_str = entry_id.text.strip() if entry_id is not None else ""
        
        updated = entry.find('atom:updated', namespaces)
        updated_str = updated.text.strip() if updated is not None else ""
        
        # Link extraction
        link = entry.find('atom:link[@rel="alternate"]', namespaces)
        if link is None:
            link = entry.find('atom:link', namespaces)
        link_str = link.attrib.get('href', '').strip() if link is not None else ""
        
        content = entry.find('atom:content', namespaces)
        content_html = content.text if content is not None else ""
        
        # Split single entry into individual updates if there are multiple h3s
        updates = parse_entry_content(content_html)
        
        for idx, upd in enumerate(updates):
            parsed_entries.append({
                "id": f"{id_str}_{idx}",
                "date": date_str,
                "updated_raw": updated_str,
                "link": link_str,
                "type": upd["type"],
                "html": upd["html"],
                "text": upd["text"]
            })
            
    return parsed_entries

def get_releases(force_refresh=False):
    if not force_refresh and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                logger.info("Serving from local cache.")
                return json.load(f), False
        except Exception as e:
            logger.error("Failed to read cache file: %s", e)
            
    try:
        releases = fetch_and_parse_feed()
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(releases, f, ensure_ascii=False, indent=2)
        return releases, True
    except Exception as e:
        logger.error("Failed to fetch and parse feed: %s", e)
        # Fallback to cache if available
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    logger.info("Fallback: serving from local cache due to fetch error.")
                    return json.load(f), False
            except Exception:
                pass
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        releases, was_refreshed = get_releases(force_refresh=refresh)
        return jsonify({
            "success": True,
            "refreshed": was_refreshed,
            "data": releases
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
