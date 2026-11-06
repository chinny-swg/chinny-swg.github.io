---
title: Local Server on Windows (WSL + Docker)
description: Run Core3 in Docker Desktop on your Windows PC and play on it with your SWGEmu client on the same PC.
---

This guide runs the Core3 server in a Docker container on your own Windows PC, through Docker Desktop's WSL 2 backend. You then point your SWGEmu client at it and play, all on one machine.

It uses [core3-docker](https://github.com/chinny-swg/core3-docker), a thin layer on top of the image built from Core3's own [`docker/`](https://github.com/chinny-swg/Core3/tree/unstable/docker) folder. Core3 itself stays unchanged. The layer adds two things the base image lacks: Java, which the build needs, and starting MariaDB on every boot. For general Docker background, see [Docker Deployment](/guides/docker-deployment/).

## What you need

- **Windows 10 or 11, 64-bit**, with virtualization turned on in the BIOS (WSL 2 needs it).
- **16 GB RAM** is comfortable. The compile uses 1–2 GB per job, and the server needs 6–10 GB with every planet loaded. See [requirements](/guides/overview/#system-requirements).
- **About 60 GB free disk** for the Docker image, the source, the build and the database.
- **A working SWGEmu install.** The SWGEmu launcher sets up the Pre-CU 14.1 client and its `.tre` files. The server reads the same `.tre` files.

## 1. Install WSL 2 and Docker Desktop

1. In an administrator PowerShell, run `wsl --install`, then reboot. This installs WSL 2 with an Ubuntu distro. Open **Ubuntu** from the Start menu once to create your Linux user.
2. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/). In **Settings**, check two things:
   - **General:** "Use the WSL 2 based engine" is on.
   - **Resources → WSL integration:** integration with **Ubuntu** is on.
3. Open Ubuntu and run `docker version`. Both a Client and a Server section should appear.

All the commands from here on run in the **Ubuntu** terminal, unless a step says otherwise.

:::tip[Give WSL enough memory]
WSL 2 gets half of your RAM by default, and Docker Desktop runs inside that. If you have 16 GB, raise the limit. Create `C:\Users\<you>\.wslconfig` with:

```ini
[wsl2]
memory=12GB
```

Then run `wsl --shutdown` in PowerShell and restart Docker Desktop.
:::

## 2. Get core3-docker

Clone it inside WSL's own filesystem, not under `/mnt/c`. The scripts need Linux line endings.

```sh
cd ~
git clone https://github.com/chinny-swg/core3-docker.git
cd core3-docker
```

## 3. Load your `.tre` files

Copy the client's `.tre` files into the `shared-tre` Docker volume, which the server mounts read-only at `/tre`. Windows drives appear under `/mnt/c`. Use your SWGEmu folder, for example `C:\SWGEmu` or `C:\Program Files (x86)\SWGEmu\SWGEmu`:

```sh
./load-tre.sh "/mnt/c/Program Files (x86)/SWGEmu/SWGEmu"
```

## 4. Build the images and start the container

```sh
./build.sh
docker compose up -d
docker compose logs core3
```

- **`build.sh`** builds Core3's `swgemu/core3-dev` image straight from the fork's `docker/` folder on GitHub, then the `core3-local` layer on top. This takes a while.
- **`docker compose up -d`** starts the `swgemu-core3` container in the background. Its first boot clones the chinny-swg fork, creates the MariaDB database, and writes `config-local.lua`.

:::caution[Write down the passwords]
`docker compose logs core3` shows what first boot printed. That includes a **database password** and a password for the container's `root` and `swgemu` users. They're also saved in `/home/swgemu/.env` inside the `swgemu-core3` volume. Never commit them anywhere.
:::

## 5. Compile the server

Open a shell in the container:

```sh
./shell.sh
```

Then, at the `swgemu@swgemu-core3` prompt:

```sh
build
```

The first compile takes roughly 30–90 minutes. Later builds are incremental.

If `build` keeps printing *"Waiting for loadavg to go down to 0"*, your PC has fewer than 8 logical CPUs. That's a known quirk of the wrapper (see [Building Core3](/guides/building-core3/#invoking-the-build-directly)). Run the make target directly instead:

```sh
cd ~/workspace/Core3/MMOCoreORB
git submodule update --init --recursive
make build-ninja-debug CMAKE_ARGS='-DENABLE_BUILD_CLIENT=OFF -DCMAKE_CXX_FLAGS="-DNDEBUG=1"'
```

## 6. Start the server

```sh
run
```

`run` sets the galaxy address to `127.0.0.1` (from `GALAXY_ADDRESS`). It then starts `core3` under `gdb` in a `screen` session and attaches you to its console. The server is ready when it prints `[Core] initialized`.

- **Leave it running:** detach with **Ctrl-A**, then **D**.
- **Get back to the console:** `screen -r swgemu-server`.
- **Stop the server:** type `exit` in its console. To warn players and save first, use `shutdown <minutes>` instead. See [console commands](/reference/admin-commands/#server-console-commands).

:::tip[Load fewer planets]
All 12 ground zones load by default. To boot faster and use less memory, edit the `ZonesEnabled` line in `~/workspace/Core3/MMOCoreORB/bin/conf/config-local.lua`, for example:

```lua
ZonesEnabled = { "tutorial", "tatooine", "naboo", "corellia" }
```

Then restart the server.
:::

## 7. Point the SWGEmu client at your server

Docker Desktop publishes the container's ports on Windows' own `127.0.0.1`, UDP included. That means the client on the same PC reaches the server at `127.0.0.1`.

| Port | Protocol | Used for |
|------|----------|----------|
| 44453 | UDP | Login |
| 44463 | UDP | Zone (the galaxy itself) |
| 44462 | UDP | Ping |
| 44455 | TCP | Status |

1. Let the SWGEmu launcher finish installing and updating the client.
2. In the client folder, open `swgemu_login.cfg` and set the login server:

   ```ini
   [ClientGame]
   	loginServerAddress0=127.0.0.1
   	loginServerPort0=44453
   ```

   If the folder is under `C:\Program Files (x86)`, you need an editor opened with **Run as administrator** to save this file.
3. Start the game from the launcher.

:::caution
The launcher can rewrite `swgemu_login.cfg` when it updates or scans the client. If you end up on the live SWGEmu login server again, check this file first. Starting `SWGEmu.exe` straight from the client folder skips the launcher.
:::

If Windows Firewall asks about Docker Desktop, allow it on **private** networks.

## 8. Log in

`AutoReg` is on, so the first login with a new username creates that account. The password you type becomes its password.

To get staff commands such as `/teleport`, give the account admin rights: see [Granting admin](/reference/admin-commands/#granting-admin). Staff skills are given out when a character is **created**, so set the admin level before you make the character.

## Day to day

After a reboot or a Docker Desktop restart, the container comes back by itself (`restart: unless-stopped`), and core3-docker starts MariaDB with it. The server itself doesn't start. To play again, run this in Ubuntu, from the `core3-docker` folder:

```sh
./shell.sh
run
```

Your galaxy (database, world saves and compiled server) lives in the `swgemu-core3` volume. It survives container restarts and image rebuilds. **Don't delete that volume**: `docker compose down -v`, `docker volume rm swgemu-core3` and Core3's own `./run.sh clean` all wipe it.

To pick up a newer Core3 image or core3-docker, run `git pull` and `./build.sh` again, then `docker compose up -d`. Compose recreates the container, and the volume keeps your galaxy.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| The client says it can't connect to the login server | Is the server up (`[Core] initialized`)? Does `swgemu_login.cfg` still say `127.0.0.1`? Does `docker ps` list the `swgemu-core3` container with ports `44453/udp` and `44463/udp`? |
| Login works, but the galaxy is down or connecting hangs | The galaxy address must be `127.0.0.1`. `run` sets it from `GALAXY_ADDRESS` in `~/.env`, which first boot copied from `compose.yaml`. |
| `run` can't connect to the database | MariaDB didn't start with the container. Check `docker compose logs core3` for a core3-docker warning, and start it by hand: `sudo /etc/init.d/mariadb start`. |
| The build fails at `find_package(Java)` | The container runs Core3's plain image instead of `core3-local`. Run `./build.sh`, then `docker compose up -d`. |
| The build or server is killed with no error | WSL ran out of memory. Raise `memory=` in `.wslconfig`, or load fewer planets. |
