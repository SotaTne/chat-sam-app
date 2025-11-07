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

これでログインできる

```
aws cognito-idp admin-initiate-auth \
  --user-pool-id p-northeast-1_EOU1eahPQ \
  --client-id 61vctfdhqbd6oleobao3kvv8g2 \
  --auth-flow ADMIN_NO_SRP_AUTH \  --auth-parameters USERNAME=user@example.com,PASSWORD=TempPass123! \  --region ap-northeast-1 --profile sandbox-dev
```

"Session": "AYABeLjhjoezm2HCOAjtc4_puRoAHQABAAdTZXJ2aWNlABBDb2duaXRvVXNlclBvb2xzAAEAB2F3cy1rbXMAUGFybjphd3M6a21zOmFwLW5vcnRoZWFzdC0xOjM0NjM3NzU0NDkyNzprZXkvZDNhY2NlYmQtNTdhOC00NWE0LTk1ZmEtYzc2YzY5ZDIwYTRkALgBAgEAeBO-fem9zGMtNpU3OH9rWZJ7OzzAAOuAW-bA8cVeJSXKAX_z5g-29JDWcp55aKDD_g0AAAB-MHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAyFGpeHgl5yTDFikdICARCAOzLGBORgOgRwTSUX4JmExZ0NkoBJW6ZU7JrdxXhtqSTfNFj2etujhBh9SRAR13vBa48ifUehv12t3YnjAgAAAAAMAAAQAAAAAAAAAAAAAAAAANQDDc_fL_7PFEKUMbS_gyD**\_**AAAAAQAAAAAAAAAAAAAAAQAAAPOKDERBAnVJ9Bm6tTwmidUdpycwP2oyDTSqlcT-5vLhX4xfDgzLTgZ6JRdOjAI43jFl2_ePJIz5FajRyV7h5j-LqAmTgbEbuyP-eSetyIuLSCIvEQZyjT6UCx60ZbwraeBbVjtykeBYLH7voQeYcoSv11nMw1cK0vU9_xYmV3hgC3tKZGLgAmc9vxoYTpzttJGLZNNXWWa3OXnRM6pDxluFLAdDIoMBaB9vz5kz7_nm7S_OD52OMOE5ZFR2UxrXEcheGTfmIxXrCF0K7LPI3V243TuPoRIfcEz9QWRjovXtKnOGhVjmiPuSlAnaSpU5T3CzDiHttOZJIoq0E7gRN7xfj7NH",

session を元に
