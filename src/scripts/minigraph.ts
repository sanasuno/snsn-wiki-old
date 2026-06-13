/**
 * @scripts/minigraph.ts
 */

// ダークモード判定と色の生成

import * as d3 from 'd3';
import { defaultLocale, type Locale} from '@i18n/i18n.config';


const container = document.getElementById('mini-graph-container');
const currentPath = container?.dataset.currentPath ?? '';
const locale = (container?.dataset.locale as Locale) ?? defaultLocale;
const localeBaseUrl = container?.dataset.localeBaseUrl ?? '';
const noLinkMsg = container?.dataset.noLinkMsg ?? '';

interface Node {
  id: string;
  x?: number;
  y?: number;
  label: string;
  exists?: boolean;
}

const graphApiUrl = `${localeBaseUrl}/api/graph.json`;

function toRealSlug(fullSlug: string): string {
  // '/ja/wiki/sample/test' → 'sample/test'
  const match = fullSlug.match(/\/wiki\/(.+)$/);
  if (match) return match[1];
  // wiki以外のパス（トップページ等）
  const parts = fullSlug.split('/').filter(Boolean);
  return parts.slice(2).join('/'); // locale と wiki を除く
}

function getIsDark() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// ダークモード対応のカラーパレット
function makeColors() {
  const dark = getIsDark();
  return {
    nodeCurrent:  '#f59e0b',
    nodeNeighbor: dark ? '#4f46e5' : '#6366f1',
    nodeMissing:  dark ? '#374151' : '#e5e7eb',
    nodeStroke:   dark ? '#0f0f1a' : '#ffffff',
    nodeStrokeMissing: dark ? '#4b5563' : '#9ca3af',
    link:         dark ? '#2d2d4e' : '#e5e7eb',
    text:         dark ? '#cbd5e1' : '#1f2937',
    textMuted:    dark ? '#64748b' : '#9ca3af',
  };
}

// メイン関数
async function initMiniGraph() {
  // 要素の取得と初期化
  const canvas    = document.getElementById('mini-graph-canvas');
  const loading   = document.getElementById('mini-graph-loading');
  if (!container || !canvas) return;
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // グラフデータの取得
  let allData;
  try {
    const r = await fetch(graphApiUrl);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    allData = await r.json();
  } catch (e: any) {
    if (loading) loading.style.display = 'none';
    return;
  }

  // ノードとリンクの抽出
  const { nodes: allNodes, links: allLinks } = allData;

  const baseSlug = toRealSlug(currentPath);

  // 現在ページに接続しているノードIDを収集（1ホップ）
  const neighborIds = new Set([baseSlug]);
  for (const l of allLinks) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (s === baseSlug) neighborIds.add(t);
    if (t === baseSlug) neighborIds.add(s);
  }

  // フィルタ
  const nodes = allNodes
    .filter((n: any) => neighborIds.has(n.id))
    .map((n: any) => ({ ...n }));
  const nodeSet = new Set(nodes.map((n: any) => n.id));
  const links = allLinks
    .filter((l: any) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return nodeSet.has(s) && nodeSet.has(t);
    })
    .map((l: any) => ({ ...l }));

  if (loading) loading.style.display = 'none';

  // 孤立ページ（リンクなし）の場合はメッセージ
  if (nodes.length <= 1) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;
        font-size:0.8rem;color:var(--color-text-subtle);">
        <i class="fa-solid fa-link-slash" style="margin-right:6px;"></i>
        ${noLinkMsg}
      </div>`;
    return;
  }

  // サイズ
  const setSize = () => {
    const r = container.getBoundingClientRect();
    canvas.width  = r.width;
    canvas.height = r.height;
  };
  setSize();
  new ResizeObserver(() => { setSize(); sim?.force('center', d3.forceCenter(canvas.width/2, canvas.height/2)); }).observe(container);

  // ノードの描画半径を決める関数
  const R = (n: any) => n.id === baseSlug ? 10 : 7;

  // シミュレーションのセットアップ
  let sim = d3.forceSimulation<Node>(nodes)
    .force('link',   d3.forceLink<Node, d3.SimulationLinkDatum<Node>>(links).id(d => d.id).distance(60).strength(0.6))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(canvas.width/2, canvas.height/2))
    .force('col',    d3.forceCollide(d => R(d) + 6))
    .on('tick', draw);

  // ドラッグのセットアップ
  let tf = d3.zoomIdentity;
  const zoom = d3.zoom<HTMLCanvasElement, unknown>().scaleExtent([0.2, 4]).on('zoom', e => { tf = e.transform; draw(); });
  d3.select(canvas).call(zoom);

  // 全ノードが収まるように初期位置を調整
  const fitView = () => {
    const xs = nodes.map((n: any) => n.x).filter((v: any) => v != null);
    const ys = nodes.map((n: any) => n.y).filter((v: any) => v != null);
    if (!xs.length) return;
    const p = 32;
    const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
    const sc = Math.min(
      (canvas.width -p*2) / ((x1-x0)||1),
      (canvas.height-p*2) / ((y1-y0)||1),
      2
    );
    d3.select(canvas).call(
      zoom.transform,
      d3.zoomIdentity.translate(
        canvas.width /2 - sc*(x0+x1)/2,
        canvas.height/2 - sc*(y0+y1)/2
      ).scale(sc)
    );
  };
  sim.on('end', fitView);

  // ホバー状態
  let hovered: Node | null = null;

  // 描画関数
  function draw() {
    // カラーパレットの生成
    const C = makeColors();
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(tf.x, tf.y);
    ctx.scale(tf.k, tf.k);

    // リンク
    links.forEach((l: any) => {
      const s = l.source, t = l.target;
      if (!s?.x || !t?.x) return;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = C.link;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // ノード
    nodes.forEach((n: any) => {
      if (n.x == null) return;
      const r   = R(n);
      const hi  = hovered?.id === n.id;
      const cur = n.id === baseSlug;
      const missing = n.exists === false;
      const col = cur ? C.nodeCurrent : missing ? C.nodeMissing : C.nodeNeighbor;

      // ノードの円
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + (hi ? 2 : 0), 0, Math.PI*2);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = cur ? '#fff' : missing ? C.nodeStrokeMissing : C.nodeStroke;
      ctx.lineWidth = cur ? 2 : 1.5;
      if (missing) ctx.setLineDash([3,3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // ラベル（常に表示）
      const fs = Math.max(9, 10 / Math.sqrt(tf.k));
      ctx.font = `${cur ? 700 : 400} ${fs}px system-ui,sans-serif`;
      ctx.fillStyle = missing ? C.textMuted : C.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const lbl = n.label.length > 14 ? n.label.slice(0,12)+'…' : n.label;
      ctx.fillText(lbl, n.x, n.y + r + 3);
    });

    // ホバーしているノードを最前面に描画
    ctx.restore();
  }

  // マウスイベントのセットアップ
  const hit = ((px: number, py: number) => {
    const [wx, wy] = tf.invert([px, py]);
    return nodes.find((n: any) => n.x != null && (n.x-wx)**2+(n.y-wy)**2 < (R(n)+6)**2) ?? null;
  });

  // ホバーとクリック
  canvas.addEventListener('mousemove', e => {
    const rc = canvas.getBoundingClientRect();
    const n  = hit(e.clientX-rc.left, e.clientY-rc.top);
    if (n !== hovered) { hovered = n; canvas.style.cursor = n ? 'pointer' : 'grab'; draw(); }
  });
  canvas.addEventListener('mouseleave', () => { hovered = null; canvas.style.cursor = ''; draw(); });
  canvas.addEventListener('click', e => {
    const rc = canvas.getBoundingClientRect();
    const n  = hit(e.clientX-rc.left, e.clientY-rc.top);
    if (n && n.exists !== false && n.id !== baseSlug) {
      window.location.href = `${localeBaseUrl}/wiki/${n.id}`;
    }
  });

  // テーマ変化時に再描画
  new MutationObserver(() => draw())
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

// 初期化
initMiniGraph().catch(console.error);