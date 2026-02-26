/**
 * @file Wikiプロキシエンドポイント
 * @description SCP Wiki (HTTP) コンテンツをHTTPS経由で配信するリバースプロキシ。
 * 通常ページからDOM抽出で記事本文を取得し、記事固有CSS/JSを保持しつつ
 * Wikidotプラットフォーム要素を除去した最適化HTMLを配信する。
 * HTMLレスポンス内のHTTP URLをプロキシパスに書き換え、mixed contentを完全に回避する。
 */

import { Hono } from "hono";
import { parseHTML } from "linkedom";
import { cacheGet, cacheSet } from "../lib/cache";

/**
 * デバッグ用CSS/JS: overflow要素をハイライト表示
 * ?debug=overflow クエリパラメータで有効化
 */
const DEBUG_OVERFLOW_STYLE = [
  "<style>",
  "*{outline:1px solid rgba(255,0,0,0.15)!important}",
  "#debug-overflow-info{position:fixed;top:0;left:0;right:0;z-index:99999;background:rgba(0,0,0,0.85);color:#0f0;font-size:11px;padding:8px;font-family:monospace;max-height:40vh;overflow-y:auto}",
  "</style>",
  "<script>",
  "document.addEventListener('DOMContentLoaded',function(){",
  "var vw=document.documentElement.clientWidth;var issues=[];",
  "document.querySelectorAll('*').forEach(function(el){",
  "var r=el.getBoundingClientRect();",
  "if(r.right>vw+1||r.width>vw){",
  "var id=el.id?'#'+el.id:'';",
  "var cls=el.className?'.'+String(el.className).split(' ').join('.'):'';",
  "var tag=el.tagName.toLowerCase();",
  "var w=Math.round(r.width);",
  "var st=el.getAttribute('style')||'(none)';",
  "var cs=getComputedStyle(el);",
  "var cw='width:'+cs.width+' max-width:'+cs.maxWidth+' overflow:'+cs.overflow;",
  "issues.push(tag+id+cls+' w='+w+'px style=\"'+st+'\" computed={'+cw+'}');",
  "el.style.outline='3px solid red';",
  "}});",
  "var info=document.createElement('div');info.id='debug-overflow-info';",
  "info.innerHTML='<b>Viewport:'+vw+'px | Overflow:'+issues.length+'</b><br>'",
  "+(issues.length?issues.map(function(s,i){return(i+1)+'. '+s}).join('<br>'):'None');",
  "document.body.prepend(info);",
  "});",
  "</script>",
].join("");

/**
 * 許可するWikidotドメイン（セキュリティのため制限）
 */
const ALLOWED_WIKIDOT_DOMAIN = "scp-jp.wikidot.com";

/**
 * HTMLレスポンス内のHTTP/プロトコル相対URLをプロキシパスに書き換えるマッピング
 *
 * 各ドメインについて http:// と // (プロトコル相対) の両方を書き換える。
 * 順序: 長いドメインから先に処理（部分マッチ防止）
 *
 * - wdfiles.com: Wikidotのファイルストレージ（画像・CSS等）
 * - www.wikidot.com: Wikidot共通リソース
 * - scp-jp.wikidot.com: SCP-JPサイト自体のリソース
 */
const URL_REWRITE_MAP: readonly (readonly [string, string])[] = [
  // scp-jp-storage.wdfiles.com
  ["http://scp-jp-storage.wdfiles.com/", "/wdfiles-scp-jp-storage/"],
  ["//scp-jp-storage.wdfiles.com/", "/wdfiles-scp-jp-storage/"],
  // scp-jp.wdfiles.com
  ["http://scp-jp.wdfiles.com/", "/wdfiles-scp-jp/"],
  ["//scp-jp.wdfiles.com/", "/wdfiles-scp-jp/"],
  // static.wdfiles.com（プラットフォームテーマCSS）
  ["http://static.wdfiles.com/", "/wdfiles-static/"],
  ["//static.wdfiles.com/", "/wdfiles-static/"],
  // static-l.wdfiles.com（プラットフォームテーマCSS: ロードバランサ）
  ["http://static-l.wdfiles.com/", "/wdfiles-static-l/"],
  ["//static-l.wdfiles.com/", "/wdfiles-static-l/"],
  // static.wikidot.com（プラットフォーム静的リソース）
  ["http://static.wikidot.com/", "/wikidot-static/"],
  ["//static.wikidot.com/", "/wikidot-static/"],
  // www.wikidot.com
  ["http://www.wikidot.com/", "/wikidot-www/"],
  ["//www.wikidot.com/", "/wikidot-www/"],
  // scp-jp.wikidot.com（最後に処理: 他のドメインを先に処理するため）
  ["http://scp-jp.wikidot.com/", "/wiki/"],
  ["//scp-jp.wikidot.com/", "/wiki/"],
];

/**
 * 注入CSS: 記事可読性向上スタイル
 *
 * 記事固有CSSの後に配置されるため、可読性に直結するプロパティに !important を付与。
 * 元記事のカラー・装飾は尊重し、レイアウト・タイポグラフィのみ上書きする。
 *
 * - モックアップ（header-6-minimal-2btn.html）のスタイルを参考
 * - CSSは初回ペイント前に評価されるため、レイアウトシフトが発生しない
 */
const INJECTED_STYLE = [
  "<style>",
  // Wikidot構造要素のレイアウトリセット（#main-contentのmarginで記事幅が狭くなる問題の対処）
  "#main-content{margin:0!important;padding:0!important;max-width:none!important}",
  // 記事タイトル: フォントサイズ調整（design-tokens --font-size-3xl: 24px 準拠）
  "#page-title{font-size:24px!important;font-weight:bold!important;padding:0 8px}",
  // 記事可読性: ベースタイポグラフィ + iOS Safari iframe scroll修正
  // Wikidot CSSがbody/htmlにoverflow:hiddenを設定し、iOS Safariのiframe内スクロールを阻害するため上書き
  "html,body{overflow-x:hidden!important;overflow-y:visible!important}",
  "body{font-family:'Hiragino Kaku Gothic Pro','ヒラギノ角ゴ Pro W3',Meiryo,sans-serif;line-height:1.8!important;-webkit-text-size-adjust:100%}",
  // 記事可読性: コンテンツ領域（左右16px余白はモック準拠）
  "#page-content{font-size:15px!important;overflow-wrap:break-word;word-break:break-word;padding:0 16px!important}",
  // 記事可読性: 段落間スペーシング
  "#page-content p{margin-bottom:1em!important}",
  // 記事可読性: 画像レスポンシブ化 + 上下マージン
  "#page-content img{max-width:100%!important;height:auto!important;display:block;margin:16px 0}",
  // レイアウト崩れ防止: Wikidot記事のfloatブロックを無効化
  "#page-content .block-left,#page-content .block-right{float:none!important;clear:both!important;text-align:left!important;margin:0 auto!important}",
  // コンポーネントコードビューア非表示: テーマ等のコンポーネントincludeに付随する
  // CSSソースコード表示用collapsible-blockを非表示にする（記事本文ではない）
  ".collapsible-block:has(>.collapsible-block-unfolded>.collapsible-block-content>.code){display:none!important}",
  // ライセンス帰属表示: 記事末尾に配置、コンテンツと一緒にスクロール
  ".attribution-footer{border-top:1px solid #e5e7eb;background:#f9fafb;padding:8px 16px 20px;text-align:center;font-size:12px;color:#6b7280;margin-top:32px}",
  ".attribution-footer a{color:#3b82f6;text-decoration:underline}",
  "</style>",
].join("");

/**
 * 既にプロキシパスに書き換え済みのプレフィックス
 * これらで始まるパスは rewriteUrls で二重変換しない
 */
const PROXY_PATH_PREFIXES = ["wiki/", "wdfiles-", "wikidot-", "api/", "common--", "local--"];

/**
 * URL_REWRITE_MAPで /wiki/ に変換されたhrefのうち、記事リンクのみを
 * /api/wiki-proxy/ に書き換える正規表現
 *
 * common--/local-- で始まるリソースパスは除外（Next.js rewritesで処理）
 */
const WIKI_ARTICLE_HREF_RE = /href="\/wiki\/(?!common--|local--)/g;

/**
 * </body>直前に注入するJavaScript
 *
 * iframe内のリンククリックをインターセプトし、記事リンクをプロキシ経由で遷移させる。
 * HTML書き換えで対応できない動的生成リンクの安全策として機能する。
 *
 * 処理:
 * 1. 既にプロキシ済みのリンク → そのまま通過
 * 2. リソースパス（common--, local--, wdfiles, wikidot） → そのまま通過
 * 3. /wiki/ 記事リンク → /api/wiki-proxy/ 経由に変換
 * 4. 外部リンク（http/https） → 新しいタブで開く
 * 5. その他の絶対パスリンク → /api/wiki-proxy/ 経由に変換
 * 6. collapsible-block の開閉トグル（WIKIDOT.combined.js の代替）
 * 7. colmod（coltop/colend）ネスト可能折りたたみの開閉トグル
 * 8. YUI TabView のタブ切り替え
 */
const INJECTED_SCRIPT = [
  "<script>",
  "document.addEventListener('click',function(e){",
  "var a=e.target.closest('a[href]');",
  "if(!a)return;",
  "var h=a.getAttribute('href');",
  "if(!h||h.charAt(0)==='#'||h.indexOf('javascript:')===0)return;",
  "if(h.indexOf('/api/wiki-proxy/')===0)return;",
  "if(h.indexOf('/common--')===0||h.indexOf('/local--')===0)return;",
  "if(h.indexOf('/wdfiles')===0||h.indexOf('/wikidot')===0)return;",
  "if(h.indexOf('/wiki/')===0){",
  "var p=h.slice(6);",
  "if(p.indexOf('common--')===0||p.indexOf('local--')===0)return;",
  "e.preventDefault();",
  "location.href='/api/wiki-proxy/'+p;",
  "return}",
  "if(h.indexOf('http')===0||h.indexOf('//')===0){",
  "e.preventDefault();",
  "window.open(h,'_blank','noopener');",
  "return}",
  "if(h.charAt(0)==='/'){",
  "e.preventDefault();",
  "location.href='/api/wiki-proxy'+h;",
  "return}",
  "});",
  // collapsible-block 開閉（WIKIDOT.combined.js の代替）
  // 通常ページからDOM抽出するためWIKIDOT.combined.jsは除去される。
  // collapsible-block の開閉をバニラJSで再実装する。
  "document.addEventListener('click',function(e){",
  "var l=e.target.closest('a.collapsible-block-link');",
  "if(!l)return;",
  "e.preventDefault();",
  "var b=l.closest('div.collapsible-block');",
  "if(!b)return;",
  "var f=b.querySelector('.collapsible-block-folded');",
  "var u=b.querySelector('.collapsible-block-unfolded');",
  "if(!f||!u)return;",
  "if(getComputedStyle(f).display!=='none'){",
  "f.style.display='none';",
  "u.style.display='block'",
  "}else{",
  "u.style.display='none';",
  "f.style.display='block'",
  "}",
  "});",
  // colmod（coltop/colend）開閉（WIKIDOT.combined.js の代替）
  // Boyu12氏がSCP-JP向けに開発したネスト可能折りたたみコンポーネント。
  // 標準の[[collapsible]]とは異なるHTML構造を使用:
  //   .colmod-block > ul > li.folded/.unfolded > .colmod-link-top > a
  // li要素のクラスを folded ↔ unfolded で切り替えることで開閉する。
  "document.addEventListener('click',function(e){",
  "var a=e.target.closest('.colmod-link-top a,.colmod-link-end a');",
  "if(!a)return;",
  "e.preventDefault();",
  "var li=a.closest('li');",
  "if(!li)return;",
  "if(li.classList.contains('folded')){",
  "li.classList.replace('folded','unfolded')",
  "}else if(li.classList.contains('unfolded')){",
  "li.classList.replace('unfolded','folded')",
  "}",
  "});",
  // YUI TabView タブ切り替え（WIKIDOT.combined.js の代替）
  // Wikidotの[[tabview]]構文が生成するYUI TabViewウィジェットのタブ切り替えを
  // バニラJSで再実装する。.yui-nav内のタブクリックで.yui-content内のパネルを切り替え。
  "document.addEventListener('click',function(e){",
  "var a=e.target.closest('.yui-nav a');",
  "if(!a)return;",
  "e.preventDefault();",
  "var ns=a.closest('.yui-navset');",
  "if(!ns)return;",
  "var li=a.closest('li');",
  "if(!li)return;",
  "var tabs=ns.querySelectorAll('.yui-nav>li');",
  "var idx=Array.prototype.indexOf.call(tabs,li);",
  "if(idx<0)return;",
  "tabs.forEach(function(t){t.classList.remove('selected')});",
  "li.classList.add('selected');",
  "var panels=ns.querySelectorAll('.yui-content>div');",
  "panels.forEach(function(p,i){p.style.display=i===idx?'block':'none'})",
  "});",
  "</script>",
].join("");

/**
 * WIKIDOTグローバルオブジェクトのスタブ
 *
 * 記事固有JSがWIKIDOTオブジェクトを参照する場合のReferenceError防止。
 * プラットフォームスクリプト（WIKIDOT.combined.js）は除去するが、
 * 記事内のインラインスクリプトがWIKIDOT.page等を参照するケースに対応。
 */
const WIKIDOT_STUB = "<script>window.WIKIDOT={page:{listeners:{}},modules:{}};</script>";

/**
 * インラインstyle属性の選択的フィルタリング
 *
 * Wikidot記事には `style="text-align: right;"` 等のインラインスタイルが含まれることがあり、
 * モバイル表示でレイアウト崩れを起こす。一方で、ACSバー等のコンポーネントは
 * width/max-width/overflow等のレイアウト系プロパティに依存しているため、
 * これらは保持する必要がある。
 *
 * 戦略: style属性を個別プロパティに分解し、保持すべきプロパティのみ残す。
 * 残るプロパティがなければstyle属性ごと除去する。
 */

/** レイアウトに必要なため保持するCSSプロパティのパターン */
const PRESERVED_STYLE_PROPS_RE =
  /^(display|width|min-width|max-width|height|min-height|max-height|overflow|overflow-x|overflow-y|box-sizing|position|top|left|right|bottom|z-index|opacity|visibility|grid-template|grid-column|grid-row|flex|flex-basis|flex-grow|flex-shrink|order)$/i;

/**
 * インラインstyle属性値から保持すべきプロパティのみを抽出する。
 * 保持するプロパティがなければ空文字を返す。
 */
function filterStyleValue(styleValue: string): string {
  const preserved = styleValue
    .split(";")
    .map((decl) => decl.trim())
    .filter((decl) => {
      if (!decl) return false;
      const colonIndex = decl.indexOf(":");
      if (colonIndex === -1) return false;
      const prop = decl.slice(0, colonIndex).trim();
      return PRESERVED_STYLE_PROPS_RE.test(prop);
    });
  return preserved.length > 0 ? preserved.join("; ") + ";" : "";
}

/** style属性全体にマッチする正規表現 */
const INLINE_STYLE_ATTR_RE = / style="([^"]*)"/gi;

/**
 * href="/path" 形式の絶対パスリンクを href="/api/wiki-proxy/path" に書き換える正規表現
 *
 * Wiki HTML内のドメインなし絶対パスリンク（例: href="/scp-456"）は
 * URL_REWRITE_MAP では変換されない。
 * そのままだとiframe内で /scp-456 に遷移し、Next.jsの404になるため、
 * /api/wiki-proxy/ 経由に変換する。
 *
 * 否定先読みで既にプロキシパスに変換済みの href は除外する。
 */
const ABSOLUTE_PATH_HREF_RE = new RegExp(`href="/(?!${PROXY_PATH_PREFIXES.join("|")})`, "g");

/**
 * CloudFront URLのHTTPをHTTPSにプロトコル変換する正規表現
 *
 * WikidotのCDN（*.cloudfront.net）はHTTPS対応済みのため、
 * プロキシ不要でプロトコル変換のみで mixed content を回避できる。
 */
const CLOUDFRONT_HTTP_RE = /http:\/\/([a-z0-9]+\.cloudfront\.net\/)/g;

/**
 * プラットフォームスクリプトのsrc URLパターン
 *
 * Wikidotプラットフォームが提供する外部スクリプト（WIKIDOT.combined.js等）を識別。
 * これらはDOM抽出後の再構築HTMLでは不要なため除外する。
 */
const PLATFORM_SCRIPT_SRC_RE = /cloudfront\.net|wikidot\.com|wdfiles\.com/i;

/**
 * プラットフォームスクリプトのインラインコードパターン
 *
 * WIKIDOT/OZONE/YAHOOグローバルオブジェクトへの代入を含むインラインスクリプトを識別。
 * これらはプラットフォーム初期化コードであり、再構築HTMLでは不要。
 */
const PLATFORM_SCRIPT_CONTENT_RE = /\bWIKIDOT\.\w+\s*=|\bOZONE\.\w+\s*=|\bYAHOO\.\w+\s*=/;

// ============================================================
// DOM抽出・再構築
// ============================================================

/**
 * DOM抽出結果
 */
interface ExtractedContent {
  /** #main-content の outerHTML（フォールバック: body innerHTML） */
  mainContentHtml: string;
  /** <head>内の記事固有<style>タグ（outerHTML配列） */
  headStyleTags: string[];
  /** <head>内の<link rel="stylesheet">タグ（outerHTML配列） */
  headLinkTags: string[];
  /** フィルタ済み記事固有<script>タグ（outerHTML配列） */
  articleScripts: string[];
}

/**
 * 指定されたスクリプト要素が記事固有のものかどうかを判定
 *
 * プラットフォームスクリプト（外部CDN、WIKIDOT/OZONE/YAHOO初期化コード）を除外し、
 * 記事著者が埋め込んだカスタムJSのみを保持する。
 */
function isArticleScript(script: { src: string; textContent: string | null }): boolean {
  // 外部スクリプト: プラットフォームURLなら除外
  if (script.src) {
    return !PLATFORM_SCRIPT_SRC_RE.test(script.src);
  }
  const content = script.textContent ?? "";
  // 空のスクリプトは除外
  if (!content.trim()) {
    return false;
  }
  // プラットフォーム初期化コードなら除外
  return !PLATFORM_SCRIPT_CONTENT_RE.test(content);
}

/**
 * HTMLからDOM解析して記事コンテンツを抽出
 *
 * 通常のWikidotページから以下を抽出:
 * 1. #main-content（#page-title + #page-content を含む記事本体）
 * 2. <head>内の<style>タグ（記事テーマCSS）
 * 3. <head>内の<link rel="stylesheet">タグ（外部CSS）
 * 4. 記事固有の<script>タグ（プラットフォームスクリプトを除外）
 */
function extractContent(html: string): ExtractedContent {
  const { document: doc } = parseHTML(html);

  // #main-content の outerHTML（フォールバック: body innerHTML）
  const mainContent = doc.querySelector("#main-content");
  const mainContentHtml = mainContent?.outerHTML ?? doc.body.innerHTML;

  // <head>内の<style>タグを収集
  const headStyleTags: string[] = [];
  doc.querySelectorAll("head style").forEach((style) => {
    headStyleTags.push(style.outerHTML);
  });

  // <head>内の<link rel="stylesheet">タグを収集
  const headLinkTags: string[] = [];
  doc.querySelectorAll('head link[rel="stylesheet"]').forEach((link) => {
    headLinkTags.push(link.outerHTML);
  });

  // <script>タグをフィルタリング（プラットフォームスクリプトを除外）
  const articleScripts: string[] = [];
  doc.querySelectorAll("script").forEach((script) => {
    if (isArticleScript(script)) {
      articleScripts.push(script.outerHTML);
    }
  });

  return { mainContentHtml, headStyleTags, headLinkTags, articleScripts };
}

/**
 * ライセンス帰属表示HTMLを生成
 *
 * CC BY-SA 3.0帰属表示を記事末尾に配置する。
 * iframe内に注入することで記事コンテンツと一緒にスクロールする。
 * 著者名はwiki-proxyでは取得できないため省略形を使用。
 */
function buildAttributionHtml(articleId: string): string {
  const originalUrl = `https://scp-jp.wikidot.com/${articleId}`;
  const licenseUrl = "https://creativecommons.org/licenses/by-sa/3.0/";
  return [
    '<div class="attribution-footer" data-testid="attribution-footer">',
    "<p>",
    'Content licensed under <a href="',
    licenseUrl,
    '" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>',
    " &middot; SCP Foundation",
    "</p>",
    '<a href="',
    originalUrl,
    '" target="_blank" rel="noopener noreferrer">原文を見る</a>',
    "</div>",
  ].join("");
}

/**
 * 抽出されたコンテンツから最適化HTMLを再構築
 *
 * 構築順序:
 * 1. meta（charset, viewport）
 * 2. 外部CSS（<link>タグ）
 * 3. 記事固有CSS（<style>タグ）
 * 4. 注入CSS（可読性スタイル、!importantで記事CSSをオーバーライド）
 * 5. 記事本文（#main-content）
 * 6. ライセンス帰属表示（記事末尾、コンテンツと一緒にスクロール）
 * 7. WIKIDOTスタブ（ReferenceError防止）
 * 8. 記事固有JS
 * 9. 注入JS（リンクインターセプト + コンポーネント開閉）
 */
function buildHtml(content: ExtractedContent): string {
  return [
    "<!DOCTYPE html>",
    '<html><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    ...content.headLinkTags,
    ...content.headStyleTags,
    INJECTED_STYLE,
    "</head><body>",
    content.mainContentHtml,
    "<!-- ATTRIBUTION_PLACEHOLDER -->",
    WIKIDOT_STUB,
    ...content.articleScripts,
    INJECTED_SCRIPT,
    "</body></html>",
  ].join("");
}

/**
 * HTML内のURLを書き換え + インラインstyle除去
 *
 * 処理順序:
 * 1. インラインstyle属性の除去（レイアウト崩れ防止）
 * 2. フルURL書き換え（URL_REWRITE_MAP: http://domain/ → /proxy-path/）
 * 3. CloudFront URLのプロトコル変換（http:// → https://）
 * 4. 絶対パスhref書き換え（/scp-456 → /api/wiki-proxy/scp-456）
 * 5. /wiki/ 記事hrefをプロキシ経由に変換（/wiki/scp-456 → /api/wiki-proxy/scp-456）
 */
function rewriteUrls(html: string): string {
  let result = html;
  // 1. インラインstyle属性の選択的フィルタリング（レイアウト系プロパティは保持）
  result = result.replace(INLINE_STYLE_ATTR_RE, (_match, value: string) => {
    const filtered = filterStyleValue(value);
    return filtered ? ` style="${filtered}"` : "";
  });
  // 2. フルURL書き換え
  for (const [from, to] of URL_REWRITE_MAP) {
    result = result.replaceAll(from, to);
  }
  // 3. CloudFront URLのプロトコル変換（HTTPS対応済みCDNなのでプロキシ不要）
  result = result.replace(CLOUDFRONT_HTTP_RE, "https://$1");
  // 4. ドメインなし絶対パスhrefをプロキシ経由に書き換え
  result = result.replace(ABSOLUTE_PATH_HREF_RE, 'href="/api/wiki-proxy/');
  // 5. URL_REWRITE_MAPで /wiki/ に変換された記事hrefをプロキシ経由に変換
  result = result.replace(WIKI_ARTICLE_HREF_RE, 'href="/api/wiki-proxy/');
  return result;
}

/**
 * HTML処理パイプライン: DOM抽出 → HTML再構築 → URL書き換え
 *
 * 通常のWikidotページHTMLを受け取り、最適化されたプロキシHTMLを生成する。
 * articleIdが指定された場合、記事末尾にライセンス帰属表示を注入する。
 */
function processHtml(html: string, articleId?: string): string {
  const content = extractContent(html);
  const rebuilt = buildHtml(content);
  const rewritten = rewriteUrls(rebuilt);
  // 帰属表示はrewriteUrls後に注入（外部URLが書き換えられるのを防止）
  const attribution = articleId ? buildAttributionHtml(articleId) : "";
  return rewritten.replace("<!-- ATTRIBUTION_PLACEHOLDER -->", attribution);
}

/**
 * リクエストパスからwiki-proxy以降のパスを抽出
 *
 * Hono basePath(/api)を含む完全パスに対応。
 * c.req.path はルーティングコンテキスト（basePath有無）に関わらず
 * リクエストの完全パスを返すため、正規表現で /wiki-proxy/ 以降を抽出する。
 *
 * 注意: Honoのワイルドカードパラメータ c.req.param("*") は
 * .route() でネストされた場合に空になるため使用しない。
 *
 * 例: "/api/wiki-proxy/scp-173" → "scp-173"
 *     "/wiki-proxy/scp-173"     → "scp-173"
 */
function extractProxyPath(requestPath: string): string {
  const match = /\/wiki-proxy\/(.+)/.exec(requestPath);
  return match?.[1] ?? "";
}

/**
 * GET /wiki-proxy/*
 *
 * SCP Wikiページを通常モードで取得し、DOM抽出で記事本文・CSS・JSを抽出。
 * Wikidotプラットフォーム要素（サイドバー・ヘッダー・フッター等）を除去し、
 * 記事固有のカスタマイズ（テーマCSS・装飾JS）を保持した最適化HTMLを配信。
 * HTMLの場合はURL書き換えを行い、CSS/JS/画像等はそのままパススルーする。
 */
export const wikiProxyRoutes = new Hono().get("/*", async (c) => {
  const rawPath = extractProxyPath(c.req.path);

  if (!rawPath) {
    return c.json({ error: "path is required" }, 400);
  }

  // Wikidotはスラッグが小文字でないと正常に動作しない。
  // DBに大文字で格納されたarticle_id（例: "SCP-2000"）経由のリクエストに対応するため、
  // パスを小文字に正規化する。
  const path = rawPath.toLowerCase();

  // Redisキャッシュチェック（外部fetch前に実行し、ヒット時はHTTPリクエストをスキップ）
  const cacheKey = `wiki:html:${path}`;
  const cached = await cacheGet<string>(cacheKey);
  if (cached) {
    let html = cached;
    if (c.req.query("nav") === "floating") {
      html = html.replace(
        "</head>",
        "<style>.attribution-footer{padding-bottom:80px!important}</style></head>"
      );
    }
    if (c.req.query("debug") === "overflow") {
      html = html.replace("</head>", DEBUG_OVERFLOW_STYLE + "</head>");
    }
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=600",
      },
    });
  }

  // 通常ページを取得（記事固有CSS/JSを含む完全なHTML）
  const targetUrl = `http://${ALLOWED_WIKIDOT_DOMAIN}/${path}`;

  try {
    const response = await fetch(targetUrl);

    const contentType = response.headers.get("content-type") ?? "";

    // HTMLレスポンス: DOM抽出 + HTML再構築 + URL書き換え
    if (contentType.includes("text/html")) {
      const html = await response.text();
      const processed = processHtml(html, path);

      // processHtml結果をRedisキャッシュに保存（TTL 1時間、非同期でレスポンスをブロックしない）
      void cacheSet(cacheKey, processed, 3600);

      // nav=floating: FloatingUI（推薦画面）がある場合、帰属表示バーのpadding-bottomを拡大
      let finalHtml = processed;
      if (c.req.query("nav") === "floating") {
        finalHtml = finalHtml.replace(
          "</head>",
          "<style>.attribution-footer{padding-bottom:80px!important}</style></head>"
        );
      }
      // debug=overflow: はみ出し要素をハイライト表示するデバッグモード
      if (c.req.query("debug") === "overflow") {
        finalHtml = finalHtml.replace("</head>", DEBUG_OVERFLOW_STYLE + "</head>");
      }

      return new Response(finalHtml, {
        status: response.status,
        headers: {
          "content-type": contentType,
          "cache-control": "public, max-age=300, s-maxage=600",
        },
      });
    }

    // 非HTMLリソース（CSS/JS/画像等）: パススルー（キャッシュ対象外）
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return c.json({ error: "Failed to fetch wiki content" }, 502);
  }
});

// テスト用エクスポート
export {
  extractContent,
  buildHtml,
  buildAttributionHtml,
  rewriteUrls,
  processHtml,
  isArticleScript,
};
export type { ExtractedContent };
