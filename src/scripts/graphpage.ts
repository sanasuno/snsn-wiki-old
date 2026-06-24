/**
 * @scripts/graphpage.ts
 * グラフページ用スクリプト
 */

import * as d3 from 'd3';
import { savePreference, getPreference } from '@scripts/storage';
import { makeColors } from '@scripts/graphColors';
import type { GraphNode, GraphLink } from '@typeDefs/graph';

const container = document.getElementById('graph-container'); // グラフコンテナ
const localeBaseUrl = container?.dataset.localeBaseUrl ?? ''; // ロケールベースURL
const errFetch = container?.dataset.errFetch ?? ''; // 取得エラーメッセージ
const errNoNodes = container?.dataset.errNoNodes ?? ''; // ノードなしエラーメッセージ

// グラフAPIURL
const graphApiUrl = `${localeBaseUrl}/api/graph.json`;

// =============================================
// グラフカラーモード設定
//   'simple'  : アクセントカラー1色（デフォルト）
//   'tag'     : タグ別カラー（カラフル）
// =============================================
const STORAGE_KEY = 'snsn-graph-colormode';
let colorMode = getPreference(STORAGE_KEY) || 'simple';

// シンプルモード用カラー
const TAG_COLORS = [
  '#6366f1','#3b82f6','#8b5cf6','#06b6d4',
  '#10b981','#f59e0b','#ef4444','#ec4899',
  '#84cc16','#f97316','#14b8a6','#a855f7',
];

// メイン処理
async function main() {
  const canvas    = document.getElementById('graph-canvas');
  const loading   = document.getElementById('graph-loading');
  const tooltip   = document.getElementById('graph-tooltip');
  const ttTitle   = document.getElementById('graph-tooltip-title');
  const ttTags    = document.getElementById('graph-tooltip-tags');
  const legend    = document.getElementById('legend-node-sample');

  // 要素の存在チェック
  if (!container || !canvas) return;
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // エラーメッセージ表示
  const showErr = (msg: string) => {
    if (loading) loading.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="margin-right:6px;color:#ef4444;"></i>${msg}`;
  };

  // グラフデータを取得
  let data;
  try {
    const r = await fetch(graphApiUrl);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    data = await r.json();
  } catch(e: any) {
    showErr(errFetch + e.message); return; 
  }

  // データの基本的な検査
  const { nodes, links } = data;
  if (!nodes?.length) { showErr(errNoNodes); return; }
  if (loading) loading.style.display = 'none';

  // タグ→色マッピング（tagモード用）
  const groups = [...new Set(nodes.map((n: GraphNode) => n.group))];
  const tagColorMap = Object.fromEntries(
    groups.map((g, i) => [g, TAG_COLORS[i % TAG_COLORS.length]])
  );

  // ノードの色を返す
  function nodeColor(n: GraphNode, C: any) {
    if (n.exists === false)   return C.nodeMissing;
    if (colorMode === 'tag')  return tagColorMap[n.group] || C.nodeSimple;
    return C.nodeSimple;
  }

  // 凡例更新
  function updateLegend() {
    const C = makeColors();
    if (legend) legend.style.background = colorMode === 'tag' ? 'linear-gradient(135deg,#6366f1,#ec4899)' : C.nodeSimple;
  }
  updateLegend();

  // カラーモード切替ボタン
  (document.getElementById('toggle-color') as HTMLButtonElement)?.addEventListener('click', () => {
    colorMode = colorMode === 'simple' ? 'tag' : 'simple';
    savePreference(STORAGE_KEY, colorMode);
    updateLegend();
    draw();
  });

  // サイズ設定
  const setSize = () => {
    const r = container.getBoundingClientRect();
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width  = w;
    canvas.height = h;
    return true;
  };
  setSize();
  const ro = new ResizeObserver(() => {
    const changed = setSize();
    if (!changed) return;
    sim?.force('center', d3.forceCenter(canvas.width/2, canvas.height/2)); 
    draw(); 
  });
  ro.observe(container);

  // ノードの半径計算（リンク数に応じて大きくなる）
  const R = (n: GraphNode) => 7 + Math.min((n.linkCount || 0) * 1.5, 14);

  // シミュレーションのセットアップ
  const sNodes = nodes.map((n: GraphNode) => ({...n}));
  const sLinks = links.map((l: GraphLink) => ({...l}));

  // D3フォースシミュレーションの設定
  const sim = d3.forceSimulation(sNodes as d3.SimulationNodeDatum[])
    .force('link',   d3.forceLink(sLinks as d3.SimulationLinkDatum<GraphNode>[]).id((d: any) => d.id).distance(90).strength(0.4)) // リンク強度
    .force('charge', d3.forceManyBody().strength((d: any) => -180 - (d.linkCount || 0) * 8)) // 電荷強度
    .force('center', d3.forceCenter(canvas.width/2, canvas.height/2)) // 中心引力
    .force('col',    d3.forceCollide((d: any) => R(d as GraphNode) + 8)) // 衝突回避
    .on('tick', draw);

  // ズーム・パン設定
  let tf = d3.zoomIdentity;
  const zoom = d3.zoom<HTMLCanvasElement, unknown>()
    .scaleExtent([0.05, 5]) // ズーム範囲
    .filter((event) => {
      // マウスダウン時にノードをクリックしていない場合のみズーム有効
      if (event.type === 'mousedown') {
        const rc = canvas.getBoundingClientRect();
        return !hit(event.clientX - rc.left, event.clientY - rc.top);
      }
      return !event.button;
    })
    .on('zoom', e => {
      tf = e.transform;
      draw();
    })
  d3.select(canvas).call(zoom);

  // 全体表示関数
  const fitView = () => {
    // ノードの座標を取得
    const xs = sNodes.map((n: any) => n.x).filter((v: any) => v != null);
    const ys = sNodes.map((n: any) => n.y).filter((v: any) => v != null);
    // 座標がなければ終了
    if (!xs.length) return;

    const p = 60;
    const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
    const sc = Math.min((canvas.width-p*2)/((x1-x0)||1), (canvas.height-p*2)/((y1-y0)||1), 2);
    d3.select(canvas).transition().duration(700).call(
      zoom.transform,
      d3.zoomIdentity.translate(canvas.width/2 - sc*(x0+x1)/2, canvas.height/2 - sc*(y0+y1)/2).scale(sc)
    );
  };

  // コントロールボタンイベント
  document.getElementById('zoom-in') ?.addEventListener('click', () => d3.select(canvas).transition().call(zoom.scaleBy, 1.3)); // ズームイン
  document.getElementById('zoom-out')?.addEventListener('click', () => d3.select(canvas).transition().call(zoom.scaleBy, 0.77)); // ズームアウト
  document.getElementById('zoom-fit')?.addEventListener('click', fitView); // 全体表示
  sim.on('end', fitView);

  // ノードホバー状態
  let hovered: GraphNode | null = null;

  // 描画関数
  function draw() {
    const C = makeColors();
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(tf.x, tf.y);
    ctx.scale(tf.k, tf.k);

    // エッジ
    sLinks.forEach((l: any) => {
      const s = l.source, t = l.target;
      if (!s?.x || !t?.x) return;
      const hi = hovered && (s.id === hovered.id || t.id === hovered.id);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = hi ? C.linkHi : C.link;
      ctx.lineWidth   = hi ? 2 : 1;
      ctx.globalAlpha = hi ? 0.9 : 0.45;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // ノード
    sNodes.forEach((n: GraphNode) => {
        const { x, y } = n;
        if (x == null || y == null) return;
        const r   = R(n);
        const hi  = hovered?.id === n.id;
        const col = nodeColor(n, C);
        const isMissing = n.exists === false;

        // ノード本体
        ctx.beginPath();
        ctx.arc(x, y, r + (hi ? 3 : 0), 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();

        // ストローク（未作成は破線風に薄く）
        ctx.strokeStyle = isMissing ? C.nodeStrokeMissing : C.nodeStroke;
        ctx.lineWidth   = isMissing ? 1 : 1.5;
        if (isMissing) {
            ctx.setLineDash([3, 3]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // ラベル
        if (tf.k > 0.5 || hi) {
            const fs = Math.max(10, 11 / Math.sqrt(tf.k));
            ctx.font         = `400 ${fs}px system-ui, sans-serif`;
            ctx.fillStyle    = isMissing ? C.textMuted : C.text;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'top';
            const lbl = n.label.length > 18 ? n.label.slice(0,16)+'…' : n.label;
            ctx.fillText(lbl, x, y + r + 4);
        }
    });

    ctx.restore();
  }

  // ノードヒット判定
  const hit = (px: number, py: number): GraphNode | null => {
    const [wx, wy] = tf.invert([px, py]);
    return sNodes.find((n: GraphNode) => n.x != null && n.y != null && (n.x-wx)**2+(n.y-wy)**2 < (R(n)+6)**2) ?? null;
  };

  // マウス移動でホバー判定とツールチップ表示
  canvas.addEventListener('mousemove', e => {
    const rc = canvas.getBoundingClientRect();
    const n  = hit(e.clientX - rc.left, e.clientY - rc.top);
    if (n !== hovered) {
      hovered = n;
      canvas.style.cursor = n ? 'pointer' : 'grab';
      if (n && tooltip && ttTitle && ttTags) {
        ttTitle.textContent = n.label;
        ttTags.textContent  = n.tags?.map(t => `#${t}`).join(' ') ?? '';
        tooltip.style.left  = `${e.clientX - rc.left + 14}px`;
        tooltip.style.top   = `${e.clientY - rc.top  - 10}px`;
        tooltip.classList.add('visible');
      } else {
        tooltip?.classList.remove('visible');
      }
      draw();
    }
  });

  // マウス離脱でホバー解除
  canvas.addEventListener('mouseleave', () => {
    hovered = null;
    tooltip?.classList.remove('visible');
    draw();
  });

  // クリックでページ遷移
  canvas.addEventListener('click', e => {
    const rc = canvas.getBoundingClientRect();
    const n  = hit(e.clientX - rc.left, e.clientY - rc.top);
    if (n && n.exists !== false) {
      // API URL からベースパスを推測 (/api/graph.json... を除去)
      window.location.href = `${localeBaseUrl}/wiki/${n.id}`;
    }
  });

  // ドラッグでノード移動
  d3.select(canvas).call(
    d3.drag<HTMLCanvasElement, unknown>()
      .subject(e => { const rc = canvas.getBoundingClientRect(); return hit(e.x-rc.left, e.y-rc.top); })
      .on('start', e => {
        // ドラッグ開始時にシミュレーションを開始
        if (!e.subject) return;
        if (!e.active) sim.alphaTarget(0.3).restart();
        e.subject.fx = e.subject.x; e.subject.fy = e.subject.y;
      })
      .on('drag', e => {
        // ドラッグ中はノードを固定位置に設定
        if (!e.subject) return;
        const rc = canvas.getBoundingClientRect();
        const [wx, wy] = tf.invert([e.x - rc.left, e.y - rc.top]);
        e.subject.fx = wx; e.subject.fy = wy;
      })
      .on('end', e => {
        // ドラッグ終了時にシミュレーションを停止
        if (!e.subject) return;
        if (!e.active) sim.alphaTarget(0);
        e.subject.fx = null; e.subject.fy = null;
      })
  );

  // テーマ変化時に再描画・凡例更新
  const themeObserver = new MutationObserver(() => { updateLegend(); draw(); });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  });

  // ページ遷移時にdisconnect
  document.addEventListener('astro:before-swap', () => {
    themeObserver.disconnect();
    ro.disconnect();
    sim.stop();
  },
  { once: true });
}

// メイン処理実行
main().catch(e => {
  console.error('[snsn-codex Graph]', e);
  const l = document.getElementById('graph-loading');
  if (l) l.textContent = String(e);
});