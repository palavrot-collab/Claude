"""
Convert a .glb into a single-file glTF (JSON with the binary buffer embedded as base64).

The game loads island.gltf.json because hosts that only serve web types (like Claude
artifacts) accept .json but not .glb. Usage:
    python3 glb_to_gltf_json.py island.glb island.gltf.json
"""

import base64
import json
import struct
import sys


def convert(src, dst):
    data = open(src, "rb").read()
    if data[:4] != b"glTF":
        sys.exit(f"{src} is not a GLB file")
    json_len = struct.unpack("<I", data[12:16])[0]
    gltf = json.loads(data[20:20 + json_len])
    bin_start = 20 + json_len
    bin_len = struct.unpack("<I", data[bin_start:bin_start + 4])[0]
    binary = data[bin_start + 8:bin_start + 8 + bin_len]
    gltf["buffers"][0]["uri"] = "data:application/octet-stream;base64," + base64.b64encode(binary).decode()
    with open(dst, "w") as f:
        json.dump(gltf, f, separators=(",", ":"))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    convert(sys.argv[1], sys.argv[2])
