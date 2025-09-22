import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // describe/it/expect をグローバルで使用可能に
    environment: "node", // Node.js 環境でテスト
    include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"], // テストファイルの場所
    clearMocks: true, // beforeEach で自動クリア
  },
});
