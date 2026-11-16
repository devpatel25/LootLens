import { describe, expect, it } from "vitest";
import { TRUST_MIN_PHOTO_REVIEWS, TRUST_MIN_RATING } from "@/lib/pricing";
import { trustReasonText, trustReasonsSentence } from "@/lib/trust";

describe("trust wording", () => {
  it("names each reason with the thresholds from lib/pricing", () => {
    expect(trustReasonText("no_https")).toBe("no HTTPS");
    expect(trustReasonText("few_photo_reviews")).toBe(`under ${TRUST_MIN_PHOTO_REVIEWS} photo reviews`);
    expect(trustReasonText("low_rating")).toBe(`rating under ${TRUST_MIN_RATING}`);
  });

  it("joins reasons into one readable sentence", () => {
    expect(trustReasonsSentence(["no_https"])).toBe("no HTTPS");
    expect(trustReasonsSentence(["no_https", "low_rating"])).toBe("no HTTPS and rating under 3.5");
    expect(trustReasonsSentence(["no_https", "few_photo_reviews", "low_rating"])).toBe(
      "no HTTPS, under 20 photo reviews, and rating under 3.5",
    );
    expect(trustReasonsSentence([])).toBe("");
  });
});
