# 📘 API 設計

## 1. メッセージのページング取得

### エンドポイント

```
GET /messages
```

### リクエストパラメータ

| パラメータ | 型     | 必須 | 説明                                            |
| ---------- | ------ | ---- | ----------------------------------------------- |
| page       | number | 任意 | 取得したいページ番号（最新=1）                  |
| limit      | number | 任意 | 1 ページあたりの件数（デフォルト=50, 最大=100） |

### レスポンス

```json
{
  "items": [
    {
      "messageNo": 9999,
      "userName": "Alice",
      "content": "Hello, world!",
      "createdAt": "2025-09-22T12:34:56Z"
    },
    {
      "messageNo": 9998,
      "userName": "Bob",
      "content": "Hi Alice!",
      "createdAt": "2025-09-22T12:35:10Z"
    }
  ],
  "page": 1,
  "limit": 50,
  "totalMessages": 10000
}
```

---

## 2. メッセージ送信

### エンドポイント

```
POST /messages
```

### リクエストボディ

```json
{
  "sessionId": "abcdef-123456",
  "content": "新しいメッセージです！"
}
```

### バリデーション

- `sessionId` が有効（Sessions テーブルに存在かつ未期限切れ）であること
- `content` は最大 2048 文字まで
- script タグなど危険な HTML をフィルタリング

### レスポンス

```json
{
  "messageNo": 10001,
  "userName": "Alice",
  "content": "新しいメッセージです！",
  "createdAt": "2025-09-22T13:00:00Z"
}
```

---

## 3. メッセージ受信（1 秒ごとのポーリング）

### エンドポイント

```
GET /messages/latest?after=10000
```

### リクエストパラメータ

| パラメータ | 型     | 必須 | 説明                                      |
| ---------- | ------ | ---- | ----------------------------------------- |
| after      | number | 任意 | この MessageNo より新しいメッセージを取得 |

### レスポンス

```json
{
  "items": [
    {
      "messageNo": 10001,
      "userName": "Charlie",
      "content": "やっほー",
      "createdAt": "2025-09-22T13:01:10Z"
    }
  ]
}
```

---

## 4. /index ページ公開

### エンドポイント

```
GET /
```

### 説明

- 静的 HTML/JS/CSS を返す（フロントエンド）
- ログイン不要で表示可能
- ページ内で `/messages` API を叩き、掲示板形式で表示

---

## 5. 今回は含まない（ログイン関連）

- 今回の段階ではログイン API は設計対象外
- SessionId は直接保存・利用する想定

---

✅ まとめると、サーバーで必要なのは：

- **/messages（GET, POST, latest GET）**
- **/** （フロントの静的ページ配信）
