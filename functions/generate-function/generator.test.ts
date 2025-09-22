import { describe, it, expect, beforeAll } from "vitest";
import { TextProcessor } from "./generator";

describe("TextProcessor", () => {
  let processor: TextProcessor;
  const texts = [
    "今日はいい天気ですね。散歩に行きたい。",
    "散歩良いですね。犬も連れて行きますか？",
    "仕事がたくさんある…でもコーヒー飲みたい。",
  ];

  beforeAll(async () => {
    processor = new TextProcessor();
    await processor.init();
  });

  it("tokenize returns array of strings", () => {
    const tokens = processor.tokenize("散歩に行きたい。");
    expect(tokens).toBeInstanceOf(Array);
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("countFrequencies returns correct counts", () => {
    const freq = processor.countFrequencies(texts);
    expect(freq).toHaveProperty("散歩");
    expect(freq["散歩"]).toBeGreaterThanOrEqual(2);
  });

  it("buildMarkov returns model containing __START__ key", () => {
    const model = processor.buildMarkov(texts);
    expect(model).toHaveProperty("__START__");
    expect(model["__START__"].length).toBeGreaterThan(0);
  });

  it("generateFromMarkov returns a string", () => {
    const model = processor.buildMarkov(texts);
    const generated = processor.generateFromMarkov(model, 20);
    expect(typeof generated).toBe("string");
    expect(generated.length).toBeGreaterThan(0);
  });
});
