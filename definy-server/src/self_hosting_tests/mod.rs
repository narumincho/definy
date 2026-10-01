//! definy のセルフホスティング機能に関する統合テストスイート。
//!
//! - `ast_structure_tests`: 各ビルトインパーツの登録検証および静的 AST 構造検証テスト。
//! - `execution_tests`: メタ循環評価、型検査、パーツ妥当性検証、Wasm コンパイル・実行などの動的実行実証テスト。
//! - `helpers`: テスト用イベント・モジュール生成関数、AST 構築ヘルパーを集約した共通モジュール。

mod ast_structure_tests;
mod execution_tests;
mod helpers;
mod list_tests;
mod part_reference_tests;
mod record_tests;
mod union_tests;
mod validator_tests;
mod wasi_tests;
