---
title: Offline Single-Player
description: Play on one Windows PC with no internet — a launcher plus a hidden local Core3, native on SQLite or in WSL2.
---

The [swg-offline](https://github.com/chinny-swg/swg-offline) project turns this fork into an offline game. A Core3 server runs hidden on the same PC (natively as `core3.exe` on SQLite, or inside WSL2), and the launcher starts it, waits until it is ready, opens your client against it, and saves and stops the server when you quit.

The fork itself is not changed for this. swg-offline builds a pinned Core3 commit and applies its own patches (among them the SQLite backend, the preset override files, loopback-only listening and the Windows build fixes) from its [`core3/`](https://github.com/chinny-swg/swg-offline/tree/main/core3) folder.

The SWG client holds none of the game rules, so a server still has to run. The player just never sees it.

## Requirements

- Windows 10/11, 64-bit, 8 GB RAM minimum (16 GB is comfortable).
- Your own SWGEmu-patched Pre-CU 14.1 client, with the 51 `.tre` files `conf/config.lua` lists.
- Internet once, for setup.

## Set up

Pick one of two ways to run the server:

- **Native (recommended).** Download `SWGOffline-Setup` from the artifacts of swg-offline's latest [Build](https://github.com/chinny-swg/swg-offline/actions/workflows/build.yml) run and run it. It installs per user, needs nothing else, and asks for your SWG folder. The server is `core3.exe` on a SQLite file. Start the game with the SWG Offline shortcut.
- **WSL2.** Clone or download [swg-offline](https://github.com/chinny-swg/swg-offline) and run `windows\install.bat` from an administrator command prompt. It installs WSL with Debian if needed, runs this fork's [`linux/bootstrap.sh`](https://github.com/chinny-swg/Core3/blob/unstable/linux/bootstrap.sh) at the pinned commit, applies the patches, copies your `.tre` files to `/tre`, and builds Core3 with MariaDB. Start the game with `windows\SWG Offline.cmd`.

:::caution[Early]
The native server is built and smoke-tested by swg-offline's CI (it starts on SQLite, saves and shuts down), but nobody has played a full session on it yet. The WSL2 route has been tested end to end on Linux, not yet under WSL.
:::

## Play styles

The launcher writes these before every boot, so the tracked Lua files stay untouched:

| Preset | Changes |
|---|---|
| Faithful | Nothing |
| Tuned solo | `globalExpMultiplier` 4, more stored pets and droids, rarer loot twice as common |
| Sandbox | Your account gets admin level 15, so the [admin commands](/reference/admin-commands/) work |

The values go in `scripts/managers/player_manager-local.lua` and `loot_manager-local.lua`. swg-offline's patch makes each manager script run its `-local.lua` after itself, the same way `conf/config-local.lua` follows `conf/config.lua`. The planet list goes in `conf/config-offline.lua`, which `config-local.lua` loads.

## Things to know

- **Fewer planets boot faster.** The launcher defaults to `tutorial`, `tatooine`, `naboo` and `corellia`, with no space zones.
- **The address isn't always `127.0.0.1`.** The native server uses it. In WSL2's default NAT mode, `localhost` forwarding is TCP-only and SWG uses UDP, so the launcher uses the WSL VM's address. With `networkingMode=mirrored` in `.wslconfig` it uses `127.0.0.1`. Either way, the traffic never leaves the PC.
- **Always quit through the game or the launcher.** On shutdown the server receives `save` and then `exit`, so the Berkeley DB files are written cleanly.
