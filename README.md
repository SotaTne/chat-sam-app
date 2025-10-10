### 1. AWS 認証情報（ダミー）の作成

ホームディレクトリに `~/.aws/credentials` を作り、LocalStack 用にダミー情報を追加：

```ini
[localstack]
aws_access_key_id = dummy
aws_secret_access_key = dummy
```

---

### 2. SAM Local（samlocal）インストール

Python の `pip` でインストール：

```bash
uv pip install -r requirements.txt
```

これで `samlocal` コマンドが使えるようになります。

### 3. samlocal へのデプロイ

docker を起動してから samlocal にデプロイできます

```bash
docker compose up -d
```

```bash
samlocal deploy --config-file samconfig.localstack.toml
```
