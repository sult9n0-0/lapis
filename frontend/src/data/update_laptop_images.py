import json
import os
import re
import requests
import time

def get_duckduckgo_image_url(query):
    # DuckDuckGo unofficial image search API
    params = {
        'q': query,
        'iax': 'images',
        'ia': 'images',
        'o': 'json'
    }
    headers = {
        'User-Agent': 'Mozilla/5.0'
    }
    # Step 1: Get the vqd token
    try:
        res = requests.get('https://duckduckgo.com/', params={'q': query}, headers=headers, timeout=10)
        vqd_match = re.search(r'vqd=([\d-]+)&', res.text)
        if not vqd_match:
            vqd_match = re.search(r'vqd=([\d-]+)', res.text)
        vqd = vqd_match.group(1) if vqd_match else None
        if not vqd:
            return None
    except Exception:
        return None
    # Step 2: Use the vqd token to get images
    try:
        img_url = f'https://duckduckgo.com/i.js'
        img_params = {'q': query, 'vqd': vqd, 'o': 'json'}
        img_res = requests.get(img_url, params=img_params, headers=headers, timeout=10)
        if img_res.status_code == 200:
            data = img_res.json()
            for result in data.get('results', []):
                url = result.get('image')
                if url and re.search(r'\.(jpg|jpeg|png|webp)$', url, re.IGNORECASE):
                    return url
    except Exception:
        return None
    return None

def update_laptop_images(json_path):
    with open(json_path, encoding='utf-8') as f:
        laptops = json.load(f)
    for i, laptop in enumerate(laptops):
        query = f"{laptop['company']} {laptop['product']} laptop"
        url = get_duckduckgo_image_url(query)
        if url:
            laptop['image'] = url
        # Be polite to DuckDuckGo
        time.sleep(1)
        print(f"{i+1}/{len(laptops)}: {query} -> {url if url else 'No image found'}")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(laptops, f, indent=2, ensure_ascii=False)
    print(f"Updated {len(laptops)} laptop images.")

if __name__ == '__main__':
    json_path = os.path.join(os.path.dirname(__file__), 'laptops.json')
    update_laptop_images(json_path)
