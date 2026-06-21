---
title: Admin & Console Commands
description: Staff slash commands, server console commands, and how to grant admin in Core3.
---

How admin/staff and server-operator commands work in Core3. There's no single upstream human-readable doc — the C++ command sources and Lua skill files are the real reference, distilled here.

**Two kinds of commands:**

1. **In-game slash commands** — typed in the chat bar (e.g. `/teleport`). Gated by your character's staff level.
2. **Server console commands** — typed into the *server console* (e.g. `shutdown`, `save`). Operational, not in-game. See [Server console commands](#server-console-commands) for how to reach the console in a Dockge deploy.

## ⚡ Cheatsheet

### In-game (chat bar) — most used

| Command | What it does |
|---------|--------------|
| `/setGodMode <name> <0-15 \| on \| off>` | Grant/revoke another player's staff level (needs `admin`) |
| `/teleport <x> <y> [planet] [z parentID]` | Teleport yourself |
| `/teleportTarget` / `/teleportto <name>` | Move your target / go to a player |
| `/kill [-area [range]] [<health> [action] [mind]]` | Kill target or area |
| `/invulnerable` | Toggle god-mode invulnerability on yourself |
| `/gmrevive [buff] [<name> \| area [range] [imperial\|rebel\|neutral]]` | Revive players |
| `/broadcast <msg>` (`-imperial`/`-rebel`/`-event`) | Server-wide message (also `broadcastArea\|Planet\|Galaxy`) |
| `/findplayer <filter>` / `/findobject <filter> <range>` | Locate players / objects |
| `/getAccountInfo [-a\|-c\|-i] <arg>` | Look up account details |
| `/kick <name> <reason>` | Kick a player |
| `/credits <amount>` / `/money` | Give credits / inspect money |
| `/grantBadge [-area [range]] <badgeId>` | Award a badge |
| `/createCreature <template>` / `/createNPC` | Spawn a creature/NPC |
| `/server info \| statistics \| weather \| market \| playermanager …` | Server-control multitool |

### Server console — operational

| Command | What it does |
|---------|--------------|
| **`shutdown <minutes> [json] [fast]`** | **Graceful shutdown**: warns the galaxy, waits N min, final save, then exits. `fast` = skip the wait. |
| `save` | Force a world/object save right now |
| `broadcast <msg>` | Galaxy broadcast from the console |
| `exit` | Stop the server (no graceful save warning — prefer `shutdown`) |
| `playercleanup` | Purge deleted characters |
| `reloadscreenplays` / `reloadmanager <name>` | Hot-reload Lua screenplays / a manager |
| `info` · `rev` · `help` | Status · revision · list all console commands |

:::tip[Graceful shutdown TL;DR]
In the server console type `shutdown 5` (5-minute warning + final save). This is *the* clean way to stop the server.
:::

## In-game slash commands (staff)

### How they work

- Typed in the in-game chat bar like any SWG command; they route through the server's QueueCommand system.
- A character can only run a command if their **staff skills** grant it. Commands are bundled into hidden `godOnly` skills, and a **staff level** grants a set of those skills.
- **Staff levels** (low → high): `player`, `intern`, `csr`, `qa`, `dev`, `ec`, `eci`, `cc`, `admin` (level 15). Defined in `MMOCoreORB/bin/scripts/staff/levels/`.

### Granting admin

- **In-game (normal path):** an existing admin runs `/setGodMode <firstName> <level | on | off>` (needs `admin` permission). The server awards/revokes the staff skills automatically and adds a name tag like `SWGEmu-Admin`.
- **DB (bootstrap path):** set `admin_level` on the account row in the `accounts` table (schema: `MMOCoreORB/sql/swgemu.sql`; valid staff values 9/10/12/15).

:::caution[Skills are granted at character creation]
`PlayerCreationManager.cpp` awards the `godOnly` skills when the account's `admin_level` is 9/10/12/15 **at the moment the character is made**. Login does **not** re-apply them. So setting `admin_level` in the DB does nothing for a character that **already exists** — you must either:

1. **Delete and recreate** the character (it picks up the skills on creation), or
2. Have an **already-admin** character run `/setGodMode <name> on`.

This is the chicken-and-egg problem: the *first* admin must be bootstrapped via DB + character recreate, because there's no existing admin to run `/setGodMode` yet.
:::

- The schema default is `admin_level = 0`. Upstream's docker `run clean` does `alter table accounts alter admin_level set default 15` so new registrations are admin; the recommended `serve.sh` does the same (see [Server Deployment](/guides/server-deployment/)).
- `/setpermission` is for **structure** permissions (houses), *not* staff levels — use `/setGodMode`.
- 🔧 **Symptom:** if `/teleport`, `/setGodMode`, etc. report *"command doesn't exist"* in-game, the character has no staff skills — it was created before its account hit a staff level. Recreate the character.

### Commands by category

**Movement / self**
- `/teleport <x> <y> [planet] [z parentID]`, `/teleportto <name>`, `/teleportTarget`, `/planetWarp(Target)`, `/goto`, `/setSpeed`, `/invulnerable`, `/harmful` / `/harmless`

**Targets / combat**
- `/kill [-area [range]] [-wounds] [<health> [action] [mind]]`, `/killPlayer`, `/freezePlayer` / `/unfreezePlayer`, `/object`, `/searchCorpse`, `/findObject`

**Player management**
- `/kick <name> <reason>`, `/grantSkill` / `/revokeSkill`, `/setExperience`, `/editBank(Account)`, `/credits` / `/money`, `/wipeItems`, `/getAccountInfo [-a|-c|-i] <arg>`, `/AddBannedPlayer <name> <reason>` / `/removeBannedPlayer`, `/setFaction(Standing)`, `/setRank`, `/setTEF`, `/gmRevive`, `/editAppearance` / `/editStats`, `/grantBadge` / `/revokeBadge`, `/setFirstName` / `/setLastName`, `/setPlayerState`, `/snoop`, veteran-reward cmds

**Server / world**
- `/broadcast [-event|-imperial|-rebel] <msg>` (also `/broadcastArea [range]`, `/broadcastPlanet`, `/broadcastGalaxy`), `/listGuilds`, `/cityInfo`, `/setLoginMessage` / `/setLoginTitle`, `/resendLoginMessageToAll`, `/setPlanetLimit`
- `/server info | statistics | weather [enable/disable/change] | market [enable/disable] | playermanager [listadmins | listjedi | setxpmodifier <value>] | pathfind <x> <y>`

**Spawning / items**
- `/createCreature`, `/createNPC`, `/createMissionElement`, `/setName` / `/setHue`, spawner start/stop, spawn time min/max, `/GenerateCraftedItem SERVERSCRIPTPATH [Quantity] [Quality] [Template]`

**Jedi**
- `/gmForceRank`, `/gmFsVillage`, `/gmJediState`, padawan-trials eligibility, `/resetJedi`

**Quests**
- list / activate / deactivate / complete / clear quests

**Debug**
- `/aiIgnore`, `/dumpTargetInformation`, `/dumpZoneInformation`, `/getObjVars`, `/combat`, `/craft`, `/forceCommand`, `/gmCreateClassResource` / `/gmCreateSpecificResource`, `/maxStats`, `/database`, `/destroy`, `/lag`, `/script`, `/server`

## Server console commands

Typed into the **server console** (stdin of the `core3` process), not in-game. The console handler lives in `src/server/ServerCore.cpp` (`addCommand(...)`).

| Command | Notes |
|---------|-------|
| `shutdown <minutes> [json] [fast]` | **Graceful**: `timedShutdown()` → warns galaxy, waits, final save, exits. `fast` skips wait; `json` dumps JSON. |
| `save` | Immediate save |
| `exit` | Stop without the graceful warning/wait |
| `broadcast <msg>` | Galaxy broadcast |
| `playercleanup` / `playercleanupstats` | Purge deleted characters / stats |
| `reloadscreenplays` / `reloadmanager <name>` | Hot-reload Lua |
| `setpvp` / `getpvp` / `setpvpmode` / `getpvpmode` | PvP toggles |
| `lock` / `unlock`, `icap` / `dcap` | Maintenance: lock logins, adjust connection cap |
| `info`, `rev`, `chars`, `loglevel`, `clearstats`, `dumpconfig` | Status / introspection |
| `swgrealms` | Custom **SWGRealmsAPI** console hook (this fork) |
| `help` | Lists every console command |

### Reaching the console in a Dockge deploy

The recommended `serve.sh` runs `core3` in the **foreground as PID 1** (so logs stream to Dockge). That means there's **no interactive console attached** — you can't type `shutdown`/`save`, and `core3` ignores SIGTERM/SIGINT, so Dockge "stop" hard-kills it (BerkeleyDB is crash-recoverable).

To get a real console (and thus graceful `shutdown` / on-demand `save`), run `core3` under `screen` instead, then attach:

```sh
docker exec -it swgemu-core3 screen -r swgemu-server   # then type: shutdown 5
```

Trade-off: server output goes to `screenlog.0` instead of the Dockge log pane.

## Repo reference (for editing/extending)

- **Command grants per skill:** `MMOCoreORB/bin/scripts/skills/staff/`
  - `admin_base` → `admin`
  - `admin_general_admin_01–03` → movement/combat god cmds
  - `admin_player_management_01–04` → player/account cmds
  - `admin_server_admin_01–02` → broadcasts, login msg, guilds, city
  - `admin_spawn_management_01–02` → spawning + crafted items
  - `admin_debug_01–03` → debug/maintenance
  - `admin_jedi_management_01` → Jedi/Force cmds
  - `admin_quest_management_01–02` → quest cmds
  - `admin_qa_basilisk` / `admin_dev_basilisk` → curated QA/dev subsets
- **Staff permission tiers:** `MMOCoreORB/bin/scripts/staff/levels/`
- **In-game command C++ (incl. usage strings):** `MMOCoreORB/src/server/zone/objects/creature/commands/`
- **In-game command Lua registration:** `MMOCoreORB/bin/scripts/commands/`
- **Server console commands:** `MMOCoreORB/src/server/ServerCore.cpp`
- **Account admin level column:** `MMOCoreORB/sql/swgemu.sql` (`accounts.admin_level`)
- **Web admin interface:** `MMOCoreORB/src/server/web/README.md`
- Note: `bin/conf/adminusers.lst` exists but appears legacy — nothing current reads it
