import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const requests = new Map();
let motToken = { value: "", expiresAt: 0 };
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };

function json(res, status, body) {
  res.writeHead(status, { "content-type": types[".json"], "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function cleanRegistration(value = "") {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function rateLimited(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (requests.get(key) || []).filter((time) => now - time < 60_000);
  recent.push(now);
  requests.set(key, recent);
  return recent.length > 30;
}

async function getMotToken() {
  if (motToken.value && Date.now() < motToken.expiresAt) return motToken.value;
  if (!process.env.DVSA_TOKEN_URL || !process.env.DVSA_CLIENT_ID || !process.env.DVSA_CLIENT_SECRET || !process.env.DVSA_SCOPE) return "";
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: process.env.DVSA_CLIENT_ID, client_secret: process.env.DVSA_CLIENT_SECRET, scope: process.env.DVSA_SCOPE });
  const response = await fetch(process.env.DVSA_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) throw new Error("DVSA authentication failed");
  const data = await response.json();
  motToken = { value: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in - 120) * 1000 };
  return motToken.value;
}

async function fetchMot(registration) {
  const token = await getMotToken();
  if (!token || !process.env.DVSA_API_KEY) return null;
  const base = process.env.DVSA_MOT_BASE_URL || "https://history.mot.api.gov.uk/v1/trade/vehicles/registration";
  const response = await fetch(`${base}/${registration}`, { headers: { authorization: `Bearer ${token}`, "x-api-key": process.env.DVSA_API_KEY, accept: "application/json" } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`DVSA lookup failed (${response.status})`);
  return response.json();
}

async function fetchDvla(registration) {
  if (!process.env.DVLA_API_KEY) return null;
  const response = await fetch("https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles", {
    method: "POST",
    headers: { "x-api-key": process.env.DVLA_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ registrationNumber: registration }),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`DVLA lookup failed (${response.status})`);
  return response.json();
}

function analyseMot(raw) {
  const vehicle = Array.isArray(raw) ? raw[0] : raw;
  const tests = vehicle?.motTests || vehicle?.motTest || [];
  const passed = tests.filter((test) => String(test.testResult || test.testStatus || "").toUpperCase() === "PASSED").length;
  const latest = tests[0] || null;
  const defects = tests.flatMap((test) => test.defects || test.rfrAndComments || []);
  return { vehicle, tests, latest, defects, passRate: tests.length ? Math.round((passed / tests.length) * 100) : null };
}

async function vehicleLookup(req, res) {
  if (rateLimited(req)) return json(res, 429, { error: "Too many lookups. Please wait a minute." });
  let body = "";
  for await (const chunk of req) body += chunk;
  const registration = cleanRegistration(JSON.parse(body || "{}").registration);
  if (registration.length < 2) return json(res, 400, { error: "Enter a valid UK registration." });
  try {
    const [motRaw, dvla] = await Promise.all([fetchMot(registration), fetchDvla(registration)]);
    if (!motRaw && !dvla) return json(res, process.env.DVSA_API_KEY || process.env.DVLA_API_KEY ? 404 : 503, { error: process.env.DVSA_API_KEY || process.env.DVLA_API_KEY ? "Vehicle not found." : "Live lookup credentials have not been configured yet." });
    const mot = analyseMot(motRaw);
    const vehicle = mot.vehicle || {};
    return json(res, 200, {
      source: { mot: Boolean(motRaw), dvla: Boolean(dvla), checkedAt: new Date().toISOString() },
      vehicle: { registration, make: dvla?.make || vehicle.make, model: vehicle.model, colour: dvla?.colour || vehicle.primaryColour, fuelType: dvla?.fuelType || vehicle.fuelType, year: dvla?.yearOfManufacture || Number(String(vehicle.firstUsedDate || "").slice(0, 4)) || null, engineCapacity: dvla?.engineCapacity, taxStatus: dvla?.taxStatus, motStatus: dvla?.motStatus, motExpiryDate: dvla?.motExpiryDate || mot.latest?.expiryDate },
      mot: { testCount: mot.tests.length, passRate: mot.passRate, latest: mot.latest, defects: mot.defects.slice(0, 20) },
      recall: vehicle.recall || vehicle.hasOutstandingRecall || null,
    });
  } catch (error) {
    console.error(error);
    return json(res, 502, { error: "The live vehicle services are temporarily unavailable." });
  }
}

createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/vehicle") return vehicleLookup(req, res);
  const requestPath = req.url === "/" ? "index.html" : req.url.split("?")[0].replace(/^\/+/, "");
  const path = normalize(join(root, requestPath));
  if (!path.startsWith(root)) return json(res, 403, { error: "Forbidden" });
  try {
    const file = await readFile(path);
    res.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(file);
  } catch {
    json(res, 404, { error: "Not found" });
  }
}).listen(port, "0.0.0.0", () => console.log(`RedFlag Report running on port ${port}`));
