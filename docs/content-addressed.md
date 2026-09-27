# コンテンツアドレスとバージョン管理 (Content-Addressed Code & Version Control)

definy におけるコードのコンテンツアドレス化（Content-Addressed）および Git ライクなバージョン管理・依存固定の仕様。

## 1. 背景と課題

従来は、パーツの作成イベント（`PartDefinitionEvent`）に署名と作成日時・アカウントIDを付与したバイナリのハッシュ（`EventHashId`）をパーツの識別子としていた。
これにより以下の課題が生じていた：

1. **暗黙の最新追跡（依存が固定されない）**:
   - 式が `part_definition_event_hash` を参照していると、そのパーツが更新（`PartUpdateEvent`）された際に自動的に最新のコードが使われ、呼び出し側が破壊される恐れがある。
2. **コード同一性の歪み**:
   - 署名や作成日時がハッシュに含まれるため、全く同じロジックの関数であっても作者や時刻が異なると別ハッシュになり、分散キャッシュや重複排除が効かない。

これらを解消し、**「Git のようなバージョン管理」** と **「依存バージョンの厳密な固定」** を実現するため、3 層のアーキテクチャに整理する。

---

## 2. 3層アーキテクチャ

```mermaid
graph TD
  subgraph レイヤー3: 履歴・署名 (Commit / Event)
    commit[コミット / リリースイベント]
    commit -->|署名 + 作者 + 日時 + 親コミット| tree
  end

  subgraph レイヤー2: 名前空間・モジュール (Tree)
    tree[モジュールスナップショット]
    tree -->|"main"| expr1[コンテンツハッシュ #abc]
    tree -->|"add"| expr2[コンテンツハッシュ #def]
  end

  subgraph レイヤー1: 純粋なコード (Blob / AST)
    expr1 -->|内部参照 #def| expr2
  end
```

### レイヤー 1: コンテンツ層 (Blob / AST)
- **対象**: 式 (`Expression`), 型 (`PartType`)
- **ハッシュ**: 署名・作者・日時・パーツ名を含まない、**純粋な AST バイナリ（正規化 CBOR）の SHA-256 ハッシュ (`ContentHash`)**。
- **不変性**: 内容が同じであれば、世界中誰が書いても同一ハッシュとなる。
- **依存固定**: 式内の参照（`PartReference`）は `ContentHash` を直接指すため、参照先の挙動は未来永劫変わらない（**完全な依存固定**）。

### レイヤー 2: モジュール・名前空間層 (Tree)
- **対象**: モジュール内のパーツ定義一覧
- **データ構造**: パーツ名と `ContentHash` の対応マップ（例: `{ "add": #def, "main": #abc }`）。
- **特徴**: Git の Tree オブジェクトに相当し、ある時点のプロジェクト・モジュール全体のコード構成を不変に表現する。

### レイヤー 3: 履歴・署名層 (Commit / Event)
- **対象**: コミット、リリースタグ、ブランチ更新
- **署名**: Ed25519 署名、`AccountId`、タイムスタンプ、親コミットハッシュを付与。
- **役割**: 「誰が」「いつ」「どのツリー（バージョン）をコミット/公開したか」という改ざん不可能な監査ログ・同期を担う。

---

## 3. 依存固定とアップデートのワークフロー

1. **パーツ作成・編集時**:
   - 編集中の式は、その時点で参照しているパーツの `ContentHash` を保持する。
2. **参照先パーツが更新されたとき**:
   - 参照先パーツに新しいバージョン（新しい `ContentHash`）が公開されても、参照元のパーツは自動更新されず、壊れない。
3. **明示的な依存更新 (Upgrade)**:
   - UI 上で「依存パーツに新しいバージョンがあります [更新]」と提示され、開発者が明示的に操作したときだけ新しい `ContentHash` に切り替わる。

---

## 4. モジュールコミットによる複数パーツの一括送信 (ModuleCommitEvent)

従来はパーツを 1 つ作成・更新するたびに `PartDefinitionEvent` や `PartUpdateEvent` を個別に送信していた。
これを Git のコミットモデルに移行し、**`ModuleCommitEvent`** によってモジュール内の複数のパーツ定義（Tree）を 1 つの署名付きイベントとして一度に送信・公開する。

```rust
pub struct ModuleCommitEvent {
    pub module_definition_event_hash: EventHashId,
    pub parent_commit_hash: Option<EventHashId>,
    pub message: Box<str>,
    pub parts: Vec<ModulePartEntry>,
}

pub struct ModulePartEntry {
    pub name: Box<str>,
    pub part_type: Option<PartType>,
    pub description: Description,
    pub expression: Option<Expression>,
}
```

- **アトミック性**: 関連する複数パーツ（例: 基本関数とそれを呼び出すメイン処理）が不可分に 1 回でコミット・確定される。
- **1回の一括署名・送信**: パーツが何個あっても、コミットイベント 1 個分の署名と通信だけで完了する。
- **履歴追跡**: `parent_commit_hash` により、Git のコミットグラフと同様にプロジェクト全体の変更履歴を線形またはブランチとして辿ることができる。

---

## 5. 移行ロードマップ

- **フェーズ 1**: `ContentHash` 型と、純粋な `Expression` / `PartType` からハッシュを計算する関数の実装 (`definy-event`)。(完了)
- **フェーズ 2**: `PartReferenceExpression` での `ContentHash` 依存バージョン固定・解決・UI アップグレードの実装。(完了)
- **フェーズ 3**: `ModuleCommitEvent`（複数パーツ一括送信・Tree 型コミット）の定義とプロジェクション・評価器の対応。(進行中)
- **フェーズ 4**: UI 上でのステージング・一括コミット送信画面の統合。

