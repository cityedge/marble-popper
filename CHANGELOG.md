# Changelog

公開パッケージに関係する変更を記録します。開発途中の細かな履歴はGitのコミット履歴を参照してください。

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
