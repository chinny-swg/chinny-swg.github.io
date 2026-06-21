---
title: Building Core3
description: Compile Core3 natively on WSL/Debian, or build the Docker build-environment image.
---

There are two ways to build: a **native build** (good for development on WSL/Debian) and the **Docker image** (the build environment used for containerized deployment).

## Native build (WSL / Debian)

- **Missing Java SDK breaks the build.** The Core3 IDL compiler needs a JDK. Install it first:
  ```sh
  sudo apt install default-jre
  ```
- Verified to build on **Debian 11/12** as well (VirtualBox/VMware).
- **RAM is the bottleneck.** Each compile job uses ~1–2 GB. On WSL2 (often ~15 GB visible), a high job count such as `-j24` may OOM — cap jobs (e.g. `-j8`) or raise `memory=` in `C:\Users\<you>\.wslconfig`.

### Pulling submodules

Core3 uses git submodules. Before building:

```sh
git submodule update --init --recursive
```

### Invoking the build directly

The repo ships a `build` wrapper, but it has a **loadavg gate that misbehaves on small core counts**: `max_ldavg=$(( $(nproc)/8*5 ))` evaluates to `0` on a 4-core box (integer division), so it waits forever for a load average ≤ 0.

Work around it by calling the make target directly:

```sh
make build-ninja-debug CMAKE_ARGS='-DENABLE_BUILD_CLIENT=OFF -DCMAKE_CXX_FLAGS="-DNDEBUG=1"'
```

:::tip
On a 4-core / 15 GB host, a full `build-ninja-debug` compiles all ~1,500 targets in well under an hour and produces a `core3` binary a few hundred MB in size.
:::

## Docker image build

The Docker image is the **build environment** (clang, MariaDB, boost, lua…), not a compiled server. Build it from the `docker/` directory:

```sh
cd ~/repos/chinny-swg/Core3/docker && ./build.sh
```

### Java in the Dockerfile

Stock builds can fail at `cmake` with **`find_package(Java REQUIRED)` → "Could NOT find Java"**. Ensure a JDK is installed in the image — add this before the `ENTRYPOINT` in `docker/Dockerfile`:

```dockerfile
RUN apt-get install -y default-jdk-headless
```

(That installs OpenJDK; the fix should be folded into the fork's Dockerfile.)

## Next

Once you can build, continue to [Docker Deployment](/guides/docker-deployment/) to run the server.
