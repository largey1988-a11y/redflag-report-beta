const fault = (id, title, severity, mileageFrom, mileageTo, likelihood, costLow, costHigh, scoreImpact, inspect, ask) =>
  ({ id, title, severity, mileageFrom, mileageTo, likelihood, costLow, costHigh, scoreImpact, inspect, ask });

const profile = (id, label, match, market, motBenchmark, faults, serviceItems) =>
  ({ id, label, match, confidence: "researched", market, motBenchmark, faults, serviceItems });

globalThis.RED_FLAG_MODELS = {
  "volkswagen-golf-2018-petrol": profile("volkswagen-golf-2018-petrol", "2018 Volkswagen Golf Petrol", { make: "VOLKSWAGEN", model: "GOLF", yearFrom: 2017, yearTo: 2020, fuelType: "PETROL" }, { fairLow: 9400, fairHigh: 10300, benchmarkMileage: 64200, mileageValuePer1000: 45 }, 72, [
    fault("water-pump", "Water pump and thermostat housing", "high", 50000, 80000, .62, 650, 900, 8, "Check coolant level and inspect for pink residue.", "Has the water pump or thermostat housing been replaced?"),
    fault("infotainment", "Infotainment freezes", "medium", 0, 150000, .32, 120, 750, 3, "Pair a phone and test every screen function.", "Has the infotainment unit had software updates?"),
    fault("rear-mounts", "Rear shock absorber mounts", "medium", 55000, 110000, .28, 180, 320, 3, "Listen for rear knocking over uneven roads.", "Have suspension mounts or dampers been replaced?"),
  ], [{ title: "Annual service", dueMileage: 65000, costLow: 220, costHigh: 290 }, { title: "Spark plugs", dueMileage: 80000, costLow: 140, costHigh: 190 }]),

  "ford-fiesta-2018-petrol": profile("ford-fiesta-2018-petrol", "2018 Ford Fiesta Petrol", { make: "FORD", model: "FIESTA", yearFrom: 2017, yearTo: 2021, fuelType: "PETROL" }, { fairLow: 6500, fairHigh: 8200, benchmarkMileage: 55000, mileageValuePer1000: 38 }, 70, [
    fault("wet-belt", "EcoBoost wet timing belt deterioration", "high", 50000, 100000, .48, 900, 1800, 12, "Check oil condition and listen for low-oil-pressure warnings.", "Has the wet belt been inspected or replaced with invoices?"),
    fault("door-seals", "Door-seal water ingress", "medium", 0, 120000, .28, 100, 350, 2, "Check carpets and spare-wheel well for dampness.", "Has the car ever had water ingress?"),
    fault("clutch", "Clutch wear and judder", "medium", 55000, 110000, .35, 650, 950, 5, "Pull away uphill and test for clutch judder.", "Has the clutch ever been replaced?"),
  ], [{ title: "Annual service", dueMileage: 60000, costLow: 180, costHigh: 260 }, { title: "Wet-belt inspection", dueMileage: 80000, costLow: 180, costHigh: 300 }]),

  "vauxhall-corsa-2019-petrol": profile("vauxhall-corsa-2019-petrol", "2019 Vauxhall Corsa Petrol", { make: "VAUXHALL", model: "CORSA", yearFrom: 2015, yearTo: 2020, fuelType: "PETROL" }, { fairLow: 5200, fairHigh: 7000, benchmarkMileage: 52000, mileageValuePer1000: 32 }, 68, [
    fault("timing-chain", "Timing-chain rattle", "high", 50000, 100000, .38, 700, 1200, 9, "Start the engine from cold and listen for metallic rattling.", "Has the timing chain or tensioner been replaced?"),
    fault("coil-pack", "Ignition coil-pack failure", "medium", 30000, 100000, .36, 180, 350, 3, "Check for hesitant acceleration or an uneven idle.", "Have coil packs or spark plugs been replaced?"),
    fault("steering", "Electric power-steering fault", "medium", 40000, 120000, .22, 450, 900, 5, "Turn lock-to-lock and watch for warning lights.", "Has the steering column or motor been repaired?"),
  ], [{ title: "Annual service", dueMileage: 60000, costLow: 180, costHigh: 250 }, { title: "Spark plugs", dueMileage: 60000, costLow: 120, costHigh: 180 }]),

  "ford-focus-2018-diesel": profile("ford-focus-2018-diesel", "2018 Ford Focus Diesel", { make: "FORD", model: "FOCUS", yearFrom: 2015, yearTo: 2020, fuelType: "DIESEL" }, { fairLow: 6800, fairHigh: 9000, benchmarkMileage: 70000, mileageValuePer1000: 42 }, 69, [
    fault("dpf", "DPF blockage and regeneration issues", "high", 55000, 130000, .45, 350, 1400, 10, "Check for warning lights and confirm a sustained motorway test drive.", "What type of journeys has the car mainly completed?"),
    fault("clutch-flywheel", "Clutch and dual-mass flywheel wear", "high", 75000, 140000, .36, 1100, 1700, 10, "Listen for rattling at idle and test clutch engagement.", "Has the clutch or flywheel been replaced?"),
    fault("injectors", "Injector seal or injector faults", "medium", 70000, 150000, .25, 300, 1200, 5, "Check for rough idle, smoke or diesel smells.", "Have injectors been tested or replaced?"),
  ], [{ title: "Annual diesel service", dueMileage: 75000, costLow: 220, costHigh: 320 }, { title: "Fuel filter", dueMileage: 80000, costLow: 100, costHigh: 170 }]),

  "nissan-qashqai-2018-diesel": profile("nissan-qashqai-2018-diesel", "2018 Nissan Qashqai Diesel", { make: "NISSAN", model: "QASHQAI", yearFrom: 2014, yearTo: 2021, fuelType: "DIESEL" }, { fairLow: 8500, fairHigh: 11000, benchmarkMileage: 68000, mileageValuePer1000: 45 }, 67, [
    fault("dpf", "DPF and exhaust-system warnings", "high", 50000, 130000, .44, 400, 1500, 10, "Check warning lights and ask for evidence of longer journeys.", "Has the DPF ever required forced regeneration?"),
    fault("rear-shocks", "Rear shock absorber wear", "medium", 50000, 110000, .34, 300, 550, 4, "Listen for knocking and check for fluid leaks.", "Have the rear dampers been replaced?"),
    fault("battery-stop-start", "Stop-start battery and electrical faults", "medium", 30000, 100000, .31, 180, 350, 3, "Test stop-start and all electrical accessories.", "When was the battery last replaced?"),
  ], [{ title: "Annual diesel service", dueMileage: 70000, costLow: 240, costHigh: 330 }, { title: "Brake fluid", dueMileage: 75000, costLow: 80, costHigh: 130 }]),

  "volkswagen-polo-2019-petrol": profile("volkswagen-polo-2019-petrol", "2019 Volkswagen Polo Petrol", { make: "VOLKSWAGEN", model: "POLO", yearFrom: 2017, yearTo: 2021, fuelType: "PETROL" }, { fairLow: 8200, fairHigh: 10500, benchmarkMileage: 48000, mileageValuePer1000: 42 }, 73, [
    fault("dsg", "DSG hesitation or mechatronic faults", "high", 40000, 110000, .31, 900, 2200, 11, "Test low-speed pull-away, reverse and repeated gear changes.", "Has the gearbox oil been serviced and are there repair invoices?"),
    fault("infotainment", "Infotainment and connectivity faults", "medium", 0, 120000, .30, 120, 700, 3, "Test phone pairing, audio and every screen control.", "Has the infotainment software been updated?"),
    fault("front-suspension", "Front suspension knocks", "medium", 45000, 110000, .26, 220, 500, 3, "Drive slowly over uneven roads and listen at the front.", "Have bushes or drop links been replaced?"),
  ], [{ title: "Annual service", dueMileage: 50000, costLow: 200, costHigh: 280 }, { title: "DSG oil service", dueMileage: 80000, costLow: 280, costHigh: 420 }]),

  "bmw-3-series-2018-diesel": profile("bmw-3-series-2018-diesel", "2018 BMW 3 Series Diesel", { make: "BMW", model: "3 SERIES", yearFrom: 2015, yearTo: 2020, fuelType: "DIESEL" }, { fairLow: 10500, fairHigh: 14500, benchmarkMileage: 75000, mileageValuePer1000: 60 }, 71, [
    fault("egr", "EGR valve and cooler issues", "high", 60000, 140000, .39, 650, 1400, 9, "Check for warning lights, hesitation and recall evidence.", "Has the EGR cooler recall or replacement been completed?"),
    fault("dpf", "DPF blockage", "high", 70000, 150000, .34, 500, 1800, 9, "Check for frequent regeneration or warning messages.", "Has the car mainly covered motorway miles?"),
    fault("suspension", "Front suspension arm wear", "medium", 70000, 140000, .33, 450, 850, 4, "Listen for front-end knocks and check uneven tyre wear.", "Have suspension arms or bushes been replaced?"),
  ], [{ title: "Annual diesel service", dueMileage: 80000, costLow: 300, costHigh: 450 }, { title: "Automatic gearbox service", dueMileage: 80000, costLow: 450, costHigh: 650 }]),

  "audi-a3-2018-diesel": profile("audi-a3-2018-diesel", "2018 Audi A3 Diesel", { make: "AUDI", model: "A3", yearFrom: 2015, yearTo: 2020, fuelType: "DIESEL" }, { fairLow: 10000, fairHigh: 13500, benchmarkMileage: 70000, mileageValuePer1000: 55 }, 72, [
    fault("dpf", "DPF and EGR issues", "high", 60000, 140000, .37, 500, 1600, 9, "Check for emissions warnings and sluggish acceleration.", "Has the DPF or EGR system required work?"),
    fault("s-tronic", "S tronic gearbox hesitation", "high", 50000, 130000, .30, 900, 2200, 10, "Test slow manoeuvres, reverse and smooth upshifts.", "Has the gearbox oil service been completed on time?"),
    fault("water-pump", "Water-pump leakage", "medium", 50000, 110000, .28, 600, 950, 5, "Inspect coolant level and look for dried residue.", "Has the water pump been replaced?"),
  ], [{ title: "Annual diesel service", dueMileage: 75000, costLow: 280, costHigh: 400 }, { title: "S tronic service", dueMileage: 80000, costLow: 320, costHigh: 480 }]),

  "mercedes-a-class-2019-diesel": profile("mercedes-a-class-2019-diesel", "2019 Mercedes A-Class Diesel", { make: "MERCEDES", model: "A", yearFrom: 2018, yearTo: 2021, fuelType: "DIESEL" }, { fairLow: 14500, fairHigh: 18500, benchmarkMileage: 60000, mileageValuePer1000: 65 }, 72, [
    fault("adblue", "AdBlue and NOx-sensor faults", "high", 45000, 130000, .35, 550, 1400, 9, "Check for emissions or no-start countdown warnings.", "Have the NOx sensors or AdBlue system been repaired?"),
    fault("mbux", "MBUX screen and software faults", "medium", 0, 120000, .28, 150, 1200, 4, "Test both screens, voice control and phone pairing.", "Has MBUX software been updated?"),
    fault("battery", "Auxiliary battery warnings", "medium", 40000, 100000, .30, 180, 400, 3, "Check dashboard warnings and stop-start operation.", "Have either batteries been replaced?"),
  ], [{ title: "Annual diesel service", dueMileage: 65000, costLow: 320, costHigh: 480 }, { title: "Automatic gearbox service", dueMileage: 75000, costLow: 400, costHigh: 600 }]),

  "toyota-yaris-2018-hybrid": profile("toyota-yaris-2018-hybrid", "2018 Toyota Yaris Hybrid", { make: "TOYOTA", model: "YARIS", yearFrom: 2015, yearTo: 2020, fuelType: "HYBRID" }, { fairLow: 8500, fairHigh: 11000, benchmarkMileage: 52000, mileageValuePer1000: 45 }, 78, [
    fault("12v-battery", "12V battery weakness", "medium", 30000, 100000, .31, 120, 250, 2, "Check for slow startup and warning lights after standing.", "When was the 12V battery replaced?"),
    fault("rear-brakes", "Rear brake corrosion or binding", "medium", 35000, 100000, .26, 220, 450, 3, "Check for scraping noises and uneven braking.", "Have the rear brakes been serviced recently?"),
    fault("hybrid-cooling", "Hybrid battery cooling-fan blockage", "low", 50000, 140000, .20, 120, 400, 2, "Listen for a loud battery fan and inspect the intake.", "Has the hybrid cooling intake been cleaned?"),
  ], [{ title: "Annual hybrid service", dueMileage: 55000, costLow: 220, costHigh: 320 }, { title: "Hybrid health check", dueMileage: 60000, costLow: 50, costHigh: 100 }]),

  "kia-sportage-2018-diesel": profile("kia-sportage-2018-diesel", "2018 Kia Sportage Diesel", { make: "KIA", model: "SPORTAGE", yearFrom: 2016, yearTo: 2021, fuelType: "DIESEL" }, { fairLow: 9500, fairHigh: 12500, benchmarkMileage: 68000, mileageValuePer1000: 48 }, 70, [
    fault("dpf", "DPF blockage on short-trip cars", "high", 55000, 140000, .39, 450, 1500, 9, "Check for warning lights and sluggish performance.", "Has the car mainly completed short journeys?"),
    fault("clutch", "Clutch and flywheel wear", "high", 75000, 145000, .31, 1000, 1600, 9, "Test for clutch slip and rattling at idle.", "Has the clutch or flywheel been replaced?"),
    fault("parking-brake", "Electronic parking-brake faults", "medium", 45000, 120000, .24, 300, 750, 4, "Operate the parking brake repeatedly on an incline.", "Has the electronic parking brake needed repairs?"),
  ], [{ title: "Annual diesel service", dueMileage: 70000, costLow: 240, costHigh: 350 }, { title: "Fuel filter", dueMileage: 80000, costLow: 110, costHigh: 180 }]),
};

globalThis.DEFAULT_MODEL_PROFILE = globalThis.RED_FLAG_MODELS["volkswagen-golf-2018-petrol"];
globalThis.GENERIC_MODEL_PROFILE = {
  id: "generic-vehicle", label: "Unmatched vehicle", match: {}, confidence: "unverified",
  market: { fairLow: 0, fairHigh: 0, benchmarkMileage: 60000, mileageValuePer1000: 35 },
  motBenchmark: 72, faults: [], serviceItems: [],
};
