---
title: Local Server on Windows (WSL + Docker)
description: Run Core3 in Docker Desktop on your Windows PC and play on it with your SWGEmu client on the same PC.
---

This guide runs the Core3 server in a Docker container on your own Windows PC, through Docker Desktop's WSL 2 backend. You then point your SWGEmu client at it and play, all on one machine.

It uses the fork's own [`docker/`](https://github.com/chinny-swg/Core3/tree/unstable/docker) scripts. For general Docker background, see [Docker Deployment](/guides/docker-deployment/).

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

## 2. Get the fork and point it at chinny-swg

Clone the fork inside WSL's own filesystem, not under `/mnt/c`. The shell scripts need Linux line endings, and builds there are much faster.

```sh
cd ~
git clone https://github.com/chinny-swg/Core3.git
cd Core3/docker
```

The container's first boot clones Core3 from `REPO_PUBLIC_URL`, which defaults to upstream `swgemu`. Point it at this fork before building:

```sh
cp default-env env-run
echo 'REPO_PUBLIC_URL=https://github.com/chinny-swg' >> env-run
```

## 3. Load your `.tre` files

Copy the client's `.tre` files into the `shared-tre` Docker volume. Windows drives appear under `/mnt/c`. Use your SWGEmu folder, for example `C:\SWGEmu` or `C:\Program Files (x86)\SWGEmu\SWGEmu`:

```sh
cd "/mnt/c/Program Files (x86)/SWGEmu/SWGEmu"
tar cf - *.tre | docker run -i --rm -v shared-tre:/tre debian:bookworm bash -c 'tar xvf - -C /tre'
cd ~/Core3/docker
```

The server mounts this volume read-only at `/tre`.

## 4. Build the image and run first boot

```sh
./build.sh
./run.sh
```

- **`build.sh`** builds the `swgemu/core3-dev` image. This takes a while.
- **`run.sh`** starts the `swgemu-core3` container and drops you into a shell inside it.

The container's first boot does three things: it clones the fork, creates the MariaDB database, and writes `config-local.lua`.

:::caution[Write down the passwords]
First boot prints a **database password** and a password for the container's `root` and `swgemu` users. They're also saved in `/home/swgemu/.env` inside the `swgemu-core3` volume. Never commit them anywhere.
:::

## 5. Compile the server

Inside the container shell (the prompt is `swgemu@swgemu-core3`):

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

After a reboot or a Docker Desktop restart, the container comes back by itself (`--restart=unless-stopped`), but MariaDB and the server don't. To start playing again, run this in Ubuntu:

```sh
docker exec -it -u swgemu swgemu-core3 bash -l
sudo /etc/init.d/mariadb start
run
```

Your galaxy (database, world saves and compiled server) lives in the `swgemu-core3` volume. It survives container restarts and image rebuilds. **Don't delete that volume**: `./run.sh clean` does, and wipes everything.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| The client says it can't connect to the login server | Is the server up (`[Core] initialized`)? Does `swgemu_login.cfg` still say `127.0.0.1`? Does `docker ps` list the `swgemu-core3` container with ports `44453/udp` and `44463/udp`? |
| Login works, but the galaxy is down or connecting hangs | The galaxy address must be `127.0.0.1`. `run` sets it from `GALAXY_ADDRESS` in `~/.env`. |
| `run` can't connect to the database | Start MariaDB first: `sudo /etc/init.d/mariadb start`. |
| The build fails at `find_package(Java)` | Your image was built from a fork checkout from before Java was added to `docker/Dockerfile`. Run `git pull`, then `./build.sh`, then `docker container rm -f swgemu-core3` and `./run.sh` to recreate the container. The volume keeps your data. |
| The build or server is killed with no error | WSL ran out of memory. Raise `memory=` in `.wslconfig`, or load fewer planets. |
