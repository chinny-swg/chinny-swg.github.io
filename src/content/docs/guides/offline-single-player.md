---
title: Offline Single-Player
description: Play on one Windows PC with no internet — a hidden local Core3 in WSL2 plus a launcher.
---

The [swg-offline](https://github.com/chinny-swg/swg-offline) launcher turns this fork into an offline game. Core3 runs hidden in WSL2 on the same PC, and the launcher starts it, waits until it is ready, opens your client against it, and saves and stops the server when you quit.

The SWG client holds none of the game rules, so a server still has to run. The player just never sees it.

## Requirements

- Windows 10/11, 64-bit, 8 GB RAM minimum (16 GB is comfortable).
- Your own SWGEmu-patched Pre-CU 14.1 client, with the 51 `.tre` files `conf/config.lua` lists.
- Internet once, for setup.

## Set up

1. Clone or download [swg-offline](https://github.com/chinny-swg/swg-offline).
2. In an administrator command prompt, run `windows\install.bat`. It installs WSL with Debian if needed, then runs this fork's [`linux/bootstrap.sh`](https://github.com/chinny-swg/Core3/blob/unstable/linux/bootstrap.sh) inside it, copies your `.tre` files to `/tre`, and builds Core3.
3. Start the game with `windows\SWG Offline.cmd`.

## Play styles

The launcher writes these before every boot, so the tracked Lua files stay untouched:

| Preset | Changes |
|---|---|
| Faithful | Nothing |
| Tuned solo | `globalExpMultiplier` 4, more stored pets and droids, rarer loot twice as common |
| Sandbox | Your account gets admin level 15, so the [admin commands](/reference/admin-commands/) work |

The values go in `scripts/managers/player_manager-local.lua` and `loot_manager-local.lua`. Each manager script runs its `-local.lua` after itself, the same way `conf/config-local.lua` follows `conf/config.lua`. The planet list goes in `conf/config-offline.lua`, which `config-local.lua` loads.

## Things to know

- **Fewer planets boot faster.** The launcher defaults to `tutorial`, `tatooine`, `naboo` and `corellia`, with no space zones.
- **The address isn't always `127.0.0.1`.** In WSL2's default NAT mode, `localhost` forwarding is TCP-only and SWG uses UDP, so the launcher uses the WSL VM's address. With `networkingMode=mirrored` in `.wslconfig` it uses `127.0.0.1`. Either way, the traffic never leaves the PC.
- **Always quit through the game or the launcher.** On shutdown the server receives `save` and then `exit`, so the Berkeley DB files are written cleanly.
