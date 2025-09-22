import kuromoji from "kuromoji";

export class TextProcessor {
  private tokenizer!: (text: string) => string[];

  // 初期化
  async init(dicPath = "node_modules/kuromoji/dict") {
    this.tokenizer = await new Promise<(text: string) => string[]>(
      (resolve, reject) => {
        kuromoji.builder({ dicPath }).build((err, tokenizer) => {
          if (err) return reject(err);
          resolve((text: string) =>
            tokenizer.tokenize(text).map((t) => t.surface_form)
          );
        });
      }
    );
  }

  // トークン化
  tokenize(text: string): string[] {
    if (!this.tokenizer)
      throw new Error("Tokenizer not initialized. Call init() first.");
    return this.tokenizer(text);
  }

  // 頻出語カウント
  countFrequencies(texts: string[]): Record<string, number> {
    const freq: Record<string, number> = {};
    for (const t of texts) {
      const tokens = this.tokenize(t);
      for (const tok of tokens) {
        freq[tok] = (freq[tok] ?? 0) + 1;
      }
    }
    return freq;
  }

  // マルコフ連鎖モデル作成
  buildMarkov(texts: string[]): Record<string, string[]> {
    const model: Record<string, string[]> = {};
    for (const t of texts) {
      const tokens = this.tokenize(t);
      let prev = "__START__";
      for (const tok of tokens) {
        (model[prev] ??= []).push(tok);
        prev = tok;
      }
      (model[prev] ??= []).push("__END__");
    }
    return model;
  }

  // マルコフ連鎖で生成
  generateFromMarkov(model: Record<string, string[]>, maxLen = 30): string {
    let token = "__START__";
    const out: string[] = [];
    for (let i = 0; i < maxLen; i++) {
      const arr = model[token];
      if (!arr) break;
      const next = arr[Math.floor(Math.random() * arr.length)];
      if (next === "__END__") break;
      out.push(next);
      token = next;
    }
    return out.join("");
  }

  // 生成まで行う
  execute(texts: string[]) {
    const model = this.buildMarkov(texts);
    const message = this.generateFromMarkov(model);
    return message;
  }
}
