import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";

export function getIndexHandler(args: handlerArgs): APIGatewayProxyResult {
  const { params } = args;
  const defaultPage = params?.page ? parseInt(params.page) : 1;
  const perPage = params?.perPage ? parseInt(params.perPage) : 10;
  const authHeader = args.header["Authorization"] || "";
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
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
  <div class="max-w-4xl mx-auto bg-white p-4 rounded shadow">
    <h1 class="text-3xl font-bold mb-6">Chat App</h1>

    <div id="app">
      <!-- タブナビゲーション -->
      <div class="mb-6 border-b">
        <nav class="flex space-x-8">
          <button @click="activeTab = 'chat'" :class="tabClass('chat')" class="py-2 px-1 border-b-2 font-medium text-sm">
            チャット
          </button>
          <button @click="activeTab = 'info'" :class="tabClass('info')" class="py-2 px-1 border-b-2 font-medium text-sm">
            統計情報
          </button>
        </nav>
      </div>

      <!-- チャットタブ -->
      <div v-show="activeTab === 'chat'">
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

      <!-- 統計情報タブ -->
      <div v-show="activeTab === 'info'">
        <div class="mb-4">
          <button @click="fetchCounterData" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            統計データを更新
          </button>
        </div>

        <!-- ローディング表示 -->
        <div v-if="loading" class="text-center py-4">
          <span class="text-gray-500">読み込み中...</span>
        </div>

        <!-- 統計データ表示 -->
        <div v-else-if="counterData.length > 0" class="space-y-4">
          <div v-for="(item, index) in counterData" :key="index" class="border rounded-lg p-4 bg-gray-50">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <h4 class="font-semibold text-gray-600">期間ID</h4>
                <p class="text-sm">{{ item.range.RecordId }}</p>
              </div>
              <div>
                <h4 class="font-semibold text-gray-600">メッセージ数</h4>
                <p class="text-xl font-bold text-blue-600">{{ item.range.MessageCount }}</p>
              </div>
              <div>
                <h4 class="font-semibold text-gray-600">ユーザー数</h4>
                <p class="text-xl font-bold text-green-600">{{ item.range.UserCount }}</p>
              </div>
              <div>
                <h4 class="font-semibold text-gray-600">集計期間</h4>
                <p class="text-sm">{{ formatTimestamp(item.range.Start) }}</p>
                <p class="text-sm">{{ formatTimestamp(item.range.End) }}</p>
              </div>
            </div>
            
            <!-- 詳細ボタン -->
            <button @click="toggleDetails(index)" class="text-blue-500 hover:text-blue-700 text-sm">
              {{ showDetails[index] ? '詳細を隠す' : '詳細を表示' }}
            </button>
            
            <!-- メッセージ詳細 -->
            <div v-show="showDetails[index]" class="mt-4 border-t pt-4">
              <h5 class="font-semibold mb-2">この期間のメッセージ:</h5>
              <div v-if="item.messages.length > 0" class="space-y-2 max-h-40 overflow-y-auto">
                <div v-for="msg in item.messages" :key="msg.MessageNo" class="text-sm bg-white p-2 rounded border">
                  <span class="font-medium text-blue-600">{{ msg.UserId }}</span>: {{ msg.Content }}
                  <span class="text-gray-400 text-xs ml-2">({{ formatTimestamp(msg.CreatedAt) }})</span>
                </div>
              </div>
              <p v-else class="text-gray-500 text-sm">この期間にメッセージはありません</p>
            </div>
          </div>
        </div>

        <!-- データなし表示 -->
        <div v-else class="text-center py-8">
          <p class="text-gray-500">統計データがありません</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    const { createApp, ref, reactive } = Vue;

    createApp({
      setup() {
        const messages = ref([]);
        const page = ref(${defaultPage});
        const perPage = ${perPage};
        const headers = {
          'Authorization': '${authHeader}'
        };
        const lastNumber = ref(0);
        const newMessage = ref('');
        const activeTab = ref('chat'); // タブ管理
        const counterData = ref([]); // 統計データ
        const loading = ref(false);
        const showDetails = reactive({}); // 詳細表示状態

        // タブクラス
        const tabClass = (tab) => {
          return activeTab.value === tab 
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
        };

        // 統計データ取得
        const fetchCounterData = async () => {
          loading.value = true;
          try {
            const res = await fetch('/Prod/message-counter', {
              headers: headers  // ← 認証ヘッダーを追加
            });
            const data = await res.json();
            counterData.value = data;
            console.log('Counter data fetched:', data);
          } catch (err) {
            console.error('Failed to fetch counter data:', err);
            alert('統計データの取得に失敗しました');
          } finally {
            loading.value = false;
          }
        };

        // 詳細表示切り替え
        const toggleDetails = (index) => {
          showDetails[index] = !showDetails[index];
        };

        // タイムスタンプフォーマット
        const formatTimestamp = (timestamp) => {
          return new Date(timestamp * 1000).toLocaleString('ja-JP');
        };

        // 既存のメッセージ関連関数
        const fetchMessages = async () => {
          try {
            const res = await fetch(\`/Prod/messages?page=\${page.value}&perPage=\${perPage}\`, {
              headers: headers  // ← 認証ヘッダーを追加
            });
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

        const fetchLatestMessages = async () => {
          if (activeTab.value !== 'chat') return; // チャットタブでない時は更新しない
          try {
            const res = await fetch(\`/Prod/messages/latest?lastNumber=\${lastNumber.value}\`, {
              headers: headers  // ← 認証ヘッダーを追加
            });
            const data = await res.json();
            if (data.length) {
              messages.value = [...data, ...messages.value];
              lastNumber.value = Math.max(...data.map(m => m.MessageNo));
              if (messages.value.length > perPage) {
                messages.value = messages.value.slice(0, perPage);
              }
            }
          } catch (err) {
            console.error('Failed to fetch latest messages:', err);
          }
        };

        const postMessage = async () => {
          if (!newMessage.value.trim()) return;
          try {
            await fetch('/Prod/messages', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': headers.Authorization  // ← 認証ヘッダーを追加
              },
              body: JSON.stringify({ contents: newMessage.value }),
            });
            window.location.href = '/Prod/?page=' + page.value + '&perPage=' + perPage;
          } catch (err) {
            console.error('Failed to post message:', err);
          }
        };

        // 初回ロード
        fetchMessages();
        setInterval(fetchLatestMessages, 10000);

        return { 
          messages, page, prevPage, nextPage, newMessage, postMessage,
          activeTab, counterData, loading, showDetails,
          tabClass, fetchCounterData, toggleDetails, formatTimestamp
        };
      }
    }).mount('#app');
  </script>
</body>
</html>
    `,
  };
}
