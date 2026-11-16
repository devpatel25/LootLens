import { describe, expect, it } from "vitest";
import { TRUST_MIN_PHOTO_REVIEWS, TRUST_MIN_RATING } from "@/lib/pricing";
import { storeLabel, trustReasonText, trustReasonsSentence } from "@/lib/trust";

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

  it("can start with a capital for use as a sentence", () => {
    expect(trustReasonsSentence(["no_https", "low_rating"], { capitalize: true })).toBe("No HTTPS and rating under 3.5");
  });
});

describe("storeLabel", () => {
  it("adds (fictional) only when the store is fictional and its name does not say so", () => {
    expect(storeLabel({ name: "KickSwap", fictional: true })).toBe("KickSwap (fictional)");
    expect(storeLabel({ name: "KickSwap (fictional demo store)", fictional: true })).toBe("KickSwap (fictional demo store)");
    expect(storeLabel({ name: "Target", fictional: false })).toBe("Target");
  });
});
