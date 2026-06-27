import urllib.request, urllib.parse, ssl, re, json, random, time, os, sys
from lxml import html

AMAP_KEY = os.environ.get("AMAP_KEY") or "5fc1d82d6d5a2138787e6814da0fcc89"
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Connection": "keep-alive",
    "Referer": "https://www.lianjia.com/",
}
MAX_PAGES = 30
LANDLORDS = ["张伟","李强","王芳","刘洋","陈静","杨磊","赵娜","黄明","周杰","吴敏"]
DECORS = ["精装","中装","豪装","简装"]
TAGS_POOL = ["近地铁","精装修","拎包入住","采光好","安静宜居","南北通透","独立厨卫","随时看房"]

CITY_CONFIGS = {
    "shanghai": {"domain": "sh.lianjia.com", "amap_city": "上海", "output": "src/data/mockData.ts", "center": (121.47,31.23),
        "districts": ["浦东","黄浦","静安","徐汇","长宁","普陀","虹口","杨浦","闵行","宝山","嘉定","松江","青浦","奉贤"]},
    "nanjing": {"domain": "nj.lianjia.com", "amap_city": "南京", "output": "src/data/mockDataNanjing.ts", "center": (118.80,32.06),
        "districts": ["鼓楼","玄武","秦淮","建邺","栖霞","雨花","江宁","浦口","六合","溧水","高淳"]},
}

def fetch(url):
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers=BROWSER_HEADERS)
            r = urllib.request.urlopen(req, timeout=20, context=ctx)
            data = r.read()
            if len(data) > 2000:
                return data
        except Exception:
            pass
        time.sleep(3 + attempt * 2)
    return b""

def parse_listings(html_bytes):
    text = html_bytes.decode("utf-8", errors="replace")
    tree = html.fromstring(text)
    items = []
    cards = tree.xpath('//div[contains(@class, "content__list--item")]')
    for card in cards:
        try:
            title_el = card.xpath('.//a[contains(@class,"content__list--item--aside")]/@title')
            title = title_el[0].strip() if title_el else ""
            if not title:
                continue
            desc_p = card.xpath('.//p[contains(@class,"content__list--item--des")]')
            desc = desc_p[0].text_content().strip() if desc_p else ""
            price_el = card.xpath('.//span[contains(@class,"content__list--item-price")]/em')
            rent = int(price_el[0].text.strip()) if price_el else 0
            if rent <= 0:
                continue
            parts = title.replace("\u2022", "\u00b7").split("\u00b7")
            comm = parts[-1] if len(parts) > 1 else ""
            if not comm:
                cm = re.search(r'[\u00b7]([^\u00b7]+?)(?:\d|$)', title)
                if cm:
                    comm = cm.group(1).strip()
            rooms = ""
            re_rooms = re.search(r"(\d+\u5ba4\d+\u5385)", title + desc)
            if re_rooms:
                rooms = re_rooms.group(1)
            area = 0
            re_area = re.search(r"(\d+\.?\d*)\s*(?:m\u00b2|\u33a1|\u5e73\u7c73)", desc)
            if re_area:
                area = int(float(re_area.group(1)))
            direction = ""
            re_dir = re.search(r"([\u5357\u5317\u4e1c\u897f\u4e1c\u5357\u897f\u5357\u4e1c\u5317\u897f\u5317\u5357\u4e1c\u897f])", desc)
            if re_dir:
                direction = re_dir.group(1)
            floor = ""
            re_floor = re.search(r"([\u4f4e\u4e2d\u9ad8]+\u5c42)/\u5171(\d+)\u5c42", desc)
            if re_floor:
                floor = re_floor.group(1) + "/" + re_floor.group(2) + "\u5c42"
            img_els = card.xpath(".//img/@data-src")
            image = img_els[0] if img_els else ""
            items.append({
                "community": comm, "title": title[:40], "rent": rent, "area": area,
                "image": image, "rooms": rooms, "direction": direction, "floor": floor,
                "desc": desc[:100],
            })
        except Exception:
            continue
    return items

def geocode(name, city):
    params = urllib.parse.urlencode({"key": AMAP_KEY, "keywords": name, "types": "\u5c0f\u533a", "city": city, "offset": "1"})
    url = "https://restapi.amap.com/v3/place/text?" + params
    try:
        req = urllib.request.Request(url, headers={"User-Agent": BROWSER_HEADERS["User-Agent"]})
        r = urllib.request.urlopen(req, timeout=5, context=ctx)
        d = json.loads(r.read())
        if d.get("status") == "1" and d.get("count", "0") != "0":
            lng, lat = d["pois"][0]["location"].split(",")
            return (float(lng), float(lat))
    except Exception:
        pass
    return None

def main():
    city_key = sys.argv[1] if len(sys.argv) > 1 else "shanghai"
    if city_key not in CITY_CONFIGS:
        print("Unknown city: {}".format(city_key), file=sys.stderr)
        sys.exit(1)
    cfg = CITY_CONFIGS[city_key]
    amap_city = cfg["amap_city"]
    print("Scraping {} for {}...".format(cfg["domain"], amap_city))
    all_items = []
    for pg in range(1, MAX_PAGES + 1):
        url = "https://{}/zufang/".format(cfg["domain"]) if pg == 1 else "https://{}/zufang/pg{}/".format(cfg["domain"], pg)
        print("  Page {}: {}".format(pg, url))
        data = fetch(url)
        if not data or len(data) < 2000:
            print("  Page {}: fetch failed, stopping".format(pg))
            break
        items = parse_listings(data)
        print("  Page {}: {} listings".format(pg, len(items)))
        if not items:
            break
        all_items.extend(items)
        time.sleep(1.5 + random.random())
    total = len(all_items)
    print("\nTotal: {} listings".format(total))
    if total < 15:
        print("Too few listings ({})".format(total), file=sys.stderr)
        sys.exit(1)
    groups = {}
    for l in all_items:
        n = l["community"]
        if not n:
            continue
        if n not in groups:
            groups[n] = {"listings": []}
        groups[n]["listings"].append(l)
    print("Communities: {}".format(len(groups)))
    print("Geocoding...")
    for i, (n, g) in enumerate(groups.items()):
        coord = geocode(n, amap_city)
        if coord:
            g["lng"], g["lat"] = coord[0], coord[1]
        else:
            cx, cy = cfg["center"]
            g["lng"], g["lat"] = (cx + random.uniform(-0.08, 0.08), cy + random.uniform(-0.04, 0.04))
        if i % 20 == 0:
            print("  {}/{}".format(i, len(groups)))
        time.sleep(0.12)
    cid = 0
    lid = 0
    var_name = "nanjingCommunities" if city_key == "nanjing" else "mockCommunities"
    lines = ['import type { Community } from "../types";', ""]
    lines.append("export const {}: Community[] = [".format(var_name))
    for name, comm in sorted(groups.items(), key=lambda x: -len(x[1]["listings"])):
        cid += 1
        district = "\u5176\u4ed6"
        for d in cfg["districts"]:
            if d in name:
                district = d + "\u533a"
                break
        lat = comm["lat"]
        lng = comm["lng"]
        lines.append('  {{ id: "{}", name: "{}", district: "{}", city: "{}", lat: {}, lng: {}, avgRent: 0, listings: ['.format(
            city_key[0] + str(cid), name, district, city_key, lat, lng))
        for l in comm["listings"]:
            lid += 1
            sn = lid * 7 + 13
            ll = random.choice(LANDLORDS)
            ph = "1" + random.choice(["38","39","50","58","86","88"]) + str(random.randint(10000000,99999999))
            tags = random.sample(TAGS_POOL, random.randint(2, 4))
            dt = "2026-{:02d}-{:02d}".format(random.randint(3,6), random.randint(1,28))
            elev = str(random.random() > 0.4).lower()
            dec = random.choice(DECORS)
            img = l["image"]
            direction = l["direction"] or "\u671d\u5411\u597d"
            floor_desc = l["floor"] or "\u697c\u5c42\u9002\u4e2d"
            rooms = l["rooms"]
            area = l["area"] if l["area"] else 50
            wx = ', landlordWechat: "' + ll + str(lid) + '"' if random.random() > 0.5 else ""
            lines.append('    {{ id: "{}{}", title: "{}", rent: {}, area: {}, rooms: "{}", floor: "{}", direction: "{}", community: "{}",'.format(
                city_key[0], lid, l["title"], l["rent"], area, rooms, floor_desc, direction, name))
            lines.append('      images: ["{}", "img://room/{}", "img://room/{}"],'.format(img, sn+1, sn+2))
            lines.append('      landlordName: "{}", landlordPhone: "{}"{}'.format(ll, ph, wx) + ",")
            lines.append('      description: "\u623f\u6e90\u4f4d\u4e8e{}\uff0c{}\uff0c{}\u3002{}\u6237\u578b\uff0c{}\u5e73\u7c73\u3002\u4ea4\u901a\u4fbf\u5229\uff0c\u751f\u6d3b\u914d\u5957\u9f50\u5168\u3002",'.format(
                name, direction, floor_desc, rooms, area))
            tags_part = ", ".join('"' + t + '"' for t in tags)
            lines.append('      tags: [{}], listedDate: "{}", isElevator: {}, decoration: "{}" }},'.format(tags_part, dt, elev, dec))
        lines.append("  ]},")
    lines.append("];")
    full_path = os.path.join(os.path.dirname(__file__), cfg["output"])
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("\nWritten to {}: {} listings, {} communities".format(full_path, total, len(groups)))

if __name__ == "__main__":
    main()
