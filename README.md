# TidalShift

**Created by Tabish Syed**

TidalShift is a port operations simulator that schedules vessel arrivals against berth capacity, tide windows, vessel size, service time, and an optional storm approach restriction. It displays the resulting berth plan, queue delays, and tide windows on a synthetic 48-hour timeline.

## Run

Open `index.html` in a modern browser. The project is static and has no install step, API key, account, or external service.

## Use

- Choose the typical or low-range synthetic tide profile.
- Change a vessel's estimated arrival or draft.
- Turn on the storm restriction to close approach arrivals from 08:00 to 12:00 on both simulated days.
- Select **Recalculate plan** to update berth assignments and queue estimates.
- Review the tide chart, berth timeline, and vessel schedule.

## Scheduling model

The planner orders vessels by estimated arrival. For each vessel, it scans forward for the first hour when the approach is open, the simulated water level meets the draft threshold, and a compatible berth is available. When multiple berths fit at that hour, it selects the smallest compatible berth. Service time then reserves that berth.

This deadline-first greedy method is easy to inspect, but it is not a globally optimal port schedule.

## Scope and limits

Vessels, berth lengths, tide heights, channel depth, and storm windows are illustrative. Tide height repeats on a 24-hour cycle across the two-day timeline. TidalShift does not use live hydrographic, weather, vessel, or port data and must not be used for real navigation or port operations.

## License

The original project code is available under the MIT License.