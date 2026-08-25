# Changelog

公開パッケージに関係する変更を記録します。開発途中の細かな履歴はGitのコミット履歴を参照してください。

## v0.42 — BASE ending sequence

- BASE到達によるゲームオーバー時に、BASE波紋とボム音を追加
- ステージクリア時も同じBASE終端演出を使用
- 両方とも0.75秒の波紋が完全に終了してから0.3秒待ち、リザルト画面へ遷移
- 終端演出中はレーン進行と射撃を停止し、リザルトBGMへの切り替えは画面遷移時に実施

## v0.41 — SPAWN / BASE terminology

- ゲーム、Stage Generator、Difficulty Evaluatorのレーン端表示を`IN` / `OUT`から`SPAWN` / `BASE`へ変更
- Campaign Builderの投入位置ヘルプと、ユーザーガイド・ツールガイド・仕様書・設計資料を同じ用語へ統一
- Stage Generator v0.19、Difficulty Evaluator v0.6、Campaign Builder v0.9を公開パッケージへ同梱
- StageSpec、CampaignSpec、セーブデータの形式は変更なし。内部実装の従来名は互換性のため維持

## v0.40 — 公開候補

- WAVE直前の射撃禁止／安定待ち状態を廃止し、タイマー終了と同時に投入開始
- 飛行弾、消去、磁力移動をWAVE投入中へそのまま引き継ぐ方式へ変更
- タイトル、各種メニュー、ステージ選択用のループBGMを追加
- 別の曲からオープニングBGMへ切り替わる際は必ず曲頭から再生
- タイトルのNEW GAMEへ常時表示されていた選択枠を廃止
- DIFFICULTY選択の不要なオレンジフォーカス枠を廃止
- CONTINUEのラベルとステージ情報を衝突しない上下2段表示へ変更
- Escキーでも一時停止／再開できるよう変更
- 手動一時停止中はゲームBGMを継続し、TITLEへ戻ると一時停止状態を解除
- NEW GAME確認ダイアログ由来の遅延フォーカス喪失で、開始直後に自動一時停止する問題を修正
- NEW GAME確認ダイアログ後の古い描画時刻で負のフレーム時間が発生し、初回WAVE・特殊効果・OUT演出が壊れる問題を修正
- ユーザーガイドへF11全画面表示の推奨を追加

## v0.39 — 公開候補

- 100ステージのGameplayProfile v5キャンペーンを内蔵
- ニューゲーム、コンティニュー、難易度別進行、面別ハイスコアを実装
- サバイバルモードとステージ別の生存時間／スコア記録を実装
- StageSpec、Stage Bundle、Evaluated Bundle、v5 Campaignのステージテスト読込に対応
- 読み込んだv5キャンペーンを、そのセッションのメイン／サバイバルへ適用可能
- ポータブルなプレイヤーセーブの書き出しと統合読み込みを実装
- WAVE、WAVE CLEAR BONUS、Safety Bonus、スコア明細を実装
- 通常、パニック、ステージクリア、ゲームオーバーのBGMと音量設定を実装
- 公開パッケージへGenerator v0.18、Evaluator v0.5、Campaign Builder v0.8を同梱
- オフライン起動とGitHub Pages公開の両方に対応する配布構成を追加
- プレイヤーガイド、制作ツールガイド、MIT License、公開手順を追加

## 制作ツール

- Stage Generator v0.18: 目標長6000px、許容差800px、Simplify 72、Vertical Flip Random 50%を公開既定値化
- Difficulty Evaluator v0.5: StageSpec v1/v2の形状難易度評価、ファミリー内順位、CSV／評価済みバンドル出力
- Campaign Builder v0.8: 10ステージ固定ティア、GameplayProfile v5、ティア設定の保存／読込、既存キャンペーン再編集
