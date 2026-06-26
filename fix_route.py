import re
with open('C:/Users/HP/Documents/Codex/2026-06-25/new-chat/rent-map/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
old = 'transfer.search([\n            fromLng, fromLat\n          ], [\n            toLng, toLat\n          ], (status: string, result: any) => {'
new = 'transfer.search(\n            new AMap.LngLat(fromLng, fromLat),\n            new AMap.LngLat(toLng, toLat),\n            (status: string, result: any) => {'
content = content.replace(old, new)
# Also fix bus parsing - replace instruction-only parsing with explicit bus parsing
old2 = '(plan.segments || []).forEach((seg: any) => {\n                if (seg.instruction) {\n                  segments.push(seg.instruction);\n                }\n                if (seg.walking && seg.walking.distance) {\n                  totalWalking += seg.walking.distance;\n                }\n              });'
new2 = '(plan.segments || []).forEach((seg: any) => {\n                if (seg.bus && seg.bus.buslines && seg.bus.buslines.length > 0) {\n                  const bl = seg.bus.buslines[0];\n                  const type = bl.type === "\u5730\u94c1\u7ebf\u8def" ? "\u5730\u94c1" : "\u516c\u4ea4";\n                  segments.push(type + bl.name + "(" + bl.departure_stop.name + "-" + bl.arrival_stop.name + ")");\n                } else if (seg.instruction) {\n                  segments.push(seg.instruction);\n                }\n                if (seg.walking && seg.walking.distance) {\n                  totalWalking += seg.walking.distance;\n                }\n              });'
content = content.replace(old2, new2)
with open('C:/Users/HP/Documents/Codex/2026-06-25/new-chat/rent-map/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('DONE')
