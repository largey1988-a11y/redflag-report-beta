if (!globalThis.DEFAULT_MODEL_PROFILE) {
  globalThis.DEFAULT_MODEL_PROFILE = {
    confidence: "researched",
    market: { fairLow: 9400, fairHigh: 10300, benchmarkMileage: 64200, mileageValuePer1000: 45 },
    motBenchmark: 72,
    faults: [
      { title: "Water pump and thermostat housing", severity: "high", mileageFrom: 50000, mileageTo: 80000, likelihood: 0.62, costLow: 650, costHigh: 900, scoreImpact: 8 },
      { title: "Infotainment freezes", severity: "medium", mileageFrom: 0, mileageTo: 150000, likelihood: 0.32, costLow: 120, costHigh: 750, scoreImpact: 3 },
      { title: "Rear shock absorber mounts", severity: "medium", mileageFrom: 55000, mileageTo: 110000, likelihood: 0.28, costLow: 180, costHigh: 320, scoreImpact: 3 },
      { title: "Air-conditioning condenser", severity: "low", mileageFrom: 30000, mileageTo: 150000, likelihood: 0.22, costLow: 400, costHigh: 600, scoreImpact: 2 },
    ],
  };
}

if (!globalThis.RedFlagScoring) {
  globalThis.RedFlagScoring = {
    findProfile: () => globalThis.DEFAULT_MODEL_PROFILE,
    scoreReport({ profile, listing, mot = {}, recall = null }) {
      const factors = [];
      const add = (label, points, reason, source = "Model-risk research", confidence = "researched") => factors.push({ label, points, reason, source, confidence });
      const { fairLow, fairHigh, benchmarkMileage, mileageValuePer1000 } = profile.market;
      if (listing.askingPrice > fairHigh) add("Above market range", -8, `Asking price is £${listing.askingPrice - fairHigh} above the researched range.`, "Market estimate", "estimate");
      else if (listing.askingPrice < fairLow) add("Attractive asking price", 4, `Asking price is £${fairLow - listing.askingPrice} below the researched range.`, "Market estimate", "estimate");
      else add("Within market range", 0, "Asking price sits inside the researched range.", "Market estimate", "estimate");
      const history = {
        full: ["Full service history", 3, "Documented maintenance reduces uncertainty."],
        partial: ["Partial service history", -5, "Some scheduled maintenance cannot be verified."],
        none: ["No service history shown", -12, "Maintenance and mileage history cannot be supported."],
        unknown: ["History not confirmed", -7, "Service evidence must be checked before purchase."],
      }[listing.serviceHistory];
      add(history[0], history[1], history[2], "Seller information", "user");
      if (listing.sellerType === "auction") add("Auction purchase", -6, "Inspection and comeback options may be limited.", "Buyer input", "user");
      if (listing.sellerType === "dealer") add("Dealer purchase", 1, "Consumer protections may reduce purchase risk.", "Buyer input", "user");
      const relevantFaults = profile.faults.filter((fault) => listing.mileage >= fault.mileageFrom && listing.mileage <= fault.mileageTo);
      relevantFaults.forEach((fault) => add(fault.title, -fault.scoreImpact, `${Math.round(fault.likelihood * 100)}% research likelihood in this mileage window; potential cost £${fault.costLow}–£${fault.costHigh}.`));
      if (mot.passRate != null && mot.passRate - profile.motBenchmark >= 5) add("Above-average MOT record", 5, `${mot.passRate}% pass rate is above benchmark.`, "DVSA MOT history", "official");
      if (recall === false) add("No recall recorded", 3, "No outstanding recall appears in the available record.", "DVSA recall record", "official");
      const score = Math.max(20, Math.min(95, 85 + factors.reduce((sum, factor) => sum + factor.points, 0)));
      const historyAdjustment = { full: 0, partial: -250, none: -600, unknown: -350 }[listing.serviceHistory];
      const sellerAdjustment = { dealer: 0, private: -150, auction: -450 }[listing.sellerType];
      const target = Math.max(500, Math.round((Math.min(listing.askingPrice - 200, fairHigh - 300) + historyAdjustment + sellerAdjustment + Math.round((benchmarkMileage - listing.mileage) / 1000) * mileageValuePer1000) / 50) * 50);
      return {
        score,
        verdict: score >= 80 ? "Strong candidate" : score >= 68 ? "Worth considering" : score >= 55 ? "Inspect closely" : "Proceed with caution",
        signals: factors,
        deductions: factors.filter((factor) => factor.points < 0).sort((a, b) => a.points - b.points),
        relevantFaults,
        target,
        pricePosition: listing.askingPrice > fairHigh ? "High" : listing.askingPrice < fairLow ? "Attractive" : "Fair",
        dataConfidence: mot.passRate != null ? "High" : "Medium",
      };
    },
  };
}

const report = document.querySelector("#report");
const form = document.querySelector("#lookup-form");
const registration = document.querySelector("#registration");
const manualSearchButton = document.querySelector("#manual-search-button");
const toast = document.querySelector("#toast");
const listingDialog = document.querySelector("#listing-details");
const manualDialog = document.querySelector("#manual-search");
let pendingLiveData = null;
let currentVehicle = { registration: "GF18 XLE", fuelType: "Petrol", trim: "1.5 TSI EVO SE" };
let currentProfile = globalThis.DEFAULT_MODEL_PROFILE;
let currentReportSnapshot = null;
const storageKey = "redflag-saved-reports";

function showReport() {
  report.classList.remove("hidden");
  setTimeout(() => report.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
}

function setStatus(message, error = false) {
  const status = document.querySelector("#lookup-status");
  status.textContent = message;
  status.classList.toggle("error", error);
}

function renderLiveReport(data) {
  const vehicle = data.vehicle || {};
  const mot = data.mot || {};
  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  document.querySelector("#vehicle-title").textContent = title || vehicle.registration;
  document.querySelector("#vehicle-summary").textContent = [
    vehicle.registration, vehicle.fuelType, vehicle.colour,
    vehicle.engineCapacity ? `${vehicle.engineCapacity}cc` : null,
  ].filter(Boolean).join(" · ");
  currentVehicle = {
    registration: vehicle.registration || "",
    fuelType: vehicle.fuelType || "",
    trim: [vehicle.engineCapacity ? `${vehicle.engineCapacity}cc` : null, vehicle.colour].filter(Boolean).join(" · "),
  };
  currentProfile = globalThis.RedFlagScoring.findProfile(vehicle);

  const passRate = mot.passRate ?? 0;
  document.querySelector("#mot-pass-rate").textContent = mot.passRate == null ? "No tests" : `${passRate}%`;
  document.querySelector("#mot-pass-detail").textContent = `${mot.testCount || 0} official MOT records`;
  document.querySelector("#mot-ring-value").textContent = mot.passRate == null ? "–" : `${passRate}%`;
  document.querySelector("#mot-ring").style.background = `conic-gradient(var(--green) ${passRate}%, #e9eee9 0)`;
  document.querySelector("#mot-tests-summary").textContent = mot.testCount ? `${mot.testCount} tests recorded` : "No tests available";

  const recall = data.recall;
  document.querySelector("#recall-status").textContent = recall === true ? "Outstanding" : recall === false ? "Clear" : "Check";
  document.querySelector("#recall-source").textContent = data.source?.mot ? "Official DVSA data" : "Confirm with maker";
  setStatus("Vehicle found. Add the advert details to personalise your report.");
  pendingLiveData = data;
  listingDialog.showModal();
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value);
}

function severityLabel(severity) {
  return severity === "high" ? "Priority" : severity === "medium" ? "Check" : "Lower";
}

function renderModelIntelligence(profile, result) {
  const faults = result.relevantFaults.length ? result.relevantFaults : profile.faults;
  const lead = faults[0];
  const priorityCount = faults.filter((item) => item.severity === "high").length;
  const exposureLow = faults.reduce((total, item) => total + item.costLow, 0);
  const exposureHigh = faults.reduce((total, item) => total + item.costHigh, 0);

  document.querySelector("#priority-risk-count").textContent = `${priorityCount} found`;
  document.querySelector("#priority-risk-detail").textContent = lead?.title || "No model-specific priority risk";
  document.querySelector("#fault-summary-title").textContent = lead ? `${priorityCount || faults.length} ${priorityCount ? "priority issue" : "issue"}${(priorityCount || faults.length) === 1 ? "" : "s"} to inspect` : "No matched model risks yet";
  document.querySelector("#fault-summary-detail").textContent = lead ? `${lead.title} is the leading concern for this mileage.` : "This model has not yet been added to the researched risk library.";
  document.querySelector("#fault-summary-cost").textContent = lead ? `${formatMoney(lead.costLow)}–${formatMoney(lead.costHigh)}` : "Unverified";
  document.querySelector("#lead-fault-severity").textContent = lead ? severityLabel(lead.severity) : "Unverified";
  document.querySelector("#lead-fault-severity").className = `severity ${lead?.severity || "low"}`;
  document.querySelector("#lead-fault-title").textContent = lead?.title || "Model intelligence unavailable";
  document.querySelector("#lead-fault-reason").textContent = lead ? `${Math.round(lead.likelihood * 100)}% research likelihood between ${lead.mileageFrom.toLocaleString("en-GB")} and ${lead.mileageTo.toLocaleString("en-GB")} miles.` : "Use the MOT record and a qualified inspection until this profile is researched.";
  document.querySelector("#lead-fault-inspect").textContent = lead?.inspect || "Arrange a professional pre-purchase inspection.";
  document.querySelector("#lead-fault-ask").textContent = lead?.ask || "Ask for complete service and repair invoices.";
  document.querySelector("#fault-detail-button").textContent = `View all ${faults.length || ""} known model faults →`;
  document.querySelector("#dynamic-inspection-guide").innerHTML = faults.slice(0, 4).map((item, index) => `
    <article class="guide-item ${item.severity === "high" ? "priority" : "caution"}">
      <div class="guide-number">${String(index + 1).padStart(2, "0")}</div>
      <div><span class="severity ${item.severity}">${severityLabel(item.severity)}</span><h4>${item.title}</h4><p>${item.inspect}</p></div>
      <strong>${formatMoney(item.costLow)}–${formatMoney(item.costHigh)}</strong>
    </article>`).join("") || `<article class="guide-item caution"><div class="guide-number">01</div><div><span class="severity low">Unverified</span><h4>Arrange a professional inspection</h4><p>No matched model profile is available yet.</p></div></article>`;
  document.querySelector(".guide-footer span").textContent = faults.length ? `${formatMoney(exposureLow)}–${formatMoney(exposureHigh)}` : "Unverified";

  detailViews["fault-detail"] = `
    <p class="eyebrow">Model intelligence</p><h2>${profile.label} known faults</h2>
    <p class="modal-intro">Prioritised by mileage relevance, likelihood and potential repair exposure. Research confidence: ${profile.confidence}.</p>
    <div class="modal-list">${faults.map((item) => `
      <article><span class="severity ${item.severity}">${severityLabel(item.severity)}</span><div><h4>${item.title}</h4><p>${item.inspect}</p><small>Ask: ${item.ask}</small></div><strong>${formatMoney(item.costLow)}–${formatMoney(item.costHigh)}</strong></article>`).join("")}</div>`;
}

function personaliseReport({ askingPrice, mileage, sellerType, serviceHistory }) {
  const fairLow = 9400;
  const fairHigh = 10300;
  const historyAdjustment = { full: 0, partial: -250, none: -600, unknown: -350 }[serviceHistory];
  const sellerAdjustment = { dealer: 0, private: -150, auction: -450 }[sellerType];
  const mileageAdjustment = Math.round((64200 - mileage) / 1000) * 45;
  const target = Math.max(500, Math.round((Math.min(askingPrice - 200, 9750) + historyAdjustment + sellerAdjustment + mileageAdjustment) / 50) * 50);

  let position = "Fair";
  let positionDetail = "Within market range";
  let priceClass = "positive";
  let score = 78;
  if (askingPrice > fairHigh) {
    position = "High";
    positionDetail = `${formatMoney(askingPrice - fairHigh)} above market range`;
    priceClass = "risk";
    score -= 8;
  } else if (askingPrice < fairLow) {
    position = "Attractive";
    positionDetail = `${formatMoney(fairLow - askingPrice)} below market range`;
    score += 4;
  }
  if (serviceHistory === "partial") score -= 5;
  if (serviceHistory === "none") score -= 12;
  if (serviceHistory === "unknown") score -= 7;
  if (sellerType === "auction") score -= 6;
  if (mileage > 70000) score -= 4;

  const historyText = {
    full: "Full documented service history supports the asking price.",
    partial: "Partial service history leaves some maintenance uncertainty.",
    none: "No service history shown is a meaningful red flag.",
    unknown: "Service history still needs to be confirmed.",
  }[serviceHistory];
  const sellerText = { dealer: "dealer", private: "private seller", auction: "auction" }[sellerType];
  const verdict = score >= 78 ? "Worth considering" : score >= 65 ? "Inspect closely" : "Proceed with caution";

  document.querySelector("#buyer-score").textContent = Math.max(40, Math.min(92, score));
  document.querySelector("#buyer-verdict").textContent = verdict;
  document.querySelector("#buyer-verdict-detail").textContent = `${historyText.split(".")[0]} · ${sellerText}`;
  document.querySelector("#vehicle-summary").textContent = [currentVehicle.trim, currentVehicle.fuelType, `${mileage.toLocaleString("en-GB")} miles`, currentVehicle.registration].filter(Boolean).join(" · ");
  document.querySelector("#negotiation-target").textContent = formatMoney(target);
  document.querySelector("#seller-asks").textContent = `Seller asks ${formatMoney(askingPrice)}`;
  document.querySelector("#price-card-target").textContent = formatMoney(target);
  document.querySelector("#price-position").textContent = position;
  document.querySelector("#price-position-detail").textContent = positionDetail;
  document.querySelector("#price-signal").className = `signal ${priceClass}`;
  document.querySelector("#personal-summary").textContent = position === "High"
    ? "A promising Golf, but the asking price needs challenging."
    : position === "Attractive"
      ? "An attractively priced Golf, subject to one priority inspection."
      : "A fairly priced Golf, but inspect the cooling system before buying.";
  document.querySelector("#personal-summary-detail").textContent = `${historyText} The main mechanical risk remains the known water-pump issue at this mileage.`;
  document.querySelector("#negotiation-advice").textContent = `Offer around ${formatMoney(target - 200)} and aim to settle near ${formatMoney(target)}. Use any cooling-system issue and gaps in service history to support your position.`;

  const sellerPercent = Math.max(2, Math.min(98, ((askingPrice - fairLow) / (fairHigh - fairLow)) * 100));
  const targetPercent = Math.max(2, Math.min(98, ((target - fairLow) / (fairHigh - fairLow)) * 100));
  document.querySelector("#seller-marker").style.left = `${sellerPercent}%`;
  document.querySelector("#seller-marker").innerHTML = `Seller<br>${formatMoney(askingPrice)}`;
  document.querySelector("#target-marker").style.left = `${targetPercent}%`;
  document.querySelector("#target-label").style.left = `${targetPercent}%`;
  document.querySelector("#target-label").innerHTML = `Target<br>${formatMoney(target)}`;
  setStatus("Personalised report ready.");
  listingDialog.close();
  showReport();
}

function runScoringEngine({ askingPrice, mileage, sellerType, serviceHistory }) {
  const profile = currentProfile;
  const mot = pendingLiveData?.mot || { passRate: 79, testCount: 6 };
  const recall = pendingLiveData?.recall ?? false;
  const result = globalThis.RedFlagScoring.scoreReport({
    profile,
    listing: { askingPrice, mileage, sellerType, serviceHistory },
    mot,
    recall,
  });
  const { fairLow, fairHigh } = profile.market;
  const historyText = {
    full: "Full documented service history supports the asking price.",
    partial: "Partial service history leaves some maintenance uncertainty.",
    none: "No service history shown is a meaningful red flag.",
    unknown: "Service history still needs to be confirmed.",
  }[serviceHistory];
  const sellerText = { dealer: "dealer", private: "private seller", auction: "auction" }[sellerType];
  const positionDetail = result.pricePosition === "Unverified"
    ? "Model valuation not yet available"
    : result.pricePosition === "High"
    ? `${formatMoney(askingPrice - fairHigh)} above market range`
    : result.pricePosition === "Attractive"
      ? `${formatMoney(fairLow - askingPrice)} below market range`
      : "Within market range";
  const topRisk = result.deductions[0];
  const priorityFaults = result.relevantFaults.filter((fault) => fault.severity === "high");

  document.querySelector("#buyer-score").textContent = result.score;
  document.querySelector(".score-premium>div").style.setProperty("--score", result.score);
  document.querySelector("#buyer-verdict").textContent = result.verdict;
  document.querySelector("#buyer-verdict-detail").textContent = `${historyText.split(".")[0]} · ${sellerText}`;
  document.querySelector("#vehicle-summary").textContent = [currentVehicle.trim, currentVehicle.fuelType, `${mileage.toLocaleString("en-GB")} miles`, currentVehicle.registration].filter(Boolean).join(" · ");
  document.querySelector("#negotiation-target").textContent = formatMoney(result.target);
  document.querySelector("#seller-asks").textContent = `Seller asks ${formatMoney(askingPrice)}`;
  document.querySelector("#price-card-target").textContent = formatMoney(result.target);
  document.querySelector("#price-position").textContent = result.pricePosition;
  document.querySelector("#price-position-detail").textContent = positionDetail;
  document.querySelector("#price-signal").className = `signal ${result.pricePosition === "High" ? "risk" : "positive"}`;
  document.querySelector("#priority-risk-count").textContent = `${priorityFaults.length} found`;
  document.querySelector("#priority-risk-detail").textContent = priorityFaults[0]?.title || "No priority model risks";
  document.querySelector("#personal-summary").textContent = result.score >= 80
    ? "A strong candidate, subject to the priority inspection."
    : result.score >= 68
      ? "Worth considering, with clear points to inspect and negotiate."
      : result.score >= 55
        ? "Inspect closely before committing to this car."
        : "Several red flags make this a higher-risk purchase.";
  document.querySelector("#personal-summary-detail").textContent = `${historyText} ${topRisk ? `The largest score deduction is ${topRisk.label.toLowerCase()}.` : "No major score deductions were identified."}`;
  document.querySelector("#negotiation-advice").textContent = `Offer around ${formatMoney(result.target - 200)} and aim to settle near ${formatMoney(result.target)}. Use confirmed faults and evidence gaps to support your position.`;
  document.querySelector("#score-explainer-value").textContent = `${result.score}/100`;
  document.querySelector("#score-final").textContent = result.score;
  document.querySelector("#score-confidence").textContent = `${result.dataConfidence} confidence · ${mot.passRate != null ? "official MOT data, " : ""}model research and seller information`;
  document.querySelector("#score-factors").innerHTML = result.signals.map((factor) => `
    <article class="${factor.points < 0 ? "negative" : factor.points > 0 ? "positive-factor" : "neutral"}">
      <span>${factor.points > 0 ? "+" : ""}${factor.points}</span>
      <div><strong>${factor.label}</strong><p>${factor.reason}</p><small>${factor.source} · ${factor.confidence} confidence</small></div>
    </article>`).join("");
  renderModelIntelligence(profile, result);
  currentReportSnapshot = {
    id: `${profile.id}-${askingPrice}-${mileage}`, title: document.querySelector("#vehicle-title").textContent,
    score: result.score, verdict: result.verdict, askingPrice, target: result.target, mileage,
    priorityRisks: priorityFaults.length, topRisk: priorityFaults[0]?.title || result.relevantFaults[0]?.title || "No matched model risk",
    exposureLow: result.relevantFaults.reduce((sum, item) => sum + item.costLow, 0),
    exposureHigh: result.relevantFaults.reduce((sum, item) => sum + item.costHigh, 0),
  };

  const sellerPercent = fairHigh ? Math.max(2, Math.min(98, ((askingPrice - fairLow) / (fairHigh - fairLow)) * 100)) : 70;
  const targetPercent = fairHigh ? Math.max(2, Math.min(98, ((result.target - fairLow) / (fairHigh - fairLow)) * 100)) : 35;
  document.querySelector("#seller-marker").style.left = `${sellerPercent}%`;
  document.querySelector("#seller-marker").innerHTML = `Seller<br>${formatMoney(askingPrice)}`;
  document.querySelector("#target-marker").style.left = `${targetPercent}%`;
  document.querySelector("#target-label").style.left = `${targetPercent}%`;
  document.querySelector("#target-label").innerHTML = `Target<br>${formatMoney(result.target)}`;
  setStatus("Personalised risk report ready.");
  listingDialog.close();
  showReport();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  registration.value = registration.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "");
  setStatus("Checking official vehicle records...");
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const response = await fetch("/api/vehicle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ registration: registration.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Lookup failed.");
    renderLiveReport(data);
  } catch (error) {
    setStatus(error.message === "Failed to fetch" ? "Start the RedFlag Report live server to search real registrations." : error.message, true);
  } finally {
    button.disabled = false;
  }
});

function profileOptions() {
  return Object.values(globalThis.RED_FLAG_MODELS).map((item) => ({
    profile: item,
    make: item.match.make,
    model: item.match.model,
    year: Number(item.label.match(/\d{4}/)?.[0] || item.match.yearFrom),
    fuel: item.match.fuelType,
  }));
}

function fillSelect(select, values) {
  const current = select.value;
  select.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join("");
  if (values.includes(current)) select.value = current;
}

function refreshManualSearch() {
  const options = profileOptions();
  const make = document.querySelector("#manual-make").value;
  const matchingMake = options.filter((item) => item.make === make);
  const modelSelect = document.querySelector("#manual-model");
  fillSelect(modelSelect, [...new Set(matchingMake.map((item) => item.model))]);
  const model = modelSelect.value;
  const matchingModel = matchingMake.filter((item) => item.model === model);
  fillSelect(document.querySelector("#manual-year"), [...new Set(matchingModel.map((item) => String(item.year)))]);
  fillSelect(document.querySelector("#manual-fuel"), [...new Set(matchingModel.map((item) => item.fuel))]);
  const selected = matchingModel.find((item) => String(item.year) === document.querySelector("#manual-year").value && item.fuel === document.querySelector("#manual-fuel").value) || matchingModel[0];
  const preview = document.querySelector("#profile-preview");
  if (selected) preview.innerHTML = `<span>${selected.profile.confidence} profile</span><strong>${selected.profile.label}</strong><p>${selected.profile.faults.length} known faults · ${formatMoney(selected.profile.market.fairLow)}–${formatMoney(selected.profile.market.fairHigh)} market range</p>`;
}

manualSearchButton.addEventListener("click", () => {
  const makes = [...new Set(profileOptions().map((item) => item.make))].sort();
  fillSelect(document.querySelector("#manual-make"), makes);
  refreshManualSearch();
  manualDialog.showModal();
});
["manual-make", "manual-model", "manual-year", "manual-fuel"].forEach((id) => document.querySelector(`#${id}`).addEventListener("change", refreshManualSearch));
document.querySelector(".manual-close").addEventListener("click", () => manualDialog.close());
document.querySelector("#use-manual-profile").addEventListener("click", () => {
  const profile = profileOptions().find((item) => item.make === document.querySelector("#manual-make").value
    && item.model === document.querySelector("#manual-model").value
    && String(item.year) === document.querySelector("#manual-year").value
    && item.fuel === document.querySelector("#manual-fuel").value)?.profile;
  if (!profile) return;
  currentProfile = profile;
  const make = profile.match.make.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const model = profile.match.model.replace(/\b\w/g, (letter) => letter.toUpperCase());
  currentVehicle = { registration: "", fuelType: profile.match.fuelType.replace(/\b\w/g, (letter) => letter.toUpperCase()), trim: `${profile.match.yearFrom} ${make} ${model}` };
  document.querySelector("#vehicle-title").textContent = profile.label;
  registration.value = "";
  document.querySelector("#asking-price").value = Math.round((profile.market.fairLow + profile.market.fairHigh) / 100) * 50;
  document.querySelector("#advertised-mileage").value = profile.market.benchmarkMileage;
  pendingLiveData = null;
  manualDialog.close();
  setStatus("Vehicle profile selected. Add the advert details to personalise your report.");
  listingDialog.showModal();
});

function submitListingDetails(event) {
  event.preventDefault();
  try {
    runScoringEngine({
      askingPrice: Number(document.querySelector("#asking-price").value),
      mileage: Number(document.querySelector("#advertised-mileage").value),
      sellerType: document.querySelector("#seller-type").value,
      serviceHistory: document.querySelector("#service-history").value,
    });
  } catch (error) {
    listingDialog.close();
    setStatus(`Scoring error: ${error.message}`, true);
    console.error(error);
  }
}
document.querySelector("#listing-form").addEventListener("submit", submitListingDetails);
document.querySelector("#build-personalised-report").addEventListener("click", submitListingDetails);
document.querySelector(".listing-close").addEventListener("click", () => listingDialog.close());

document.querySelector("#save-car").addEventListener("click", (event) => {
  event.currentTarget.textContent = "Saved ✓";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
});

const checklist = document.querySelector("#checklist");
document.querySelectorAll("#checklist-button, #checklist-button-bottom").forEach((button) => {
  button.addEventListener("click", () => checklist.showModal());
});
document.querySelector("#checklist .close").addEventListener("click", () => checklist.close());

const detailModal = document.querySelector("#detail-modal");
const detailContent = document.querySelector("#detail-modal-content");
const detailViews = {
  "fault-detail": `
    <p class="eyebrow">Model intelligence</p><h2>Known Golf faults</h2>
    <p class="modal-intro">Prioritised by likelihood, potential cost and relevance to this vehicle's mileage.</p>
    <div class="modal-list">
      <article><span class="severity high">Priority</span><div><h4>Water pump and thermostat housing</h4><p>Most relevant at 50–80k miles. Look for coolant loss and pink residue.</p></div><strong>£650–£900</strong></article>
      <article><span class="severity medium">Check</span><div><h4>Infotainment freezes</h4><p>Test Bluetooth, navigation and all screen controls.</p></div><strong>£120–£750</strong></article>
      <article><span class="severity medium">Check</span><div><h4>Rear shock mounts</h4><p>Listen for knocking over uneven surfaces.</p></div><strong>£180–£320</strong></article>
      <article><span class="severity low">Lower</span><div><h4>Air-con condenser</h4><p>Confirm cold air is maintained throughout the drive.</p></div><strong>£400–£600</strong></article>
    </div>`,
  "mot-detail": `
    <p class="eyebrow">Official record summary</p><h2>MOT pattern & advisories</h2>
    <p class="modal-intro">A healthy overall pattern. Recent advisories point to routine wear rather than structural neglect.</p>
    <div class="history-list">
      <article><span>2025</span><b class="pass">Pass</b><p>Advisory: front tyre approaching limit</p><strong>63,810 mi</strong></article>
      <article><span>2024</span><b class="pass">Pass</b><p>No advisories recorded</p><strong>55,742 mi</strong></article>
      <article><span>2023</span><b class="pass">Pass</b><p>Advisory: rear brake pads wearing thin</p><strong>47,105 mi</strong></article>
      <article><span>2022</span><b class="fail">Fail → Pass</b><p>Headlamp aim corrected same day</p><strong>38,920 mi</strong></article>
    </div>`,
  "cost-detail": `
    <p class="eyebrow">Ownership planning</p><h2>Major lifetime costs</h2>
    <p class="modal-intro">Budget ranges from independent UK specialists. Actual cost varies by location and parts used.</p>
    <div class="modal-list costs">
      <article><span>80k</span><div><h4>Spark plugs</h4><p>Recommended service interval</p></div><strong>£140–£190</strong></article>
      <article><span>100k</span><div><h4>Timing belt inspection</h4><p>Replace based on age and condition</p></div><strong>£500–£750</strong></article>
      <article><span>Life</span><div><h4>Clutch replacement</h4><p>Typical manual-transmission wear item</p></div><strong>£750–£1,050</strong></article>
      <article><span>Life</span><div><h4>Front brake discs and pads</h4><p>Typical wear item</p></div><strong>£350–£500</strong></article>
    </div>`,
};

document.querySelectorAll("[data-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    detailContent.innerHTML = detailViews[button.dataset.dialog] || "";
    detailModal.showModal();
  });
});
document.querySelector(".detail-close").addEventListener("click", () => detailModal.close());

function getSavedReports() {
  try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; }
}
function updateSavedCount() { document.querySelector("#saved-count").textContent = getSavedReports().length; }
document.querySelector("#save-car").addEventListener("click", () => {
  if (!currentReportSnapshot) return;
  const reports = getSavedReports().filter((item) => item.id !== currentReportSnapshot.id);
  reports.unshift(currentReportSnapshot);
  localStorage.setItem(storageKey, JSON.stringify(reports.slice(0, 8)));
  updateSavedCount();
});
function renderSavedReports() {
  const reports = getSavedReports();
  const list = document.querySelector("#saved-reports-list");
  const comparison = document.querySelector("#comparison-table");
  comparison.classList.add("hidden"); list.classList.remove("hidden");
  list.innerHTML = reports.length ? reports.map((item) => `<article class="saved-report"><label><input type="checkbox" value="${item.id}"></label><div><strong>${item.title}</strong><p>${item.mileage.toLocaleString("en-GB")} miles · asks ${formatMoney(item.askingPrice)}</p><small>${item.topRisk}</small></div><span class="saved-score">${item.score}<small>/100</small></span><button data-remove-report="${item.id}" aria-label="Remove">×</button></article>`).join("") + `<button id="compare-selected" class="dark-button compare-button">Compare selected cars</button>` : `<div class="empty-state"><strong>No saved reports yet</strong><p>Build and save reports to begin your shortlist.</p></div>`;
  list.querySelectorAll("[data-remove-report]").forEach((button) => button.addEventListener("click", () => { localStorage.setItem(storageKey, JSON.stringify(getSavedReports().filter((item) => item.id !== button.dataset.removeReport))); updateSavedCount(); renderSavedReports(); }));
  document.querySelector("#compare-selected")?.addEventListener("click", () => {
    const selected = [...list.querySelectorAll("input:checked")].map((input) => reports.find((item) => item.id === input.value)).filter(Boolean);
    if (selected.length < 2) { toast.textContent = "Select at least two cars to compare"; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1800); return; }
    list.classList.add("hidden"); comparison.classList.remove("hidden");
    comparison.innerHTML = `<button id="back-to-saved" class="soft-button">← Back</button><div class="compare-grid">${selected.map((item) => `<article><h3>${item.title}</h3><strong class="compare-score">${item.score}/100</strong><dl><dt>Verdict</dt><dd>${item.verdict}</dd><dt>Asking price</dt><dd>${formatMoney(item.askingPrice)}</dd><dt>Target price</dt><dd>${formatMoney(item.target)}</dd><dt>Priority risks</dt><dd>${item.priorityRisks}</dd><dt>Repair exposure</dt><dd>${formatMoney(item.exposureLow)}–${formatMoney(item.exposureHigh)}</dd><dt>Leading issue</dt><dd>${item.topRisk}</dd></dl></article>`).join("")}</div>`;
    document.querySelector("#back-to-saved").addEventListener("click", renderSavedReports);
  });
}
const savedDialog = document.querySelector("#saved-reports");
document.querySelector("#saved-reports-button").addEventListener("click", () => { renderSavedReports(); savedDialog.showModal(); });
document.querySelector(".saved-close").addEventListener("click", () => savedDialog.close());
document.querySelector("#print-report").addEventListener("click", () => window.print());
updateSavedCount();

const feedbackDialog = document.querySelector("#feedback-dialog");
document.querySelectorAll("#feedback-button, #footer-feedback").forEach((button) => button.addEventListener("click", () => feedbackDialog.showModal()));
document.querySelector(".feedback-close").addEventListener("click", () => feedbackDialog.close());
document.querySelector("#feedback-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const feedback = JSON.parse(localStorage.getItem("redflag-feedback") || "[]");
  feedback.push({ context: document.querySelector("#feedback-context").value, notes: document.querySelector("#feedback-notes").value, rating: document.querySelector("#feedback-rating").value, createdAt: new Date().toISOString() });
  localStorage.setItem("redflag-feedback", JSON.stringify(feedback));
  feedbackDialog.close(); toast.textContent = "Thank you — feedback saved"; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1800);
});
const legalDialog = document.querySelector("#legal-dialog");
const legalCopy = {
  privacy: `<p class="eyebrow">Privacy</p><h2>Private beta privacy</h2><p class="modal-intro">This prototype stores saved reports and feedback locally in your browser. It does not transmit them to RedFlag Report. Live vehicle lookups will be processed through official services when configured.</p>`,
  disclaimer: `<p class="eyebrow">Important information</p><h2>Buyer disclaimer</h2><p class="modal-intro">RedFlag Report supports buying decisions but is not a mechanical inspection, valuation guarantee or replacement for official manufacturer and DVSA records. Verify findings and arrange a qualified inspection before purchase.</p>`,
};
document.querySelectorAll("[data-legal]").forEach((button) => button.addEventListener("click", () => { document.querySelector("#legal-content").innerHTML = legalCopy[button.dataset.legal]; legalDialog.showModal(); }));
document.querySelector(".legal-close").addEventListener("click", () => legalDialog.close());
