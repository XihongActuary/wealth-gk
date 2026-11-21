# -*- coding: utf-8 -*-
"""
fetch_market.py —— 抓取市场行情快照，生成 data/market.json
用于《中产的财富增长与守护》网站 now.html 行情卡。

数据源：
- 腾讯 qt.gtimg.cn：A股指数实时（上证、沪深300）
- 腾讯 web.ifzq.gtimg.cn fqkline：A股近30日收盘序列；黄金ETF(518880)曲线（黄金代理）
- 新浪 hq.sinajs.cn：美股纳指、美元指数、COMEX黄金实时
- 新浪 US_MinKService：纳斯达克近30日收盘序列
- 新浪 NewForexService：美元兑人民币近30日序列（美元曲线代理）
- 10年期国债收益率：中债/yield.chinabond 快照值，人工核对写入 BOND_SNAPSHOT

运行：python fetch_market.py [输出路径]
以后刷新行情：重跑本脚本即可（增量覆盖 market.json）。
"""
import json
import re
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")

# 10年期国债收益率（中债国债到期收益率，需人工核对后更新）
# 来源 https://yield.chinabond.com.cn  2026-11-13: 1.61%
BOND_SNAPSHOT = {"yield": 1.61, "date": "2026-11-13",
                 "source": "中债国债到期收益率曲线(中国债券信息网)"}


def http_get(url, referer=None, timeout=15):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        **({"Referer": referer} if referer else {}),
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    for enc in ("utf-8", "gbk"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def gbk_get(url, referer=None, timeout=15):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        **({"Referer": referer} if referer else {}),
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("gbk", errors="replace")


# ---------- 腾讯 A股实时 ----------
def tencent_quote(codes):
    """返回 {code: {name, price, chg_pct}}"""
    txt = gbk_get("https://qt.gtimg.cn/q=" + ",".join(codes))
    out = {}
    for m in re.finditer(r'v_([a-z]{2}\d+)="([^"]*)"', txt):
        code, body = m.group(1), m.group(2).split("~")
        if len(body) > 32:
            out[code] = {"name": body[1], "price": float(body[3]),
                         "chg_pct": float(body[32]) if body[32] else None}
    return out


# ---------- 腾讯 日K 序列 ----------
def tencent_kline(code, n=30):
    """返回 [(date, close)] 近 n 日"""
    url = ("https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?"
           f"param={code},day,,,{n},qfq")
    data = json.loads(http_get(url))
    node = data.get("data", {}).get(code, {})
    rows = node.get("day") or node.get("qfqday") or []
    return [(r[0], float(r[2])) for r in rows[-n:]]


def tencent_kline_week(code, nweeks=520):
    """返回 [(date, close)] 近 n 周（腾讯 fqkline 周线）"""
    url = ("https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?"
           f"param={code},week,,,{nweeks},qfq")
    data = json.loads(http_get(url))
    node = data.get("data", {}).get(code, {})
    rows = node.get("week") or node.get("qfqweek") or []
    return [(r[0], float(r[2])) for r in rows[-nweeks:]]


def monthly(series, years):
    """把 [(date, close)] 降采样为每月最后一个收盘，取最近 years 年"""
    if not series:
        return []
    cutoff = (datetime.now().replace(microsecond=0)).strftime("%Y")
    y0 = int(cutoff) - years
    out, cur_ym, last = [], None, None
    for d, c in series:
        ym = d[:7]
        if cur_ym is None:
            cur_ym = ym
        if ym != cur_ym:
            out.append(last)
            cur_ym = ym
        last = (d, c)
    if last:
        out.append(last)
    return [(d, c) for d, c in out if int(d[:4]) >= y0]


# ---------- 新浪 实时 ----------
def sina_realtime():
    txt = gbk_get("https://hq.sinajs.cn/list=gb_ixic,DINIW,hf_GC",
                  referer="https://finance.sina.com.cn")
    out = {}
    m = re.search(r'hq_str_gb_ixic="([^"]*)"', txt)
    if m:
        f = m.group(1).split(",")
        out["ixic"] = {"name": "纳斯达克综合", "price": float(f[1]),
                       "chg_pct": float(f[2]) if f[2] else None}
    m = re.search(r'hq_str_DINIW="([^"]*)"', txt)
    if m:
        f = m.group(1).split(",")
        out["diniw"] = {"name": "美元指数", "price": float(f[1])}
    m = re.search(r'hq_str_hf_GC="([^"]*)"', txt)
    if m:
        f = m.group(1).split(",")
        # hf_ 字段：0最新价, 2买价, 3卖价, 4最高, 5最低, 7昨结算
        price = float(f[0])
        prev = float(f[7]) if len(f) > 7 and f[7] else None
        chg = round((price - prev) / prev * 100, 2) if prev else None
        out["gold"] = {"name": "COMEX黄金", "price": price, "chg_pct": chg}
    return out


# ---------- 新浪 纳指日K ----------
def sina_us_kline(symbol=".IXIC", n=None):
    url = ("https://stock.finance.sina.com.cn/usstock/api/json_v2.php/"
           f"US_MinKService.getDailyK?symbol={symbol}")
    rows = json.loads(http_get(url, referer="https://finance.sina.com.cn"))
    out = [(r["d"], float(r["c"])) for r in rows]
    return out if n is None else out[-n:]


# ---------- 新浪 外汇日K（美元兑人民币代理曲线） ----------
def sina_fx_kline(symbol="fx_susdcny", n=None):
    url = ("https://vip.stock.finance.sina.com.cn/forex/api/jsonp.php/"
           f"var%20t=/NewForexService.getDayKLine?symbol={symbol}")
    txt = http_get(url, referer="https://finance.sina.com.cn")
    m = re.search(r'var t=\("(.*)"\);?', txt, re.S)
    if not m:
        return []
    rows = m.group(1).split("|")
    out = []
    for r in rows:
        p = r.strip().split(",")
        if len(p) >= 5 and p[0]:
            out.append((p[0], float(p[2])))
    return out if n is None else out[-n:]


def main():
    out_path = Path(sys.argv[1] if len(sys.argv) > 1 else
                    Path(__file__).resolve().parent.parent / "data" / "market.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    snap = {"generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "bond10y": dict(BOND_SNAPSHOT, note="国内10年期国债收益率约1.6%，"
                            "处于历史低位（低利率时代）"),
            "assets": []}

    tk = tencent_quote(["sh000001", "sh000300"])
    sr = sina_realtime()

    def asset(aid, name, group, price, chg, series=None, series_note=None,
              source="", ts=None, long_series=None):
        snap["assets"].append({
            "id": aid, "name": name, "group": group, "price": price,
            "chg_pct": chg, "series": series or [],
            "series_note": series_note, "source": source, "ts": ts or
            snap["generated_at"], "long": long_series or {}})

    sh = tk.get("sh000001", {})
    hs = tk.get("sh000300", {})
    sh_w = tencent_kline_week("sh000001", 520)
    hs_w = tencent_kline_week("sh000300", 520)
    asset("sh000001", "上证指数", "A股", sh.get("price"),
          sh.get("chg_pct"), tencent_kline("sh000001"),
          None, "腾讯行情", long_series={
              "3y": monthly(sh_w, 3), "5y": monthly(sh_w, 5),
              "10y": monthly(sh_w, 10)})
    asset("sh000300", "沪深300", "A股", hs.get("price"),
          hs.get("chg_pct"), tencent_kline("sh000300"),
          None, "腾讯行情", long_series={
              "3y": monthly(hs_w, 3), "5y": monthly(hs_w, 5),
              "10y": monthly(hs_w, 10)})

    ix = sr.get("ixic", {})
    ix_all = sina_us_kline()
    asset("ixic", ix.get("name", "纳斯达克综合"), "美股", ix.get("price"),
          ix.get("chg_pct"), ix_all[-30:],
          None, "新浪财经", long_series={
              "3y": monthly(ix_all, 3), "5y": monthly(ix_all, 5),
              "10y": monthly(ix_all, 10)})
    au = sr.get("gold", {})
    au_w = tencent_kline_week("sh518880", 520)
    asset("gold", au.get("name", "COMEX黄金"), "黄金", au.get("price"),
          au.get("chg_pct"), tencent_kline("sh518880"),
          "曲线为华安黄金ETF(518880)近30日走势，作为黄金代理", "新浪/腾讯行情",
          long_series={
              "3y": monthly(au_w, 3), "5y": monthly(au_w, 5),
              "10y": monthly(au_w, 10)})
    dxy = sr.get("diniw", {})
    fx_all = sina_fx_kline()
    asset("diniw", dxy.get("name", "美元指数"), "美元外汇",
          dxy.get("price"), None, fx_all[-30:],
          "曲线为美元兑人民币汇率近30日走势，作为美元强弱代理", "新浪财经",
          long_series={
              "3y": monthly(fx_all, 3), "5y": monthly(fx_all, 5),
              "10y": monthly(fx_all, 10)})

    # 10年期国债（静态快照，无曲线）
    asset("bond10y", "10年期国债", "债券", BOND_SNAPSHOT["yield"], None,
          [], "利率为到期收益率（非价格），无走势曲线", BOND_SNAPSHOT["source"],
          ts=BOND_SNAPSHOT["date"])

    snap["assets"] = [a for a in snap["assets"] if a["price"] is not None]

    out_path.write_text(json.dumps(snap, ensure_ascii=False, indent=1),
                        encoding="utf-8")
    print(f"OK -> {out_path}")

    # 同时生成 market_snapshot.js（script 标签可加载，file:// 环境不受 CORS 限制）
    js_path = out_path.parent / "market_snapshot.js"
    js_path.write_text(
        "/* 自动生成，勿手改：由 tools/fetch_market.py 输出 */\n"
        "window.MARKET_SNAPSHOT = "
        + json.dumps(snap, ensure_ascii=False) + ";\n",
        encoding="utf-8")
    print(f"OK -> {js_path}")
    for a in snap["assets"]:
        s = f"{len(a['series'])}d" if a["series"] else "no-series"
        print(f"  {a['id']:<10} {a['name']:<8} {a['price']:>12.2f} "
              f"chg={a['chg_pct']} series={s}")


if __name__ == "__main__":
    main()
