import json, sys
d = json.load(open(sys.argv[1]))
rows = d["rows"]
order = ["已有同等功能", "既有功能可擴充", "需要新增動畫", "需要新增複合互動元件", "不適合目前架構或需要額外授權"]
L = []
L.append("# 動畫參考盤點\n")
L.append(f"來源：[{d['source']['name']}]({d['source']['url']})（資料檔 `data.js`，{d['source']['readOn']} 讀取）。共 **{d['source']['items']}** 筆，編號 1–347，每筆一列，完整資料見 [`inventory.json`](inventory.json)。\n")
L.append("這份盤點只記錄來源編號、元件類型、觸發方式與技術類別這幾項事實，以及 Sketch2Site 自己的分類與計畫。不收錄來源的名稱、簡介、Prompt、程式或素材。要查原始效果，請用編號到來源網站對照。\n")
L.append("## 統計\n\n| 分類 | 筆數 |\n|---|---|")
for k in order: L.append(f"| {k} | {d['categories'].get(k,0)} |")
L.append(f"| 合計 | {len(rows)} |\n")
if delivery := d.get("delivery"):
    L.append(f"交付狀態：{delivery['duplicate']} 筆已有同等、{delivery['excluded']} 筆排除、{delivery['verifiedMappings']} 筆已驗證對應、{delivery['pending']} 筆待實作。\n")
L.append("優先序用於排程。P1 與明列已驗證批次的資料有正式 Runtime；其他預計新增項目仍待實作。\n")
done = {}
for r in rows:
    if r["priority"] == "P1" or r.get("verifiedBatch"): done.setdefault(r["sketch2site"], []).append(str(r["sourceId"]))
L.append(f"## 已完成的來源對應（{len(done)} 個新動畫，對應 {sum(map(len, done.values()))} 筆來源）\n\n| Sketch2Site ID | 對應來源編號 |\n|---|---|")
for k, v in done.items(): L.append(f"| `{k}` | {', '.join(v)} |")
L.append("")
L.append("## 已驗證的複合元件擴充\n\n| 元件 | 來源編號 | 批次 |\n|---|---|---|")
for r in rows:
    if r.get("verifiedComponentBatch"):
        L.append(f"| {r['sketch2site']} | {r['sourceId']} | {r['verifiedComponentBatch']} |")
L.append("")
L.append("## 已驗證的既有動畫擴充\n\n| Registry ID | 來源編號 | 批次 |\n|---|---|---|")
for r in rows:
    if r.get("verifiedExpansionBatch"):
        L.append(f"| `{r['sketch2site']}` | {r['sourceId']} | {r['verifiedExpansionBatch']} |")
L.append("")
for k in order:
    L.append(f"## {k}\n\n| # | 元件 | 觸發 | 技術 | Sketch2Site | 優先 | 說明 |\n|---|---|---|---|---|---|---|")
    for r in rows:
        if r["category"] != k: continue
        L.append(f"| {r['sourceId']} | {r['component']} | {r['trigger']} | {r['technique']} | {r['sketch2site'] or '—'} | {r['priority'] or '—'} | {r['note'] or ''} |")
    L.append("")
open(sys.argv[2], "w").write("\n".join(L))
