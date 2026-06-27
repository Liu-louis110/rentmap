#!/usr/bin/env python3
"""链家上海租房数据爬虫 - 每日自动更新"""
import urllib.request, urllib.parse, ssl, re, json, random, time, os, sys
from lxml import html

AMAP_KEY = os.environ.get("AMAP_KEY") or "5fc1d82d6d5a2138787e6814da0fcc89"
MAX_PAGES = 30
OUTPUT = "src/data/mockData.ts"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

def fetch(url):
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            r = urllib.request.urlopen(req, timeout=15, context=ctx)
            return r.read()
        except:
            time.sleep(2)
    return b""

def parse_listings(html_bytes):
    tree = html.fromstring(html_bytes)
    items = []
    cards = tree.xpath('//div[contains(@class, "content__list--item")]')
    for card in cards:
        try:
            aside = card.xpath('.//a[contains(@class,"content__list--item--aside")]/@title')
            title = aside[0] if aside else ""
            if not title:
                continue
            desc_p = card.xpath('.//p[contains(@class,"content__list--item--des")]')
            desc = desc_p[0].text_content().strip() if desc_p else ""
            price_em = card.xpath('.//span[contains(@class,"content__list--item-price")]/em')
            rent = int(price_em[0].text.strip()) if price_em else 0
            if rent <= 0:
                continue
            comm = ""
            cm = re.search(r"[·]([^·\d]+?)(?:\d|$)", title)
            if cm:
                comm = cm.group(1).strip()
            if not comm:
                comm = re.search(r"[·]([^·]+)", title)
                comm = comm.group(1).strip() if comm else ""
            rooms = ""
            rm = re.search(r"(\d+室\d+厅)", title + desc)
            if rm:
                rooms = rm.group(1)
            area = 0
            am = re.search(r"(\d+\.?\d*)\s*㎡", desc)
            if am:
                area = int(float(am.group(1)))
            direction = ""
            dm = re.search(r"(南北|东南|西南|东北|西北|南|北|东|西)", desc)
            if dm:
                direction = dm.group(1)
            floor = ""
            fm = re.search(r"([低中高]+层)/共(\d+)层", desc)
            if fm:
                floor = f"{fm.group(1)}/{fm.group(2)}层"
            img_els = card.xpath(".//img/@data-src")
            image = img_els[0] if img_els else ""
            rent_type = "整租" if "整租" in title else "合租"
            items.append({"community": comm, "title": title[:40], "rent": rent, "area": area, "image": image,
                          "rooms": rooms, "direction": direction, "floor": floor,
                          "rent_type": rent_type, "desc": desc[:100]})
        except:
            continue
    return items

def geocode(name):
    params = urllib.parse.urlencode({"key": AMAP_KEY, "keywords": name, "types": "小区", "city": "上海", "offset": "1"})
    url = "https://restapi.amap.com/v3/place/text?" + params
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        r = urllib.request.urlopen(req, timeout=5, context=ctx)
        d = json.loads(r.read())
        if d["status"] == "1" and d["count"] != "0":
            lng, lat = d["pois"][0]["location"].split(",")
            return (float(lng), float(lat))
    except:
        pass
    return None

def generate_ts(communities_dict):
    lines = ['import type { Community } from "../types";', "",
             "export const mockCommunities: Community[] = ["]
    landlords = ["张伟","李强","王芳","刘洋","陈静","杨磊","赵娜","黄明","周杰","吴敏"]
    decors = ["精装","中装","豪装","简装"]
    tags_pool = ["近地铁","精装修","拎包入住","采光好","安静宜居","南北通透","独立厨卫","随时看房"]
    cid = 0; lid = 0
    for name, comm in sorted(communities_dict.items(), key=lambda x: -len(x[1]["listings"])):
        cid += 1
        district = "其他"
        for d in ["浦东","黄浦","静安","徐汇","长宁","普陀","虹口","杨浦","闵行","宝山","嘉定","松江","青浦","奉贤"]:
            if d in name:
                district = d + "区"; break
        if district == "其他":
            for l in comm["listings"]:
                if "杨浦" in l.get("desc","") or "中原" in l.get("desc",""):
                    district = "杨浦区"; break
        lines.append(f'  {{ id: "{cid}", name: "{name}", district: "{district}", lat: {comm["lat"]}, lng: {comm["lng"]}, avgRent: 0, listings: [')
        for l in comm["listings"]:
            lid += 1
            sn = lid * 7 + 13
            ll = random.choice(landlords)
            ph = "1" + random.choice(["38","39","50","58","86","88"]) + str(random.randint(10000000,99999999))
            tags = random.sample(tags_pool, random.randint(2,4))
            tags_s = ", ".join(f'"{t}"' for t in tags)
            dt = f"2026-{random.randint(3,6):02d}-{random.randint(1,28):02d}"
            elev = str(random.random() > 0.4).lower()
            dec = random.choice(decors)
            lines.append(f'    {{ id: "{lid}", title: "{l["title"]}", rent: {l["rent"]}, area: {l["area"]}, rooms: "{l["rooms"]}", floor: "{l["floor"]}", direction: "{l["direction"]}", community: "{name}",')
            lines.append(f'      images: [l["image"], "img://room/{sn+1}", "img://room/{sn+2}"],')
            lines.append(f'      landlordName: "{ll}", landlordPhone: "{ph}",')
            lines.append(f'      description: "房源位于{name}，{l["direction"] or "朝向好"}，{l["floor"] or "楼层适中"}。交通便利，生活配套齐全。{l["rooms"]}户型，{l["area"] if l["area"] else "面积适中"}平米。",')
            lines.append(f'      tags: [{tags_s}], listedDate: "{dt}", isElevator: {elev}, decoration: "{dec}" }},')
        lines.append("  ]},")
    lines.append("];")
    return "\n".join(lines)

def main():
    all_items = []
    for pg in range(1, MAX_PAGES + 1):
        url = f"https://sh.lianjia.com/zufang/" if pg == 1 else f"https://sh.lianjia.com/zufang/pg{pg}/"
        data = fetch(url)
        if not data:
            print(f"Page {pg}: fetch failed"); continue
        items = parse_listings(data)
        print(f"Page {pg}: {len(items)} items")
        if not items:
            break
        all_items.extend(items)
        time.sleep(1.0)
    print(f"\nTotal: {len(all_items)} listings")
    if len(all_items) < 100:
        print("Too few listings", file=sys.stderr); return
    groups = {}
    for l in all_items:
        n = l["community"]
        if not n: continue
        if n not in groups:
            groups[n] = {"listings": []}
        groups[n]["listings"].append(l)
    print(f"Communities: {len(groups)}")
    print("Geocoding...")
    for i, (n, g) in enumerate(groups.items()):
        c = geocode(n)
        if c:
            g["lng"], g["lat"] = c[0], c[1]
        else:
            g["lng"], g["lat"] = 121.47 + random.uniform(-0.1, 0.1), 31.23 + random.uniform(-0.05, 0.05)
        if i % 20 == 0:
            print(f"  {i}/{len(groups)}")
        time.sleep(0.15)
    code = generate_ts(groups)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(code)
    print(f"Written to {OUTPUT}: {len(all_items)} listings, {len(groups)} communities")

if __name__ == "__main__":
    main()




