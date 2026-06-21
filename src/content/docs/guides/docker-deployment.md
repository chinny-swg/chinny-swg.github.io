---
title: Docker Deployment
description: Run the Core3 server in Docker — load .tre files, point the build at your fork, build, and run.
---

This is the general Docker workflow for a private server. For a headless, always-on deployment managed by a UI, see [Server Deployment (Dockge)](/guides/server-deployment/).

## Prerequisites

- Docker (daemon or Docker Desktop).
- `.tre` files from an original SWG client.

## Key concept

The Docker **image** is only the **build environment**. Core3 source is **cloned and compiled on first container boot** into a persistent volume. Plan for that one-time compile (see [requirements](/guides/overview/#system-requirements)).

## Deploy steps

### 1. Load `.tre` files into the `shared-tre` volume

```sh
cd <dir-with-tre-files>
tar cf - *.tre | docker run -i --rm -v shared-tre:/tre debian:bullseye \
  bash -c 'tar xvf - -C /tre'
```

### 2. Point first-boot at your fork

By default, first boot clones `https://github.com/swgemu/Core3`, **not** your fork. After `build.sh` creates `docker/env-run`, add:

```sh
REPO_PUBLIC_URL=https://github.com/chinny-swg
```

(Alternatively, after first boot, re-point the `workspace/Core3` remote to your fork, check out `unstable`, and rebuild.)

### 3. Build the image

```sh
cd ~/repos/chinny-swg/Core3/docker && ./build.sh
```

### 4. Run the container

```sh
./run.sh
```

This drops you into an interactive shell inside the container. First boot clones the fork, initializes MariaDB, and writes a local config into the persistent volume.

:::caution[Capture generated credentials]
First boot generates an **admin account password** and a **database password** and writes them into the persistent volume (e.g. `config-local.lua`, `.my.cnf`, `.env`). Record them somewhere safe — you'll need the admin password to log in, and they live only inside the volume.
:::

## Ports

| Port | Proto | Purpose |
|------|-------|---------|
| 44453 | udp | login |
| 44462 | udp | ping |
| 44463 | udp | zone |
| 44455 | tcp | status |
| 2222  | tcp | ssh into container |

## Volumes

- **`shared-tre`** — read-only client `.tre` data (survives rebuilds).
- **`swgemu-core3`** — `/home/swgemu`: source, compiled binary, MariaDB data, config. **This is the valuable one — don't wipe it.**

## Connecting a client

Patch an original SWG client to point at your server's address with login port **44453**, then create an account.
