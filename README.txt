MARBLE POPPER v0.55 + AUTHORING TOOLS
=====================================

日本語
------

■ 起動方法

「PLAY_MARBLE_POPPER.html」または「index.html」をダブルクリックし、ブラウザで開いてください。
インストールやローカルサーバーは不要です。

HTMLファイルだけを別の場所へ移動しないでください。ゲーム本体と
「assets」フォルダーを同じ配布フォルダー内に置いたまま使用します。

■ セーブデータ

キャンペーン進行、難易度別ハイスコア、サバイバル記録はブラウザに
自動保存されます。

配布フォルダーを移動する前や、別のブラウザ・PCへ移行するときは、
タイトル画面の「設定」→「セーブを書き出す」でJSONファイルを保存して
ください。移行先では「セーブを読み込む」を選びます。

読み込みは現在の記録との統合です。より先の進行、より高いスコア、
より長いサバイバル時間が残ります。音量・ミュート設定は移行しません。

■ カスタムキャンペーン

「ステージテスト」→「データを読み込む」でGameplayProfile v5形式の
キャンペーンを読み込み、「メインキャンペーンとして使用」を選ぶと、
通常ゲームとサバイバルの内容をそのセッション中だけ差し替えられます。
カスタムキャンペーン自体はブラウザに保存されないため、次回起動時は
もう一度読み込んでください。記録はキャンペーンごとに保存されます。

■ BGMの差し替え

通常BGMは「assets/audio/bgm.ogg」です。同じファイル名・OGG形式の音源で
置き換えると、好きな曲を使用できます。元のファイルは必要に応じて
バックアップしてください。

■ 制作ツール

「tools」フォルダーに、ステージ生成器、難易度評価器、キャンペーン
ビルダーを同梱しています。各HTMLを直接開けます。制作手順と全設定の
意味は「TOOLS_USER_GUIDE.md」を参照してください。

ゲームの詳しい遊び方、スコア、サバイバル、セーブについては
「USER_GUIDE.md」を参照してください。

「ランダムステージ」はステージ生成器v0.19と同じ
10ファミリー、密度化、平滑化、安全検査、0～2立体交差を使用します。
固定探索上限で採用できない場合は内蔵キャンペーン面へフォールバックします。
スコアや進行状況は保存しません。


English
-------

■ Launch

Double-click "PLAY_MARBLE_POPPER.html" or "index.html" and open it in a browser. No installation
or local server is required.

Keep the HTML file and the "assets" folder together inside this distribution
folder. Do not move only the HTML file elsewhere.

■ Save data

Campaign progress, difficulty-specific high scores, and Survival records are
saved automatically in the browser.

Before moving the distribution folder or switching browser/PC, use
SETTINGS -> EXPORT SAVE. On the new installation, choose IMPORT SAVE.

Import merges with current data: farther progress, higher scores, and longer
Survival times are retained. Volume and mute preferences are not transferred.

■ Custom campaigns

Load a GameplayProfile v5 campaign from STAGE TEST -> LOAD DATA, then choose
USE AS MAIN CAMPAIGN to replace Main and Survival content for the current
session. The campaign file itself is not stored in the browser and must be
loaded again after restarting. Its records are kept in a separate namespace.

■ Replacing the normal BGM

The normal track is "assets/audio/bgm.ogg". Replace it with another OGG file
using the same filename to use your preferred music. Back up the original first
if you want to restore it later.

■ Authoring tools

The "tools" folder contains the Stage Generator, Difficulty Evaluator, and
Campaign Builder. Open each HTML directly. See "TOOLS_USER_GUIDE.md" for the
complete workflow and parameter reference, and "USER_GUIDE.md" for detailed
game rules, scoring, Survival, and save-data instructions.

RANDOM STAGE uses the Stage Generator v0.19 core,
including all ten families and 0–2 crossings, with a bounded termination policy
and built-in campaign fallback. It does not save scores or progress.
