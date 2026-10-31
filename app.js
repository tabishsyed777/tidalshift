(() => {
  const CHANNEL_DEPTH = 10;
  const HORIZON = 48;
  const MAX_TIDE = 2.7;
  const profiles = {
    typical: [0.5,0.45,0.5,0.7,1.1,1.7,2.2,2.5,2.4,2.0,1.5,1.0,0.6,0.45,0.55,0.85,1.35,1.95,2.4,2.5,2.2,1.6,1.0,0.65],
    low:     [0.7,0.65,0.7,0.8,1.0,1.2,1.45,1.6,1.55,1.35,1.15,0.95,0.8,0.7,0.75,0.9,1.15,1.4,1.55,1.6,1.5,1.3,1.0,0.8]
  };
  const vessels = [
    { id:"NS-01", name:"Northstar", type:"Container", eta:1, draft:9.8, loa:180, service:5 },
    { id:"MV-02", name:"Meridian", type:"Bulk carrier", eta:2, draft:11.2, loa:240, service:4 },
    { id:"EC-03", name:"East Current", type:"Feeder", eta:4, draft:10.4, loa:205, service:6 },
    { id:"DS-04", name:"Delta Skye", type:"General cargo", eta:7, draft:9.2, loa:150, service:3 },
    { id:"HW-05", name:"Harborwind", type:"Container", eta:9, draft:11.7, loa:265, service:5 },
    { id:"FC-06", name:"Far Cape", type:"Tanker", eta:12, draft:8.7, loa:130, service:4 }
  ];
  const berths = [
    { name:"Berth A", maxLoa:165, className:"berth-a" },
    { name:"Berth B", maxLoa:230, className:"berth-b" },
    { name:"Berth C", maxLoa:300, className:"berth-c" }
  ];
  const vesselBody = document.getElementById("vesselBody");
  const tideChart = document.getElementById("tideChart");
  const timelineRows = document.getElementById("timelineRows");
  const timelineAxis = document.getElementById("timelineAxis");
  const tideProfile = document.getElementById("tideProfile");
  const stormRestriction = document.getElementById("stormRestriction");

  function clock(hour) {
    const day = Math.floor(hour / 24) + 1;
    const local = hour % 24;
    return "D" + day + " " + String(local).padStart(2, "0") + ":00";
  }

  function optionHours(selected) {
    return Array.from({length:19}, (_, hour) => {
      return '<option value="' + hour + '"' + (hour === selected ? " selected" : "") + '>' + String(hour).padStart(2,"0") + ':00</option>';
    }).join("");
  }

  function renderVesselInputs() {
    vesselBody.innerHTML = vessels.map((vessel) => {
      const etaOptions = optionHours(vessel.eta);
      const draftOptions = [8.7,9.2,9.8,10.4,11.2,11.7].map((draft) =>
        '<option value="' + draft + '"' + (draft === vessel.draft ? " selected" : "") + '>' + draft.toFixed(1) + ' m</option>'
      ).join("");
      return '<tr data-vessel="' + vessel.id + '">' +
        '<td class="ship-name">' + vessel.name + '<span class="ship-type">' + vessel.type + '</span></td>' +
        '<td><select data-eta class="vessel-select" aria-label="' + vessel.name + ' estimated arrival">' + etaOptions + '</select></td>' +
        '<td><select data-draft class="vessel-select" aria-label="' + vessel.name + ' draft">' + draftOptions + '</select></td>' +
        '<td class="loa-cell">' + vessel.loa + ' m</td><td class="service-cell">' + vessel.service + ' h</td>' +
        '<td data-result class="berth-result">—</td></tr>';
    }).join("");
  }

  function readInputs() {
    Array.from(vesselBody.querySelectorAll("tr")).forEach((row) => {
      const vessel = vessels.find((item) => item.id === row.dataset.vessel);
      if (!vessel) return;
      vessel.eta = Number(row.querySelector("[data-eta]").value);
      vessel.draft = Number(row.querySelector("[data-draft]").value);
    });
  }

  function tideAt(hour, profile) {
    return profile[hour % 24];
  }

  function isRestricted(hour) {
    if (!stormRestriction.checked) return false;
    const localHour = hour % 24;
    return localHour >= 8 && localHour < 12;
  }

  function scheduleVessels(profile) {
    const berthFreeAt = Object.fromEntries(berths.map((berth) => [berth.name, 0]));
    const plans = [];
    const ordered = vessels.slice().sort((a,b) => a.eta - b.eta || a.id.localeCompare(b.id));

    ordered.forEach((vessel) => {
      const requiredTide = Math.max(0, vessel.draft - CHANNEL_DEPTH);
      let assignment = null;

      for (let hour = vessel.eta; hour < HORIZON; hour += 1) {
        if (hour + vessel.service > HORIZON) continue;
        if (isRestricted(hour)) continue;
        if (tideAt(hour, profile) < requiredTide) continue;
        const compatible = berths
          .filter((berth) => vessel.loa <= berth.maxLoa && berthFreeAt[berth.name] <= hour)
          .sort((a,b) => a.maxLoa - b.maxLoa);
        if (compatible.length) {
          const berth = compatible[0];
          assignment = { vessel, berth, start:hour, end:hour + vessel.service, wait:hour-vessel.eta, requiredTide };
          berthFreeAt[berth.name] = assignment.end;
          break;
        }
      }
      plans.push(assignment || { vessel, berth:null, start:null, end:null, wait:null, requiredTide });
    });
    return plans;
  }

  function renderTide(profile) {
    tideChart.replaceChildren();
    const deepest = Math.max(...vessels.map((vessel) => vessel.draft));
    const threshold = Math.max(0, deepest - CHANNEL_DEPTH);
    document.getElementById("thresholdText").textContent = "Deepest draft needs +" + threshold.toFixed(1) + " m tide";
    const line = document.createElement("div");
    line.className = "tide-threshold";
    line.style.bottom = Math.min(98, threshold / MAX_TIDE * 100) + "%";
    tideChart.appendChild(line);

    profile.forEach((height, hour) => {
      const bar = document.createElement("div");
      const safe = height >= threshold;
      bar.className = "tide-bar " + (safe ? "is-safe" : "is-low");
      bar.style.height = Math.max(5, height / MAX_TIDE * 100) + "%";
      bar.dataset.hour = hour % 6 === 0 ? String(hour).padStart(2,"0") : "";
      bar.title = String(hour).padStart(2,"0") + ":00 · " + height.toFixed(2) + " m" + (safe ? " · deepest vessel can approach" : " · below deepest-vessel threshold");
      tideChart.appendChild(bar);
    });

    const windows = profile.filter((height) => height >= threshold).length;
    document.getElementById("metricTide").textContent = windows + " / 24";
    document.getElementById("metricTideNote").textContent = windows + " first-day hours meet deepest draft";
  }

  function renderVesselResults(plans) {
    plans.forEach((plan) => {
      const row = vesselBody.querySelector('tr[data-vessel="' + plan.vessel.id + '"]');
      const cell = row.querySelector("[data-result]");
      if (!plan.berth) {
        cell.textContent = "Beyond horizon";
        cell.className = "berth-result delayed";
      } else {
        cell.textContent = plan.berth.name + (plan.wait ? " · +" + plan.wait + "h" : " · on time");
        cell.className = "berth-result " + (plan.wait ? "queued" : "on-time");
      }
    });
  }

  function renderTimeline(plans) {
    timelineAxis.replaceChildren();
    timelineRows.replaceChildren();
    for (let hour = 0; hour <= HORIZON; hour += 4) {
      const tick = document.createElement("span");
      tick.className = "tick";
      tick.style.left = (hour / HORIZON * 100) + "%";
      tick.textContent = clock(hour);
      timelineAxis.appendChild(tick);
    }

    berths.forEach((berth) => {
      const row = document.createElement("div");
      row.className = "berth-row";
      const label = document.createElement("div");
      label.className = "berth-label";
      label.innerHTML = berth.name + "<small>Up to " + berth.maxLoa + " m</small>";
      const track = document.createElement("div");
      track.className = "track";

      if (stormRestriction.checked) {
        [8,32].forEach((hour) => {
          const band = document.createElement("div");
          band.className = "storm-band";
          band.style.left = (hour / HORIZON * 100) + "%";
          band.style.width = (4 / HORIZON * 100) + "%";
          track.appendChild(band);
        });
      }

      plans.filter((plan) => plan.berth && plan.berth.name === berth.name).forEach((plan) => {
        const bar = document.createElement("div");
        bar.className = "vessel-bar " + berth.className;
        bar.style.left = (plan.start / HORIZON * 100) + "%";
        bar.style.width = ((plan.end-plan.start) / HORIZON * 100) + "%";
        bar.title = plan.vessel.name + " · " + clock(plan.start) + "–" + clock(plan.end);
        bar.textContent = plan.vessel.name;
        track.appendChild(bar);
      });

      row.append(label, track);
      timelineRows.appendChild(row);
    });
  }

  function renderMetrics(plans) {
    const assigned = plans.filter((plan) => plan.berth);
    const avgWait = assigned.length ? assigned.reduce((sum,plan) => sum+plan.wait,0)/assigned.length : 0;
    const occupied = assigned.reduce((sum,plan) => sum + plan.vessel.service,0);
    const utilization = occupied / (berths.length * HORIZON) * 100;
    document.getElementById("metricAssigned").textContent = assigned.length + " / " + vessels.length;
    document.getElementById("metricAssignedNote").textContent = (vessels.length-assigned.length) + " beyond planning horizon";
    document.getElementById("metricWait").textContent = avgWait.toFixed(1) + " h";
    document.getElementById("metricUtil").textContent = utilization.toFixed(0) + "%";
  }

  function recalculate() {
    readInputs();
    const profile = profiles[tideProfile.value] || profiles.typical;
    const plans = scheduleVessels(profile);
    renderTide(profile);
    renderVesselResults(plans);
    renderTimeline(plans);
    renderMetrics(plans);
  }

  vesselBody.addEventListener("change", recalculate);
  tideProfile.addEventListener("change", recalculate);
  stormRestriction.addEventListener("change", recalculate);
  document.getElementById("recalculate").addEventListener("click", recalculate);

  renderVesselInputs();
  recalculate();
})();