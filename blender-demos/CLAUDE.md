# Coin Island: Blender + browser game

The user speaks Hebrew: reply in Hebrew. They have Blender installed on this machine and want to see
what Claude can build for games. This project was started in a Claude Code cloud session that could not
reach their Blender; now that you run locally, you can drive Blender directly.

## What is here

| Path | What it is |
|---|---|
| `low_poly_island.py` | Procedural Blender scene: terrain + snowy peak, ocean, 45 trees, 25 rocks, hut, campfire, 8 animated coins, sun, orbiting camera. Blender 3.6+ (tested on 5.2). |
| `web-game/index.html` | "אי המטבעות" (Coin Island): three.js third-person game on that island. Collect 8 coins against the clock. Keyboard + touch controls. |
| `web-game/island.gltf.json` | The island exported from Blender (seed 7), as single-file glTF with an embedded base64 buffer. |
| `web-game/glb_to_gltf_json.py` | Converts a `.glb` export into `island.gltf.json`. |
| `preview.png`, `preview_orbit.png` | Cycles renders of the scene (frames 1 and 120). |
| `.mcp.json` | Project MCP config for MCP for Blender (`uvx mcp-for-blender`). |

## Commands

```bash
# Build the scene, save it, export it and render a still (headless)
blender -b -P low_poly_island.py -- --seed 7 --save island.blend --export island.glb --render island.png

# Put a new island into the game
blender -b -P low_poly_island.py -- --seed 42 --export web-game/island.glb
python3 web-game/glb_to_gltf_json.py web-game/island.glb web-game/island.gltf.json

# Play locally (the loader uses fetch, so file:// will not work)
cd web-game && python3 -m http.server 8000   # open http://localhost:8000
```

If `blender` is not on PATH, find the executable first (Windows: `C:\Program Files\Blender Foundation\Blender <version>\blender.exe`;
macOS: `/Applications/Blender.app/Contents/MacOS/Blender`). Inside Blender the script also runs from the Scripting tab.

## Connecting to the user's live Blender (MCP for Blender)

`.mcp.json` registers the `blender` server; Claude Code asks the user to approve it the first time.
The user still has to do the Blender side once. Walk them through it in Hebrew:

1. Install uv (https://docs.astral.sh/uv/getting-started/installation/), restart the terminal.
2. `uvx mcp-for-blender install-addon`
3. In Blender: Edit → Preferences → Add-ons → enable "MCP for Blender".
4. In the 3D viewport press `N` → "MCP for Blender" tab → Start MCP Server. Restart Claude Code so it connects.

Project repo: https://github.com/ahujasid/blender-mcp (renamed mcp-for-blender; the old `uvx blender-mcp` still works).
Once connected you can run this project's script inside the open Blender through the server's
Python execution tool, take viewport screenshots to check your work, and import CC0 assets from Poly Haven.

## Things that will bite you

- **Blender API drift.** The script keeps working on 3.6 to 5.x on purpose:
  - Animation uses drivers (`frame`, `sin`, `pi` in simple expressions), not keyframes. The Action/fcurve API changed with slotted actions in 4.4/5.0.
  - The Principled BSDF emission input is `"Emission Color"` in 4.0+ and `"Emission"` before that.
  - EEVEE's engine id is `BLENDER_EEVEE_NEXT` in 4.2–4.x and `BLENDER_EEVEE` otherwise.
  - Geometry is built with `bmesh.ops` (`radius1`/`radius2`, which are 3.0+), not `bpy.ops`, so it also runs headless.
- **`import bpy` must come before `import bmesh`** when the script runs as the standalone `bpy` pip module.
- **glTF node names are sanitized by three.js:** `Coin.000` arrives as `Coin000`, so the game matches by prefix
  (`Tree`, `Rock`, `Coin`) and exact names (`Terrain`, `Water`, `Hut`, `Campfire`). Keep those names when changing the scene.
- **Seed** is stored as a custom property on `Terrain`, exported with `export_extras=True`, and read in the game as `node.userData.seed`.
- The game hides the exported `Water` plane and draws its own opaque ocean. A transparent one shows the square underwater edge of the terrain grid.
- three.js is pinned to **0.147.0** UMD from jsDelivr: the last release that ships `examples/js/loaders/GLTFLoader.js` (non-module).
- The game's UI is right-to-left Hebrew. Wrap numbers like `0 / 8` and times in `dir="ltr"` or `<bdi>`, or they render reversed.
- Collision is circles in XZ (trees r=0.32, rocks from their bounding box, hut r=1.25, player r=0.35). Ground height is a raycast
  against the terrain. Deep water (< -0.45) and steep slopes block movement.

## How it was verified

The Blender script ran headless on Blender 5.2 (bpy module): 86 objects, a .blend save, a GLB export and Cycles renders.
The game ran in Chromium via Playwright at 1280×720 and 390×780 (touch). Checks: loads 45 trees / 25 rocks / 8 coins,
keyboard and joystick movement, all 8 coins collect and the win panel shows, no horizontal overflow, and the player stops
exactly 0.67 m from a trunk. Real-GPU frame rate was **not** measured (the cloud box used a software renderer at ~5 fps).

## Ideas the user was offered next

Enemies or hazards, more levels/islands, a player character modelled in Blender instead of the primitive explorer,
music and sound, or a Godot version (import the GLB; consider github.com/Coding-Solo/godot-mcp for Claude ↔ Godot).
