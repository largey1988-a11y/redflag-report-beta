(function () {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round50 = (value) => Math.round(value / 50) * 50;

  function signal(category, label, points, reason, confidence, source) {
    return { category, label, points, reason, confidence, source };
  }

  function findProfile(vehicle = {}) {
    const make = String(vehicle.make || "").toUpperCase();
    const model = String(vehicle.model || "").toUpperCase();
    const fuelType = String(vehicle.fuelType || "").toUpperCase();
    const year = Number(vehicle.year || 0);
    return Object.values(globalThis.RED_FLAG_MODELS).find((profile) => {
      const match = profile.match;
      return (!match.make || make.includes(match.make))
        && (!match.model || model.includes(match.model))
        && (!match.fuelType || fuelType.includes(match.fuelType))
        && (!match.yearFrom || year >= match.yearFrom)
        && (!match.yearTo || year <= match.yearTo);
    }) || globalThis.GENERIC_MODEL_PROFILE;
  }

  function scoreReport({ profile, listing, mot = {}, recall = null }) {
    const signals = [];
    const { fairLow, fairHigh, benchmarkMileage, mileageValuePer1000 } = profile.market;
    const askingPrice = Number(listing.askingPrice);
    const mileage = Number(listing.mileage);

    if (!fairHigh) signals.push(signal("Price", "Valuation unavailable", 0, "No model-specific valuation benchmark is available yet.", "unverified", "Unavailable"));
    else if (askingPrice > fairHigh) signals.push(signal("Price", "Above market range", -8, `Asking price is £${askingPrice - fairHigh} above the researched range.`, "estimate", "Market estimate"));
    else if (askingPrice < fairLow) signals.push(signal("Price", "Attractive asking price", 4, `Asking price is £${fairLow - askingPrice} below the researched range.`, "estimate", "Market estimate"));
    else signals.push(signal("Price", "Within market range", 0, "Asking price sits inside the researched range.", "estimate", "Market estimate"));

    const historySignals = {
      full: signal("History", "Full service history", 3, "Documented maintenance reduces uncertainty.", "user", "Seller information"),
      partial: signal("History", "Partial service history", -5, "Some scheduled maintenance cannot be verified.", "user", "Seller information"),
      none: signal("History", "No service history shown", -12, "Maintenance and mileage history cannot be supported.", "user", "Seller information"),
      unknown: signal("History", "History not confirmed", -7, "Service evidence must be checked before purchase.", "user", "Seller information"),
    };
    signals.push(historySignals[listing.serviceHistory]);

    if (listing.sellerType === "auction") signals.push(signal("Buying context", "Auction purchase", -6, "Inspection and comeback options may be limited.", "user", "Buyer input"));
    if (listing.sellerType === "dealer") signals.push(signal("Buying context", "Dealer purchase", 1, "Consumer protections may reduce purchase risk.", "user", "Buyer input"));

    const relevantFaults = profile.faults.filter((fault) => mileage >= fault.mileageFrom && mileage <= fault.mileageTo);
    relevantFaults.forEach((fault) => {
      signals.push(signal("Model risk", fault.title, -fault.scoreImpact, `${Math.round(fault.likelihood * 100)}% research likelihood in this mileage window; potential cost £${fault.costLow}–£${fault.costHigh}.`, profile.confidence, "Model-risk research"));
    });

    if (mot.passRate != null) {
      const delta = mot.passRate - profile.motBenchmark;
      if (delta >= 5) signals.push(signal("MOT", "Above-average MOT record", 5, `${mot.passRate}% pass rate is ${delta} points above benchmark.`, "official", "DVSA MOT history"));
      else if (delta <= -10) signals.push(signal("MOT", "Weak MOT record", -10, `${mot.passRate}% pass rate is ${Math.abs(delta)} points below benchmark.`, "official", "DVSA MOT history"));
    } else {
      signals.push(signal("MOT", "MOT evidence unavailable", -2, "The MOT contribution is limited until official data is available.", "unverified", "Unavailable"));
    }

    if (recall === true) signals.push(signal("Recall", "Outstanding recall", -15, "An outstanding safety recall requires action.", "official", "DVSA recall record"));
    else if (recall === false) signals.push(signal("Recall", "No recall recorded", 3, "No outstanding recall appears in the available record.", "official", "DVSA recall record"));

    if (mileage > benchmarkMileage + 15000) signals.push(signal("Mileage", "Higher-than-benchmark mileage", -4, "Mileage is materially above the valuation benchmark.", "user", "Advert information"));

    const score = clamp(85 + signals.reduce((total, item) => total + item.points, 0), 20, 95);
    const deductions = signals.filter((item) => item.points < 0).sort((a, b) => a.points - b.points);
    const positives = signals.filter((item) => item.points > 0).sort((a, b) => b.points - a.points);
    const dataConfidence = mot.passRate != null ? "High" : "Medium";
    const targetBase = fairHigh ? Math.min(askingPrice - 200, fairHigh - 300) : askingPrice - 500;
    const historyAdjustment = { full: 0, partial: -250, none: -600, unknown: -350 }[listing.serviceHistory];
    const sellerAdjustment = { dealer: 0, private: -150, auction: -450 }[listing.sellerType];
    const mileageAdjustment = Math.round((benchmarkMileage - mileage) / 1000) * mileageValuePer1000;
    const target = Math.max(500, round50(targetBase + historyAdjustment + sellerAdjustment + mileageAdjustment));

    return {
      score,
      verdict: score >= 80 ? "Strong candidate" : score >= 68 ? "Worth considering" : score >= 55 ? "Inspect closely" : "Proceed with caution",
      verdictTone: score >= 68 ? "positive" : score >= 55 ? "caution" : "risk",
      signals,
      deductions,
      positives,
      relevantFaults,
      target,
      pricePosition: !fairHigh ? "Unverified" : askingPrice > fairHigh ? "High" : askingPrice < fairLow ? "Attractive" : "Fair",
      dataConfidence,
    };
  }

  globalThis.RedFlagScoring = { scoreReport, findProfile };
})();
