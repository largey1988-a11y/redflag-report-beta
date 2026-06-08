# RedFlag Report live test

RedFlag Report is a dependency-free prototype with a secure server-side integration
layer for official UK vehicle data.

## Run

Use Node.js 18 or newer:

```powershell
node server.mjs
```

Then visit `http://localhost:4173`.

The sample Golf always works. Real registrations work after credentials from
the DVSA MOT History API and/or DVLA Vehicle Enquiry Service are added as
environment variables. Never put API keys in `app.js` or `index.html`.

## Data boundaries

- DVSA: vehicle identity, MOT tests, mileage, defects and recall status
- DVLA: tax/MOT status and core registration details
- Commercial partner: live valuations and provenance checks
- RedFlag Report curated data: common faults, service intervals and repair estimates

For a public test, deploy this folder as a Node web service and configure the
environment variables in the hosting provider's secret settings.

## Risk scoring

`risk-data.js` stores structured model faults, costs, mileage windows and market
benchmarks. `scoring-engine.js` calculates an explainable buyer score from:

- Asking price against the model benchmark
- Service-history quality and seller type
- Mileage-relevant known faults
- MOT performance against the model benchmark
- Outstanding recall status
- Evidence confidence and source

Every score adjustment includes its reason, source and confidence level.

## Seed model coverage

The researched seed library currently covers 11 representative UK used-car
profiles:

- Volkswagen Golf and Polo
- Ford Fiesta and Focus
- Vauxhall Corsa
- Nissan Qashqai
- BMW 3 Series
- Audi A3
- Mercedes A-Class
- Toyota Yaris Hybrid
- Kia Sportage

Profiles are scoped by model, year range and fuel type. Unmatched vehicles use
the generic profile and never inherit faults from a different model. Before a
public launch, every seed profile should receive editorial source validation.
