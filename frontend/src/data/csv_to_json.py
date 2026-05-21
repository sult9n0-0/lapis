import csv
import json
import re
import os
import requests

# --- CPU and GPU score mappings (example, extend as needed) ---
CPU_SCORE_MAP = {
    'i3': 2000,
    'i5': 4000,
    'i7': 6000,
    'i9': 8000,
    'Ryzen 3': 2500,
    'Ryzen 5': 4500,
    'Ryzen 7': 6500,
    'Ryzen 9': 8500,
}
GPU_SCORE_MAP = {
    'Intel HD': 1000,
    'Intel Iris': 2000,
    'Nvidia GTX': 5000,
    'Nvidia RTX': 8000,
    'AMD Radeon': 4000,
}

# --- Helper functions ---
def parse_ram(ram_str):
    match = re.search(r'(\d+)', ram_str)
    return int(match.group(1)) if match else 0

def parse_storage(storage_str):
    storage = 0
    if 'TB' in storage_str:
        match = re.search(r'(\d+)', storage_str)
        if match:
            storage += int(match.group(1)) * 1024
    if 'GB' in storage_str:
        match = re.search(r'(\d+)', storage_str)
        if match:
            storage += int(match.group(1))
    return storage

def get_cpu_score(cpu_str):
    for key, score in CPU_SCORE_MAP.items():
        if key.lower() in cpu_str.lower():
            return score
    return 3000  # default

def get_gpu_score(gpu_str):
    for key, score in GPU_SCORE_MAP.items():
        if key.lower() in gpu_str.lower():
            return score
    return 2000  # default

def fetch_image_url(query):
    # Always return a placeholder image (no network request)
    return 'https://via.placeholder.com/300x200?text=Laptop'

# --- Main processing ---
laptops = []

input_csv = os.path.join(os.path.dirname(__file__), 'laptop_price.csv')
output_json = os.path.join(os.path.dirname(__file__), 'laptops.json')

laptops = []
with open(input_csv, encoding='latin1') as f:
    reader = csv.DictReader(f)
    for idx, row in enumerate(reader):
        ram = parse_ram(row.get('Ram', '0'))
        storage = parse_storage(row.get('Memory', '0'))
        cpu = row.get('Cpu', '')
        gpu = row.get('Gpu', '')
        laptop = {
            'id': int(row.get('laptop_ID', idx + 1)),
            'company': row.get('Company', ''),
            'product': row.get('Product', ''),
            'typeName': row.get('TypeName', ''),
            'inches': float(row.get('Inches', 0)),
            'cpu': cpu,
            'cpuScore': get_cpu_score(cpu),
            'gpu': gpu,
            'gpuScore': get_gpu_score(gpu),
            'ram': ram,
            'storage': storage,
            'price': float(row.get('Price_euros', 0)),
            'os': row.get('OpSys', ''),
            'weight': row.get('Weight', ''),
            'image': fetch_image_url(f"{row.get('Company', '')} {row.get('Product', '')}")
        }
        laptops.append(laptop)

with open(output_json, 'w', encoding='utf-8') as f:
    json.dump(laptops, f, indent=2, ensure_ascii=False)

print(f"Converted {len(laptops)} laptops to laptops.json")



