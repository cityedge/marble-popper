# Marble Popper

重量感のあるマーブル、間欠的に押し寄せるWAVE、磁力で再接続する連鎖を組み合わせた、ローカルでも遊べるブラウザ向けマーブルポッパーです。

公開パッケージには、100ステージのメインゲームとサバイバルモードに加えて、オリジナルキャンペーンを作るためのステージ生成器、難易度評価器、キャンペーンビルダーが含まれます。

## すぐに遊ぶ

1. GitHubの **Releases** から最新の `MarblePopper_v0.39.zip` をダウンロードします。
2. ZIPをすべて展開します。
3. `PLAY_MARBLE_POPPER.html` または `index.html` をChrome／Edgeで開きます。
4. タイトル画面で難易度を選び、**ニューゲーム**を押します。

インストール、アカウント、ネット接続、ローカルサーバーは不要です。HTMLだけを移動せず、`assets`フォルダーと一緒に使用してください。

GitHub Pagesで公開している場合は、リポジトリのPages URLからそのまま遊べます。

## 主な内容

- 徐々に難しくなる100ステージのキャンペーン
- EASY／NORMAL／HARD／VERY HARDの4難易度
- クリア済みNORMALステージを使う無限サバイバル
- WAVE投入、磁力チェイン、ギャップショット、特殊マーブル
- 面別・難易度別ハイスコアとサバイバル記録
- ブラウザ自動保存とJSON形式のセーブ書き出し／統合読み込み
- StageSpec v2／GameplayProfile v5によるカスタムキャンペーン
- 日本語／英語表示、BGM／SE音量調整
- Windows、macOS、Linuxの現行ブラウザで動く静的Webアプリ

## 同梱ツール

`tools`フォルダー内のHTMLを直接開いて使用します。

1. `STAGE_GENERATOR.html` — レーン形状を1件または一括生成
2. `DIFFICULTY_EVALUATOR.html` — 形状由来の狙いにくさを評価して順位付け
3. `CAMPAIGN_BUILDER.html` — 10ステージ単位のティアへゲーム設定を割り当て

標準制作フローは次の通りです。

```text
Stage Generator
  → Stage Bundle
  → Difficulty Evaluator
  → Evaluated Stage Bundle
  → Campaign Builder
  → v5 Campaign JSON
  → Game / Stage Test
```

各項目の意味と具体的な操作は [TOOLS_USER_GUIDE.md](TOOLS_USER_GUIDE.md) を参照してください。

## ドキュメント

- [USER_GUIDE.md](USER_GUIDE.md) — ゲームの詳細説明
- [TOOLS_USER_GUIDE.md](TOOLS_USER_GUIDE.md) — 制作ツール3種の詳細説明
- [GITHUB_RELEASE_GUIDE.md](GITHUB_RELEASE_GUIDE.md) — 手動アップロード、Pages、Release作成手順
- [CHANGELOG.md](CHANGELOG.md) — 公開版の変更履歴
- [LICENSE](LICENSE) — MIT License

## セーブとプライバシー

進行状況と記録はブラウザの`localStorage`へ保存されます。設定画面からポータブルなJSONセーブを書き出せます。カスタムキャンペーンやセーブファイルは、ファイル選択後もブラウザ内で処理され、アプリが外部サーバーへ送信する機能はありません。

HTMLの場所、公開URL、ブラウザ、ブラウザプロファイルが変わると別の保存領域になる場合があります。移動前にセーブを書き出してください。

## 開発版の起動

ビルド工程なしで `apps/marble_popper_mvp_v39.html` を開けます。配布ZIPを再構築する場合は、プロジェクトの仮想環境から次を実行します。

```powershell
.\.venv\Scripts\python.exe tools\build_distribution.py
.\.venv\Scripts\python.exe tools\verify_distribution.py
```

生成物は `dist/MarblePopper_v0.39/` と `dist/MarblePopper_v0.39.zip` です。

## License

MIT License. Copyright (c) 2026 cityedge. 詳細は [LICENSE](LICENSE) を参照してください。

---

## English quick start

Download the latest ZIP from **Releases**, extract the complete folder, and open `PLAY_MARBLE_POPPER.html` or `index.html` in Chrome or Edge. No installation or local server is required. Keep the HTML and `assets` folder together.

The package includes the 100-stage game and three offline campaign-authoring tools. See `USER_GUIDE.md` and `TOOLS_USER_GUIDE.md`; both begin with an English quick reference.
