import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";

export function getIndexHandler(args: handlerArgs): APIGatewayProxyResult {
  const { params } = args;
  const defaultPage = params?.page ? parseInt(params.page) : 1;
  const perPage = params?.perPage ? parseInt(params.perPage) : 10;
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    /// @ts-ignore
    body: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Chat App</title>
  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-gray-100 p-6">
  <div class="max-w-2xl mx-auto bg-white p-4 rounded shadow">
    <h1 class="text-2xl font-bold mb-4">Chat App</h1>

    <div id="app">
      <!-- メッセージ表示 -->
      <div v-for="msg in messages" :key="msg.MessageNo" class="mb-2 border-b pb-2">
        <span class="font-bold text-blue-600">{{ msg.UserId }}</span>: {{ msg.Content }}
      </div>

      <!-- ページネーション -->
      <div class="mt-4 flex items-center space-x-2">
        <button @click="prevPage" :disabled="page <= 1" class="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">前へ</button>
        <span>Page {{ page }}</span>
        <button @click="nextPage" class="px-3 py-1 bg-gray-300 rounded">次へ</button>
      </div>

      <!-- メッセージ投稿 -->
      <div class="mt-4 flex space-x-2">
        <input v-model="newMessage" type="text" placeholder="メッセージを入力" class="flex-1 border rounded px-2 py-1" />
        <button @click="postMessage" class="px-3 py-1 bg-blue-500 text-white rounded">送信</button>
      </div>
    </div>
  </div>

  <script>
    const { createApp, ref } = Vue;

    createApp({
      setup() {
        const messages = ref([]);
        const page = ref(${defaultPage}); // 現在のページ
        const perPage = ${perPage}; // 1ページに表示する件数
        const lastNumber = ref(0);
        const newMessage = ref('');

        // ページネーション取得
        const fetchMessages = async () => {
          try {
            const res = await fetch(\`/messages?page=\${page.value}&perPage=\${perPage}\`);
            const data = await res.json();
            messages.value = data;
            if (data.length) lastNumber.value = Math.max(...data.map(m => m.MessageNo));
          } catch (err) {
            console.error('Failed to fetch messages:', err);
          }
        };

        const prevPage = () => {
          if (page.value > 1) {
            page.value--;
            fetchMessages();
          }
        };

        const nextPage = () => {
          page.value++;
          fetchMessages();
        };

        // 新着取得
        const fetchLatestMessages = async () => {
          try {
            const res = await fetch(\`/messages/latest?lastNumber=\${lastNumber.value}\`);
            const data = await res.json();
            if (data.length) {
              messages.value = [...data, ...messages.value];
              lastNumber.value = Math.max(...data.map(m => m.MessageNo));
              // perPage超えた場合は古い順に削除
              if (messages.value.length > perPage) {
                messages.value = messages.value.slice(0, perPage);
              }
            }
          } catch (err) {
            console.error('Failed to fetch latest messages:', err);
          }
        };

        // POSTメッセージ
        const postMessage = async () => {
          if (!newMessage.value.trim()) return;
          try {
            await fetch('/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: newMessage.value }),
            });
            // 投稿成功後にリダイレクト
            window.location.href = '/?page=' + page.value + '&perPage=' + perPage;
          } catch (err) {
            console.error('Failed to post message:', err);
          }
        };

        // 初回ロード
        fetchMessages();
        // 10秒ごとに最新取得
        setInterval(fetchLatestMessages, 10000);

        return { messages, page, prevPage, nextPage, newMessage, postMessage };
      }
    }).mount('#app');
  </script>
</body>
</html>
    `,
  };
}
