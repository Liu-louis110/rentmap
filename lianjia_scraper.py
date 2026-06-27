# Enhanced lianjia scraper - supports both Shanghai (sh) and Nanjing (nj)
import urllib.request, urllib.parse, ssl, re, json, random, time, os, sys
from lxml import html

AMAP_KEY = os.environ.get('AMAP_KEY') or '5fc1d82d6d5a2138787e6814da0fcc89'

CITY_CONFIGS = {
    'shanghai': {
        'domain': 'sh.lianjia.com',
        'amap_city': '\u4e0a\u6d77',
        'districts': ['\u6d66\u4e1c','\u9ec4\u6d66','\u9759\u5b89','\u5f90\u6c47','\u957f\u5b81','\u666e\u9640','\u8679\u53e3','\u6768\u6d66','\u95f5\u884c','\u5b9d\u5c71','\u5609\u5b9a','\u677e\u6c5f','\u9752\u6d66','\u5949\u8d24'],
        'output': 'src/data/mockData.ts',
        'default_center': '121.47,31.23',
    },
    'nanjing': {
        'domain': 'nj.lianjia.com',
        'amap_city': '\u5357\u4eac',
        'districts': ['\u9f13\u697c','\u7384\u6b66','\u79e6\u6dee','\u5efa\u90ba','\u6816\u971e','\u96e8\u82b1','\u6c5f\u5b81','\u6d66\u53e3','\u516d\u5408','\u6ea7\u6c34','\u9ad8\u6df3'],
        'output': 'src/data/mockDataNanjing.ts',
        'default_center': '118.80,32.06',
    },
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
MAX_PAGES = 30

def fetch(url):
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            r = urllib.request.urlopen(req, timeout=15, context=ctx)
            return r.read()
        except:
            time.sleep(2)
    return b''

def parse_listings(html_bytes):
    tree = html.fromstring(html_bytes)
    items = []
    cards = tree.xpath('//div[contains(@class, \"content__list--item\")]')
    for card in cards:
        try:
            aside = card.xpath('.//a[contains(@class,\"content__list--item--aside\")]/@title')
            title = aside[0] if aside else ''
            if not title:
                continue
            desc_p = card.xpath('.//p[contains(@class,\"content__list--item--des\")]')
            desc = desc_p[0].text_content().strip() if desc_p else ''
            price_em = card.xpath('.//span[contains(@class,\"content__list--item-price\")]/em')
            rent = int(price_em[0].text.strip()) if price_em else 0
            if rent <= 0:
                continue
            comm = ''
            cm = re.search(r'[\u00b7]([^\u00b7\\d]+?)(?:\\d|$)', title)
            if cm:
                comm = cm.group(1).strip()
            if not comm:
                comm = re.search(r'[\u00b7]([^\u00b7]+)', title)
                comm = comm.group(1).strip() if comm else ''
            rooms = ''
            rm = re.search(r'(\\d+\u5ba4\\d+\u5385)', title + desc)
            if rm:
                rooms = rm.group(1)
            area = 0
            am = re.search(r'(\\d+\\.?\\d*)\\s*\u33a1', desc)
            if am:
                area = int(float(am.group(1)))
            direction = ''
            dm = re.search(r'(\u5357\u5317|\u4e1c\u5357|\u897f\u5357|\u4e1c\u5317|\u897f\u5317|\u5357|\u5317|\u4e1c|\u897f)', desc)
            if dm:
                direction = dm.group(1)
            floor = ''
            fm = re.search(r'([\u4f4e\u4e2d\u9ad8]+\u5c42)/\u5171(\\d+)\u5c42', desc)
            if fm:
                floor = f'{fm.group(1)}/{fm.group(2)}\u5c42'
            img_els = card.xpath('.//img/@data-src')
            image = img_els[0] if img_els else ''
            rent_type = '\u6574\u79df' if '\u6574\u79df' in title else '\u5408\u79df'
            items.append({'community': comm, 'title': title[:40], 'rent': rent, 'area': area, 'image': image,
                          'rooms': rooms, 'direction': direction, 'floor': floor,
                          'rent_type': rent_type, 'desc': desc[:100]})
        except:
            continue
    return items

def geocode(name, amap_city):
    params = urllib.parse.urlencode({'key': AMAP_KEY, 'keywords': name, 'types': '\u5c0f\u533a', 'city': amap_city, 'offset': '1'})
    url = 'https://restapi.amap.com/v3/place/text?' + params
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        r = urllib.request.urlopen(req, timeout=5, context=ctx)
        d = json.loads(r.read())
        if d['status'] == '1' and d['count'] != '0':
            lng, lat = d['pois'][0]['location'].split(',')
            return (float(lng), float(lat))
    except:
        pass
    return None

def generate_ts(communities_dict, city_key, city_label):
    lines = ['import type { Community } from \"../types\";', '']
    var_name = 'nanjingCommunities' if city_key == 'nanjing' else 'mockCommunities'
    lines.append(f'export const {var_name}: Community[] = [')
    landlords = ['\u5f20\u4f1f','\u674e\u5f3a','\u738b\u82b3','\u5218\u6d0b','\u9648\u9759','\u6768\u78ca','\u8d75\u5a1c','\u9ec4\u660e','\u5468\u6770','\u5434\u654f']
    decors = ['\u7cbe\u88c5','\u4e2d\u88c5','\u8c6a\u88c5','\u7b80\u88c5']
    tags_pool = ['\u8fd1\u5730\u94c1','\u7cbe\u88c5\u4fee','\u62ce\u5305\u5165\u4f4f','\u91c7\u5149\u597d','\u5b89\u9759\u5b9c\u5c45','\u5357\u5317\u901a\u900f','\u72ec\u7acb\u53a8\u536b','\u968f\u65f6\u770b\u623f']
    cid = 0; lid = 0
    for name, comm in sorted(communities_dict.items(), key=lambda x: -len(x[1]['listings'])):
        cid += 1
        district = '\u5176\u4ed6'
        districts = ['\u6d66\u4e1c','\u9ec4\u6d66','\u9759\u5b89','\u5f90\u6c47','\u957f\u5b81','\u666e\u9640','\u8679\u53e3','\u6768\u6d66','\u95f5\u884c','\u5b9d\u5c71','\u5609\u5b9a','\u677e\u6c5f','\u9752\u6d66','\u5949\u8d24','\u9f13\u697c','\u7384\u6b66','\u79e6\u6dee','\u5efa\u90ba','\u6816\u971e','\u96e8\u82b1','\u6c5f\u5b81']
        for d in districts:
            if d in name:
                district = d + '\u533a'; break
        lines.append(f'  {{ id: \"{city_key[0]}{cid}\", name: \"{name}\", district: \"{district}\", city: \"{city_key}\", lat: {comm[\"lat\"]}, lng: {comm[\"lng\"]}, avgRent: 0, listings: [')
        for l in comm['listings']:
            lid += 1
            sn = lid * 7 + 13
            ll = random.choice(landlords)
            ph = '1' + random.choice(['38','39','50','58','86','88']) + str(random.randint(10000000,99999999))
            tags = random.sample(tags_pool, random.randint(2,4))
            tags_s = ', '.join(f'\"{t}\"' for t in tags)
            dt = f'2026-{random.randint(3,6):02d}-{random.randint(1,28):02d}'
            elev = str(random.random() > 0.4).lower()
            dec = random.choice(decors)
            lines.append(f'    {{ id: \"{city_key[0]}{lid}\", title: \"{l[\"title\"]}\", rent: {l[\"rent\"]}, area: {l[\"area\"]}, rooms: \"{l[\"rooms\"]}\", floor: \"{l[\"floor\"]}\", direction: \"{l[\"direction\"]}\", community: \"{name}\",')
            lines.append(f'      images: [l[\"image\"], \"img://room/{sn+1}\", \"img://room/{sn+2}\"],')
            lines.append(f'      landlordName: \"{ll}\", landlordPhone: \"{ph}\",')
            lines.append(f'      description: \"\u623f\u6e90\u4f4d\u4e8e{name}\uff0c{l[\"direction\"] or \"\u671d\u5411\u597d\"}\uff0c{l[\"floor\"] or \"\u697c\u5c42\u9002\u4e2d\"}\u3002\u4ea4\u901a\u4fbf\u5229\uff0c\u751f\u6d3b\u914d\u5957\u9f50\u5168\u3002{l[\"rooms\"]}\u6237\u578b\uff0c{l[\"area\"] if l[\"area\"] else \"\u9762\u79ef\u9002\u4e2d\"}\u5e73\u7c73\u3002\",')
            lines.append(f'      tags: [{tags_s}], listedDate: \"{dt}\", isElevator: {elev}, decoration: \"{dec}\" }},')
        lines.append('  ]},')
    lines.append('];')
    return '\n'.join(lines)

def main():
    city_key = sys.argv[1] if len(sys.argv) > 1 else 'shanghai'
    if city_key not in CITY_CONFIGS:
        print(f'Unknown city: {city_key}. Options: {list(CITY_CONFIGS.keys())}', file=sys.stderr)
        sys.exit(1)
    cfg = CITY_CONFIGS[city_key]
    print(f'Scraping {cfg[\"domain\"]} for {cfg[\"amap_city\"]} rental data...')
    all_items = []
    for pg in range(1, MAX_PAGES + 1):
        url = f'https://{cfg[\"domain\"]}/zufang/' if pg == 1 else f'https://{cfg[\"domain\"]}/zufang/pg{pg}/'
        data = fetch(url)
        if not data:
            print(f'Page {pg}: fetch failed'); continue
        items = parse_listings(data)
        print(f'Page {pg}: {len(items)} items')
        if not items:
            break
        all_items.extend(items)
        time.sleep(1.0)
    print(f'\nTotal: {len(all_items)} listings')
    if len(all_items) < 50:
        print(f'Too few listings ({len(all_items)}), using mock generation fallback.', file=sys.stderr)
        # Generate fallback data
        sys.exit(1)
    groups = {}
    for l in all_items:
        n = l['community']
        if not n: continue
        if n not in groups:
            groups[n] = {'listings': []}
        groups[n]['listings'].append(l)
    print(f'Communities: {len(groups)}')
    print('Geocoding...')
    for i, (n, g) in enumerate(groups.items()):
        c = geocode(n, cfg['amap_city'])
        if c:
            g['lng'], g['lat'] = c[0], c[1]
        else:
            g['lng'], g['lat'] = float(cfg['default_center'].split(',')[0]) + random.uniform(-0.1, 0.1), float(cfg['default_center'].split(',')[1]) + random.uniform(-0.05, 0.05)
        if i % 20 == 0:
            print(f'  {i}/{len(groups)}')
        time.sleep(0.15)
    code = generate_ts(groups, city_key, cfg['amap_city'])
    outpath = os.path.join(os.path.dirname(__file__), cfg['output'])
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    with open(outpath, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f'Written to {outpath}: {len(all_items)} listings, {len(groups)} communities')

if __name__ == '__main__':
    main()
