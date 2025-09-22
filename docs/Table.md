## 修正版 DynamoDB テーブル設計

### 1. **GeneratedMessages**

Step Functions によって定期的に生成されるメッセージやグラフ情報を保持。

- **Partition Key**: `GeneratedMessageId` (string, UUID)
- **Attributes**:
  - `Content` (string, max 2048) → Bot が投稿した本文
  - `CreatedAt` (number, epoch timestamp) → この Bot メッセージ自体の作成時刻
  - `StartAt` (number, epoch timestamp) → 集計対象期間の開始時刻
  - `EndAt` (number, epoch timestamp) → 集計対象期間の終了時刻
  - `Type` (string, e.g. "summary", "random", "stat")
  - `GraphRef` (string, optional, S3 のキーなど)

👉 例: 「2025-09-20 00:00〜06:00 の投稿を集計した Bot メッセージ」  
👉 クライアント側では「どの時間帯をまとめた Bot メッセージか」を表示できる。

---

### 2. **Messages テーブル**

- **MessageNo (PK, Number)** … 通し番号（自動インクリメント）
- UserId
- Content (max 2048, XSS フィルタ済み)
- CreatedAt (timestamp)

👉 ページングは `MessageNo` の範囲指定で可能

---

### 3. **Sessions**

匿名ユーザーを識別するためのセッション情報を保持。

- **Partition Key**: `SessionId` (string, UUID)
- **Attributes**:
  - `ExpirationDate` (number, epoch timestamp, TTL で自動削除)
  - `CreatedAt` (number, epoch timestamp)

---

## ポイント

- `GeneratedMessages` の `StartAt` / `EndAt` を入れることで「集計期間」と「Bot 投稿」がリンクできる
- これにより後から「どの時間帯を対象に生成した Bot か」が分かり、  
   可視化や再集計時の検証にも使える
- DynamoDB 的にも単純な属性追加なので負荷は増えない
