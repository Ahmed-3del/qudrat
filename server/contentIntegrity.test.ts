import { describe, expect, it } from "vitest";
import { doorZeroQuestions } from "../client/src/data/door0Data";
import { doorOneQuestions } from "../client/src/data/door1Data";
import { doorTwoQuestions } from "../client/src/data/door2Data";
import { doorThreeQuestions } from "../client/src/data/door3Data";
import { lawCards } from "../client/src/data/lawsData";

const banks = [doorZeroQuestions, doorOneQuestions, doorTwoQuestions, doorThreeQuestions];

describe("content integrity", () => {
  it("keeps every question complete and answer indexes valid", () => {
    for (const bank of banks) {
      expect(bank.length).toBeGreaterThan(0);
      for (const question of bank) {
        expect(question.id).toMatch(/^d[0-3]-q-\d+$/);
        expect(question.question.trim()).not.toBe("");
        expect(question.options).toHaveLength(4);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(question.options.length);
        expect(question.solution.trim()).not.toBe("");
        expect(question.sourcePage).toBeGreaterThan(0);
        expect(question.lessonTitle.trim()).not.toBe("");
      }
    }
  });

  it("keeps the laws summary populated and uniquely titled", () => {
    expect(lawCards.length).toBeGreaterThan(0);
    expect(new Set(lawCards.map((law) => law.title)).size).toBe(lawCards.length);
    for (const law of lawCards) {
      expect(law.title.trim()).not.toBe("");
      expect(law.rule.trim()).not.toBe("");
    }
  });
});
