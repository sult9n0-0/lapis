import json
import os

def list_brands(json_path):
    with open(json_path, encoding='utf-8') as f:
        laptops = json.load(f)
    brands = set()
    for laptop in laptops:
        brands.add(laptop['company'])
    print("Brands in laptops.json:")
    for brand in sorted(brands):
        print(brand)

if __name__ == '__main__':
    json_path = os.path.join(os.path.dirname(__file__), 'laptops.json')
    list_brands(json_path)

