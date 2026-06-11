import { describe, expect, it } from "vitest";

import { validateTranslationCsv } from "@/lib/csv";

const VALID_CSV = `title,topic,bandLevel,englishText,vietnameseText
Daily Routine,Daily Life,6,I usually wake up at six.,Tôi thường thức dậy lúc 6 giờ.
Daily Routine,Daily Life,6,I have a cup of coffee.,Tôi uống một tách cà phê.
`;

const INVALID_CSV = `title,topic,bandLevel,englishText,vietnameseText
,Daily Life,6,I wake up,Tôi thức dậy
Daily Routine,Daily Life,12,Wake up,Thức dậy
`;

describe("validateTranslationCsv", () => {
  it("parses valid rows", () => {
    const result = validateTranslationCsv(VALID_CSV);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].title).toBe("Daily Routine");
    expect(result.rows[0].bandLevel).toBe(6);
  });

  it("flags invalid rows with row numbers", () => {
    const result = validateTranslationCsv(INVALID_CSV);

    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors.some((error) => error.rowNumber === 2)).toBe(true);
  });

  it("returns an empty result for an empty CSV", () => {
    const result = validateTranslationCsv("");

    expect(result.rows).toEqual([]);
    expect(result.totalRows).toBe(0);
  });
});
