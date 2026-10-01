import { describe, expect, it } from "vitest";
import { suggestKey } from "./project-key";

describe("suggestKey", () => {
  it("uppercases and strips accents, spaces and punctuation", () => {
    expect(suggestKey("Forge")).toBe("FORGE");
    expect(suggestKey("Café Ñandú")).toBe("CAFEN");
    expect(suggestKey("a b-c")).toBe("ABC");
  });
  it("never starts with a digit and is capped at five characters", () => {
    expect(suggestKey("2024 Roadmap")).toBe("ROADM");
    expect(suggestKey("1234")).toBe("");
    expect(suggestKey("Website redesign")).toBe("WEBSI");
  });
});
