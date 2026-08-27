# GitHub手動公開ガイド

この文書は、Marble PopperをGitHubへ初めて公開し、その後も同じ手順で更新するためのチェックリストです。GitHub DesktopやGit CLIを使わず、Web画面から手動アップロードする場合も対象にしています。

## 1. 公開前に確認するもの

リポジトリの公開ルートには、少なくとも次を置きます。

- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `USER_GUIDE.md`
- `TOOLS_USER_GUIDE.md`
- `GITHUB_RELEASE_GUIDE.md`

ゲームをGitHub Pagesでも公開する場合は、配布パッケージの内容を公開対象にします。`index.html`と`assets/`の相対位置を変えないでください。

公開前に、ライセンスを適用してよい自作物だけが含まれること、画像・音源の公開権利があることを確認してください。MIT Licenseはソフトウェアの利用条件であり、第三者素材の権利を自動的に解決するものではありません。

## 2. 配布物を作る

プロジェクトルートで次を実行します。

```powershell
.\.venv\Scripts\python.exe tools\build_distribution.py
.\.venv\Scripts\python.exe tools\verify_distribution.py
```

成功すると次ができます。

- `dist/MarblePopper_v0.55/` — 展開済み公開パッケージ
- `dist/MarblePopper_v0.55.zip` — GitHub Release添付用ZIP

検証は、必須ファイル、相対参照、キャンペーン100面、JavaScript構文、マニフェストのSHA-256、ZIPのCRCと内容一致を確認します。

## 3. ローカルで最終確認する

1. `dist/MarblePopper_v0.55/index.html`を開く。
2. 背景とBGMが読み込まれることを確認する。
3. ニューゲームを開始して発射、交換、一時停止を確認する。
4. ステージテストでステージ一覧を選べることを確認する。
5. `tools`内の3つのHTMLをそれぞれ開く。
6. Generatorで1面出力、Evaluatorで読込、Builderで評価済みバンドル読込まで確認する。

`file://`起動と、後述するGitHub PagesのHTTPS起動はブラウザの保存領域が別です。片方のセーブが自動的にもう片方へ移ることはありません。

## 4. GitHubリポジトリを作る

1. GitHubへサインインする。
2. **New repository**を選ぶ。
3. Repository nameを入力する。例: `marble-popper`
4. 公開するなら **Public** を選ぶ。
5. 既存ファイルをアップロードする場合、READMEやLICENSEの自動生成はOFFでも構わない。
6. **Create repository**を押す。

ソースコードまで公開するならプロジェクト一式を登録します。ただし、`.venv/`、`dist/`、一時ファイル、個人用データは`.gitignore`に従って除外してください。

ゲームだけを公開する専用リポジトリなら、`dist/MarblePopper_v0.55/`の**中身**をリポジトリ直下へアップロードします。フォルダー自体を一段余計に置くとPages URLが変わります。

## 5. Web画面から手動アップロードする

1. リポジトリ画面で **Add file → Upload files** を選ぶ。
2. 公開するファイルとフォルダーをドラッグ＆ドロップする。
3. ファイル一覧で`index.html`、`assets/`、`tools/`、各Markdown、`LICENSE`が見えることを確認する。
4. コミットメッセージを入力する。例: `Release Marble Popper v0.55`
5. **Commit changes**を押す。

GitHubのWebアップロードにはファイル数やファイルサイズの制約があります。失敗する場合はGitHub Desktopを使うか、配布ZIPをReleaseだけに添付し、Pages用ファイルを分けてアップロードしてください。

## 6. GitHub Pagesを有効にする

1. リポジトリの **Settings → Pages** を開く。
2. **Build and deployment** のSourceで **Deploy from a branch** を選ぶ。
3. 公開ブランチ（通常`main`）と `/ (root)` を選ぶ。
4. **Save**を押す。
5. 数分後に表示される公開URLを開く。

公開URLでは`index.html`が自動的に起動します。ゲームと制作ツールは静的ファイルだけで動作し、Node.jsやサーバープログラムは不要です。

Pages確認項目:

- タイトル画面の背景が表示される
- PLAY後にBGMが始まる
- ニューゲームが開始できる
- `tools/STAGE_GENERATOR.html`を直接開ける
- JSONの読込とダウンロードがブラウザで許可される
- 開発者ツールのConsoleに404がない

## 7. GitHub Releaseを作る

1. リポジトリの **Releases → Draft a new release** を開く。
2. 新しいタグを作る。例: `v0.55`
3. Release titleを入力する。例: `Marble Popper v0.55`
4. `CHANGELOG.md`の該当部分を説明へ貼る。
5. `dist/MarblePopper_v0.55.zip`を添付する。
6. 必要なら「公開候補」であることを明記する。
7. **Publish release**を押す。

ZIP利用者には「ZIP内の一部だけでなく、フォルダー全体を展開する」よう案内してください。

## 8. 更新版を公開する

1. `apps`に新しい番号のHTMLを追加し、旧版を残す。
2. ビルドスクリプトのバージョン、入力HTML、パッケージ名を更新する。
3. `README.md`、`USER_GUIDE.md`、`TOOLS_USER_GUIDE.md`、`CHANGELOG.md`の版情報を更新する。
4. 配布物を再ビルド・検証する。
5. GitHubへ変更をアップロードする。
6. 新しいタグとReleaseを作り、新しいZIPを添付する。
7. Pagesの公開URLでキャッシュを無視して再読込し、動作を確認する。

同じPages URLを維持すれば通常はブラウザセーブも維持されます。ただし、セーブ形式を変更する更新では移行テストが必要です。

## 9. 公開しないもの

- `.venv/`
- `tests/tmp/`、`output/`、`build/`などの生成途中ファイル
- 個人情報、APIキー、認証情報
- 権利を確認していない画像・音源
- 作業用バックアップZIPや不要な旧入力データ

旧アプリ版をソースリポジトリに残す運用は問題ありません。ダウンロード利用者向けReleaseには、最新版の配布ZIPだけを添付すると分かりやすくなります。

## 10. 公開後の不具合報告に含めてもらう情報

- Marble Popperのバージョン
- OSとブラウザ名／バージョン
- `file://`起動かGitHub Pagesか
- 使用モード、ステージ番号、難易度
- 再現手順
- カスタムデータ使用時は、そのJSON形式と作成ツールの版
- 可能ならスクリーンショットとConsoleエラー

セーブファイルにはプレイ記録が含まれます。公開Issueへ添付する前に、利用者自身が内容を確認するよう案内してください。
