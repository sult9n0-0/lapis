import json
import csv
import os

def infer_usage_profile(laptop):
    type_name = laptop.get('typeName', '').lower()
    cpu_score = laptop.get('cpuScore', 0)
    gpu_score = laptop.get('gpuScore', 0)
    ram = laptop.get('ram', 0)
    storage = laptop.get('storage', 0)
    # Heuristic rules
    if 'gaming' in type_name or gpu_score >= 7000:
        return 'gaming'
    if 'ultrabook' in type_name or (laptop.get('weight') and float(laptop['weight'].replace('kg','').strip()) < 1.3):
        return 'ultrabook'
    if 'convertible' in type_name:
        return 'convertible'
    if 'notebook' in type_name or (ram <= 8 and storage <= 256):
        return 'office'
    return 'general'

def generate_training_csv(json_path, csv_path):
    with open(json_path, encoding='utf-8') as f:
        laptops = json.load(f)
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['company','cpuScore','gpuScore','ram','storage','inches','typeName','usageProfile','price'])
        for laptop in laptops:
            company = laptop.get('company', '')
            cpu_score = laptop.get('cpuScore', 0)
            gpu_score = laptop.get('gpuScore', 0)
            ram = laptop.get('ram', 0)
            storage = laptop.get('storage', 0)
            inches = laptop.get('inches', 0)
            type_name = laptop.get('typeName', '')
            usage_profile = infer_usage_profile(laptop)
            price = laptop.get('price', 0)
            writer.writerow([company, cpu_score, gpu_score, ram, storage, inches, type_name, usage_profile, price])
    print(f"CSV dataset written to {csv_path}")

if __name__ == '__main__':
    base = os.path.dirname(__file__)
    json_path = os.path.join(base, 'laptops.json')
    csv_path = os.path.join(base, 'laptop_train.csv')
    generate_training_csv(json_path, csv_path)
