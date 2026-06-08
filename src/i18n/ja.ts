/**
 * @i18n/ja.ts
 * 日本語翻訳ファイル
 */

export const ja = {
  // ここに日本語の翻訳を追加
  'lang.ja': '日本語',
  'lang.label': '言語',
  'lang.list': '言語を選択',

  // サイト全体
  'site.title': 'snsn-wiki',
  'site.description': 'Astro製パーソナルウィキ',

  // OGP
  'og.locale': 'ja_JP',

  // ヘッダー
  'header.navigation': 'ナビゲーション',
  'nav.home': 'ホーム',
  'nav.category': 'カテゴリ',
  'nav.graph': 'グラフ',
  'nav.tags': 'タグ',
  'theme.toggle': 'テーマ切り替え',
  
  // サイドバー
  'sidebar.toggle': 'サイドバー切り替え',
  'sidebar.navigation': 'ナビゲーション',
  'sidebar.quickLinks': 'クイックリンク',
  'sidebar.home': 'ホーム',
  'sidebar.graph': 'グラフ',
  'sidebar.search': '検索',
  'sidebar.category': 'カテゴリ',
  'sidebar.tags': 'タグ',
  'sidebar.recent': '最近の更新',
  'sidebar.sampleAuto': 'サンプル（自動）',

  // カテゴリ
  'category.title': 'カテゴリ一覧',
  'category.sample': 'サンプル',
  'category.count': 'カテゴリ',
  'category.count.page': 'ページ',
  'category.more': 'もっと見る',
  'category.description': 'カテゴリ一覧',
  'category.subcategories': 'サブカテゴリ',
  'category.pages': 'ページ',

  // タグ
  'tag.title': 'タグ一覧',
  'tag.count': 'タグ',
  'tag.count.page': 'ページ',
  'tag.more': 'もっと見る',
  'tag.description': 'タグ一覧',
  'tag.empty': 'タグがありません',

  // ホーム
  'home.title': 'ホーム',
  'home.description': 'SNSN Wikiのホーム',

  // フォールバック
  'fallback.warning': 'このページには現在の翻訳がありません。',
  
  // メタ
  'meta.created': '作成',
  'meta.updated': '更新',
  
  // フッター
  'footer.privacy': 'プライバシーポリシー',
  'footer.terms': '利用規約',

  // 目次
  'toc.title': '目次',
  'toc.open': '目次を開く',

  // グラフ
  'graph.title':       'リンクグラフ',
  'graph.connections': 'このページの繋がり',
  'graph.noLinks':     'このページにはまだリンクがありません',
  'graph.loading':     'グラフを読み込み中…',
  'graph.openFull':    '全体グラフを開く',
  'graph.zoomIn':      'ズームイン',
  'graph.zoomOut':     'ズームアウト',
  'graph.zoomFit':     '全体表示',
  'graph.toggleColor': 'タグ色分け切替',
  'graph.legendPage':  'ページ',
  'graph.legendCurrent': '現在のページ',
  'graph.legendMissing': '未作成ページ',

  // グラフページ
  'graph.page.title':       'グラフビュー',
  'graph.page.description': 'ページ間のリンク構造を可視化しています。ノードをクリックしてページに移動、ドラッグで移動、スクロールでズームできます。',
  'graph.error.d3':         'D3.jsの読み込みに失敗しました',
  'graph.error.fetch':      'グラフデータの取得に失敗しました: ',
  'graph.error.noNodes':    '表示できるページがまだありません',

  // ミニグラフ
  'graph.mini.title':   'このページの繋がり',
  'graph.mini.loading': '読み込み中',
  'graph.mini.noLinks': 'このページにはまだリンクがありません',

  // 404
  '404.title':       '404 — ページが見つかりません',
  '404.heading':     'ページが見つかりません',
  '404.message':     'URLが間違っているか、ページが削除・移動された可能性があります。',
  '404.backHome':    'ホームへ戻る',
  '404.search':      '検索する',
  '404.wikiLinkHint': 'WikiLinkから飛んだ場合、そのページはまだ作成されていません。同名のMarkdownファイルを作成してください。',

} as const;
