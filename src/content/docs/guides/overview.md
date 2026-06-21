---
title: Overview & Requirements
description: What SWGEmu Core3 is, the repository layout, and the hardware/software you need to build and run it.
---

## What it is

- **SWGEmu** recreates **Pre-CU** *Star Wars Galaxies* (before the 2005 Combat Upgrade) via a reverse-engineered server emulator.
- **Core3** is the server software: a **C++ engine** plus **Lua game scripts**.
- It requires `.tre` data files from an **original SWG client**. Players connect with a patched original client.

This documentation covers the [`chinny-swg/Core3`](https://github.com/chinny-swg/Core3) fork of [`swgemu/Core3`](https://github.com/swgemu/Core3) (branch `unstable`), which carries custom **SWGRealmsAPI** work.

## How the pieces fit

There are two distinct things that are easy to confuse:

- **The Docker image** (`swgemu/core3-dev`) is only the **build environment** — clang, MariaDB, boost, lua, etc. It does **not** contain a compiled server.
- **The server binary** is **cloned and compiled on first boot** into a persistent volume. This compile is the heavy, one-time step.

Understanding that split explains why deployment isn't a plain `docker compose up` — see [Server Deployment](/guides/server-deployment/).

## Repository layout (the parts you'll touch)

| Path | What's there |
|------|--------------|
| `MMOCoreORB/src/` | C++ server source (engine, zone, commands) |
| `MMOCoreORB/bin/scripts/` | Lua game scripts (commands, skills, screenplays, staff levels) |
| `MMOCoreORB/bin/conf/config.lua` | Server config (zones enabled, login message, etc.) |
| `MMOCoreORB/sql/swgemu.sql` | DB schema (accounts, `admin_level` column) |
| `docker/` | Container build/run scripts |

## System requirements

For a private / solo server:

- **Recommended:** 8+ cores, 16 GB RAM, ~60 GB free SSD.
- **Minimum:** 4 cores / 8 GB / 50 GB.
- **The build is the RAM hog** — roughly 1–2 GB per compile job. On a 4-core / 15 GB box the compile takes ~30–90 minutes.
- **Runtime:** ~6–10 GB with all default zones. Trim `ZonesEnabled` / `SpaceZonesEnabled` in `conf/config.lua` to shrink it (a solo setup with the tutorial + a few planets needs only a few GB).
- **First boot** does a one-time, CPU-heavy navmesh generation.
- **Disk total** ≈ 30–50 GB (image + builds + DB volume + ~5 GB of `.tre` files).

## Prerequisites

- **Docker** (daemon or Docker Desktop) — for the containerized path.
- A **Java JDK** — for a native build the IDL compiler needs it (`default-jre` / `default-jdk-headless`).
- **`.tre` files** from an original SWG client (a few GB; you must supply these yourself).

## Next steps

- [Building Core3](/guides/building-core3/) — native build and Docker image build.
- [Docker Deployment](/guides/docker-deployment/) — run the server in a container.
- [Server Deployment (Dockge)](/guides/server-deployment/) — run it headless on a Linux host.
- [Admin & Console Commands](/reference/admin-commands/) — operate the running server.
