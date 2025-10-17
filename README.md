## ブラウザで動かしたい時

### profile の設定

sandbox という profile を作成して、名前を sandbox-dev として作成する

### build

```bash
sam build
```

### deploy

```bash
sam deploy --profile sandbox-dev
```

## ローカルで動かしたい時

### docker の起動

```bash
docker compose up
```

### local での api の起動

```bash
sam local start-api
```
