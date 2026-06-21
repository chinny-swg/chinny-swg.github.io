---
title: Server Deployment (Docker + Dockge)
description: Run Core3 headless on a Linux host, managed by the Dockge UI, with a custom foreground entrypoint.
---

This guide runs the Core3 server **headless and always-on** on a Linux host, managed through the [Dockge](https://github.com/louislam/dockge) stack UI. It builds on the general [Docker Deployment](/guides/docker-deployment/) notes.

**Scope:** LAN-only.

## Example target environment

- Ubuntu 24.04, 4 cores, ~15 GiB RAM, plenty of free disk.
- Docker + Compose; Dockge stacks live in `/opt/stacks` (the `louislam/dockge` container on port `5001`).
- The host's **LAN IP** is what clients connect to after login — referred to below as `<SERVER_LAN_IP>` (e.g. `192.168.1.50`).

## Why this isn't a plain `compose up`

- The Docker **image** (`swgemu/core3-dev:latest`) is only the **build environment**. It does not contain a compiled server.
- Core3 source is **cloned + compiled on first boot** into the persistent `swgemu-core3` volume (`/home/swgemu`). On a 4-core / 15 GB box that compile is ~30–90 min (`build.sh` uses `-j$(nproc)`).
- The container's default entrypoint (`/run.sh`) ends in an **interactive** `su - swgemu` shell — it will **not** stay up headless under Dockge. So Dockge needs a custom command that starts MariaDB and runs `core3` in the **foreground**.

## Plan

### Phase A — Build & seed (one-time, over SSH)

1. Clone the fork on the server, set `REPO_PUBLIC_URL=https://github.com/chinny-swg`, then `docker build` → `swgemu/core3-dev:latest`.
2. Copy your `.tre` files to the server and load them into the `shared-tre` volume (mounted `/tre:ro`).
3. Boot the container **once** with the default entrypoint → first boot clones the fork, initializes MariaDB, and writes `config-local.lua` into the `swgemu-core3` volume. **Capture the generated admin + DB passwords.** Then compile the server binary.

### Phase B — Hand off to Dockge

4. Drop a `serve.sh` into the `swgemu-core3` volume: it starts MariaDB, sets the galaxy `address`, and runs `core3` in the foreground (no `screen`/`gdb` — logs go to Dockge).
5. Create a Dockge stack that reuses the prebuilt image + both volumes, sets `GALAXY_ADDRESS`, maps ports, and runs `serve.sh`.

## Build gotchas

- **Dockerfile missing Java** → `cmake find_package(Java REQUIRED)` fails. Add `RUN apt-get install -y default-jdk-headless` before `ENTRYPOINT` in `docker/Dockerfile`. (Should be folded into the fork's Dockerfile.)
- **`build` wrapper loadavg gate broken on a 4-core box:** `max_ldavg=$(( $(nproc)/8*5 ))` = 0, so it waits forever. Call the make target directly instead:
  ```sh
  git submodule update --init --recursive
  make build-ninja-debug CMAKE_ARGS='-DENABLE_BUILD_CLIENT=OFF -DCMAKE_CXX_FLAGS="-DNDEBUG=1"'
  ```

## Ports (host → container)

| Port | Proto | Purpose |
|------|-------|---------|
| 44453 | udp | login |
| 44462 | udp | ping |
| 44463 | udp | zone |
| 44455 | tcp | status |
| 2222  | tcp | ssh into container |

## Volumes

- **`shared-tre`** — read-only client `.tre` data (survives rebuilds).
- **`swgemu-core3`** — `/home/swgemu`: source, compiled binary, MariaDB data, config. **The valuable one.**

## Credentials

First boot **generates** the passwords; capture them and store them securely (a password manager, not git). The examples below use placeholders:

- **In-game `admin` account password** (also the root/swgemu shell password): `<ADMIN_PASSWORD>`. `serve.sh` re-applies it to the DB at each server start.
- **Database (`swgemu` user) password:** `<DB_PASSWORD>`. Stored in `/home/swgemu/.my.cnf`, `config-local.lua`, and `/home/swgemu/.env` **inside the volume** — never in git.

## `serve.sh` (lives in the volume at `/home/swgemu/serve.sh`)

A custom Dockge entrypoint (first boot already done). It starts MariaDB as root, waits for it, then `setpriv` drops to `swgemu` and `exec ./core3` in the foreground — so logs stream to Dockge and `docker stop` signals reach the server. It mirrors upstream's `run` script for the galaxy address + admin-password refresh, minus `screen`/`gdb`. The image entrypoint (`/run.sh`) is pointed at it via the compose `command:`.

:::note[Staff permissions]
`serve.sh` also runs `alter table accounts alter admin_level set default 15` and sets the `admin` account to level 15 on each boot. Upstream only does this on a `run clean`. Without it, accounts (and their characters) are created at `admin_level=0` and get **no** staff skills — so `/teleport` and friends report *"command doesn't exist"* in-game.

⚠️ `godOnly` skills are awarded at **character creation**, not at login. So this only affects accounts going forward and characters created **after** the level is set. Existing characters must be **recreated**, or granted by an existing admin with `/setGodMode`. See [Admin & Console Commands → Granting admin](/reference/admin-commands/#granting-admin).
:::

## Dockge stack — `docker-compose.yaml`

Paste this into the Dockge UI. Set `GALAXY_ADDRESS` to your host's LAN IP.

```yaml
services:
  swgemu-core3:
    image: swgemu/core3-dev:latest
    container_name: swgemu-core3
    hostname: swgemu-core3
    command: ["/home/swgemu/serve.sh"]
    cap_add:
      - SYS_PTRACE
    restart: unless-stopped
    environment:
      GALAXY_NAME: swgemu-core3
      GALAXY_ADDRESS: <SERVER_LAN_IP>   # LAN IP clients connect to after login
    ports:
      - "44453:44453/udp"   # login
      - "44462:44462/udp"   # ping
      - "44463:44463/udp"   # zone
      - "44455:44455/tcp"   # status
      - "2222:2222/tcp"     # ssh into container
    volumes:
      - shared-tre:/tre:ro
      - swgemu-core3:/home/swgemu

volumes:
  shared-tre:
    external: true
  swgemu-core3:
    external: true
```

:::caution
Do **not** wipe the `swgemu-core3` volume — `serve.sh`, the compiled binary, the DB, and config all live there. With `command:` set, the image skips first boot, so a wiped volume would force you to redo the manual first-boot + compile.
:::

## Start / stop behavior

- **Start:** Dockge "deploy"/"start" → `serve.sh` → MariaDB + `core3`. Reaches `READY` (`[Core] initialized`) in ~90 s with all ground zones loaded; logs stream in the Dockge UI.
- **Stop:** `core3` does **not** handle SIGTERM/SIGINT, so Dockge "stop" hard-kills it after the grace period. The BerkeleyDB object store is crash-recoverable, so this is safe (SWGEmu servers are routinely hard-killed) — only object changes since the last periodic save tick are lost.
- **Planned clean shutdown** uses the server console `shutdown <minutes>` command (warns the galaxy + final save), but that needs an attached console, which the foreground `serve.sh` doesn't provide. See the [console caveat](/reference/admin-commands/#reaching-the-console-in-a-dockge-deploy).

## Connecting a client

Patch an original SWG client to point at `<SERVER_LAN_IP>`, login port **44453**, then create an account.
