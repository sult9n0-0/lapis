import json
import os
import re
import requests
import time
from urllib.parse import quote_plus

FALLBACK_IMAGES = {
    "Apple": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    "Dell": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=80",
    "HP": "https://images.unsplash.com/photo-1542393545-10f5cde2c810?auto=format&fit=crop&w=900&q=80",
    "Asus": "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=80",
    "Acer": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
    "Lenovo": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
    "MSI": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=900&q=80",
    "Toshiba": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80",
    "Samsung": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
    "Microsoft": "https://images.unsplash.com/photo-1624571409108-e9f8a0d5f6dd?auto=format&fit=crop&w=900&q=80",
    "Razer": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=900&q=80",
    "Mediacom": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80",
    "Chuwi": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80",
    "Vero": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80",
    "Xiaomi": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
    "Huawei": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
    "Google": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
    "Fujitsu": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=900&q=80",
    "LG": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"
}

def normalize_product(product):
    return re.sub(r"\s+", " ", re.sub(r"\([^)]*\)", "", product)).strip()

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
                if url and re.search(r'\.(jpg|jpeg|png|webp)(\?|$)', url, re.IGNORECASE):
                    return url
    except Exception:
        return None
    return None

def update_laptop_images(json_path):
    with open(json_path, encoding='utf-8') as f:
        laptops = json.load(f)

    image_cache = {}
    unique_models = []
    seen = set()
    for laptop in laptops:
        model_key = f"{laptop['company']} {normalize_product(laptop['product'])}"
        if model_key not in seen:
            seen.add(model_key)
            unique_models.append((model_key, laptop))

    for i, (model_key, laptop) in enumerate(unique_models):
        query = f"{model_key} laptop product image"
        url = get_duckduckgo_image_url(query)
        if not url:
            url = FALLBACK_IMAGES.get(laptop["company"], f"https://source.unsplash.com/900x600/?{quote_plus(model_key + ' laptop')}")
        image_cache[model_key] = url
        time.sleep(0.2)
        print(f"{i+1}/{len(unique_models)}: {query} -> {url}")

    for i, laptop in enumerate(laptops):
        model_key = f"{laptop['company']} {normalize_product(laptop['product'])}"
        laptop['image'] = image_cache[model_key]

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(laptops, f, indent=2, ensure_ascii=False)
    print(f"Updated {len(laptops)} laptop images.")

if __name__ == '__main__':
    json_path = os.path.join(os.path.dirname(__file__), 'laptops.json')
    update_laptop_images(json_path)

