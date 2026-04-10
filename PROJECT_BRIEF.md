# Project Brief: Coachella Stream Planner

## Project Summary

Build a mobile-first interactive web app that helps a user follow the Coachella livestream schedule, pick the artists they want to watch, and generate a personal watch plan with fast access to the correct YouTube stage streams at the right times.

This should be a front-end-only app that runs entirely in the browser and uses local storage for persistence. No backend, no auth, no database.

The app should ingest and use the following repository files as source data and reference material:

- `Schedule.md` — canonical list of performers, set times, and stages
- `youtube_links.csv` — stage-level YouTube livestream URLs
- `index.html` — rough prototype only, useful as a loose reference for existing logic or content, but not as a design or architecture standard
- `skill.md` — design direction and build expectations; the agent should choose a strong visual aesthetic, commit to it, and execute it well

## Primary Goal

Create a polished, intuitive, mobile-first Coachella companion that lets users:

1. Browse the full performance schedule
2. Select artists they want to watch
3. Automatically build a custom personal schedule
4. Quickly jump to the correct YouTube livestream for the relevant stage
5. See what is live right now, based on local time and schedule logic

## Product Principles

- **Mobile-first** above all else
- **Fast and low-friction**
- **Beautiful and opinionated design**
- **Front-end only**
- **Persistent via local storage**
- **Easy to scan under festival conditions**
- **Useful in real time, not just as a static schedule browser**

## Core User Stories

### 1. Full Schedule Browsing
As a user, I want to see everyone performing so I can browse the full festival lineup by time, stage, and artist.

### 2. Personal Schedule Building
As a user, I want to tap artists I care about and save them to my own schedule.

### 3. Personal Schedule View
As a user, I want a clean custom itinerary that shows only the acts I selected.

### 4. Stream Access
As a user, I want each saved set to show the relevant stage stream link so I can jump into the right livestream quickly.

### 5. Live Status
As a user, I want the app to tell me when something is live right now, coming up soon, or already over.

### 6. Conflict Awareness
As a user, I want the app to make schedule conflicts obvious when I save overlapping sets.

## Functional Requirements

## Data Sources

The app should derive its data from the repository files:

### `Schedule.md`
Should be parsed into structured event data with, at minimum:

- artist name
- stage name
- start time
- end time
- day/date if available
- optional metadata if present

### `youtube_links.csv`
Should map each stage to its livestream URL.

### `index.html`
May be referenced for any existing parsing ideas or rough content assumptions, but should not dictate structure, styling, or UX. Treat it as disposable prototype material.

### `skill.md`
Should influence the visual and interaction quality. The final result should feel designed, not default.

## Main Screens / Views

### 1. Home / Current View
A strong landing screen that immediately answers:
- what’s live right now
- what’s coming up soon
- quick links to stage streams
- shortcut to “My Schedule”

### 2. Full Schedule
A browsable schedule view that supports:
- grouping by day
- grouping or filtering by stage
- chronological sorting
- clear artist cards or list items
- one-tap save/remove behavior

### 3. My Schedule
A focused personalized itinerary that shows:
- only selected acts
- sorted by time
- conflict indicators for overlaps
- stream links for each item
- live/starting soon/ended status

### 4. Stage Streams
A quick-access stream hub with:
- all stage names
- corresponding YouTube links
- clear indication of what appears to be live now based on current schedule logic

## Schedule Logic

The app should determine set status using browser time and schedule metadata.

Each set should resolve into one of these states:

- **Live now**
- **Starting soon** (recommended configurable window, e.g. within 15–30 minutes)
- **Later today**
- **Ended**

The app should also determine stage-level usefulness:
- if a set on that stage is live now, highlight the stage link
- if the next saved act is on that stage, surface that link prominently

Important: all logic should be client-side only.

## Local Storage Requirements

Use local storage to persist at least:

- selected artists / saved sets
- user preferences such as filters or view mode if helpful
- last active day/view if helpful

The user should be able to leave and return without losing their custom schedule.

## Interaction Requirements

- Tap to save or unsave an artist
- Saved state should be visually obvious
- Stream links should be one tap away
- Current/live items should stand out strongly
- Time blocks should be easy to scan on a phone
- Conflict states should be visible but not annoying

## Recommended UX Additions

These are not strictly required, but they belong in the brief because they materially improve the product:

### Search
Search by artist name.

### Filters
Allow filtering by:
- day
- stage
- saved only
- live now

### Conflict Detection
If two selected artists overlap, surface that clearly in My Schedule.

### “Up Next” Module
Show the user their next saved act and how soon it starts.

### Reminder-Friendly Visuals
Without using push notifications, at least visually flag:
- live now
- starting in 15 min
- overlapping with another saved set

### Empty States
If no artists are selected yet, guide the user toward building their schedule.

### Fast Return Path
Persistent bottom nav or equivalent so users can bounce between:
- Now
- Full Schedule
- My Schedule
- Streams

## Design Direction

The site should not look like a generic utility app.

The design should be intentional, memorable, and cohesive. The agent should use `skill.md` to choose a strong aesthetic and execute it confidently. It should feel contemporary, energetic, and festival-appropriate without becoming visually chaotic.

Design priorities:

- mobile-first responsive layout
- excellent typography
- strong hierarchy
- bold but controlled color system
- tactile, polished UI
- clear status states
- high legibility in bright environments and on small screens
- lightweight motion or transitions where they add clarity

This should feel like a product someone would actually use all weekend.

## Technical Expectations

- Front-end only
- No backend
- No authentication
- No external database
- Browser local storage only
- Clean, maintainable structure
- Data parsing separated from presentation logic
- Time/status logic clearly organized and easy to update

## Suggested Information Architecture

### Data model
At minimum, each performance item should normalize to something like:

- `id`
- `artist`
- `stage`
- `day`
- `start`
- `end`
- `youtubeUrl`
- `isSaved`

### Key derived helpers
- `isLiveNow(set, now)`
- `isStartingSoon(set, now)`
- `hasConflict(set, savedSets)`
- `getCurrentLiveSets(now)`
- `getNextSavedSet(now, savedSets)`

## Out of Scope

Unless explicitly added later, do not include:

- user accounts
- cross-device sync
- server-side APIs
- ticketing
- maps
- chat/social features
- notifications requiring backend infrastructure

## Deliverable

A polished mobile-first web app that uses the provided repo files to power a personal Coachella stream planner, with strong design, clear live-status logic, and frictionless access to relevant YouTube stage streams.

## Success Criteria

The project is successful if a user can open the site on their phone and within seconds:

1. understand what is happening now
2. browse the lineup
3. save artists they care about
4. see a clean personal plan
5. jump straight to the correct livestream link

## Notes for the Agent

- Treat `Schedule.md` and `youtube_links.csv` as source-of-truth inputs.
- Treat `index.html` as a rough prototype only.
- Follow `skill.md` closely on design ambition and execution quality.
- Prefer clarity, beauty, and responsiveness over feature bloat.
- Build the app like a real consumer-facing product, not a demo.

## Nice-to-Have Future Extensions

These do not need to be in v1, but are worth noting:

- shareable custom schedule link
- export to calendar
- “only my stages” mode
- dark mode / light mode toggle
- offline-friendly caching
- artist detail drawer with thumbnails or metadata