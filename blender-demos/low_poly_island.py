"""
Low-poly game island — procedural scene generator for Blender 3.6+ (tested on 5.2).

Builds a stylised island ready for a game: terrain, water, trees, rocks, a hut,
a campfire, spinning collectible coins, lighting and an orbiting camera.

Run inside Blender:   Scripting tab -> Open -> this file -> Run Script
Run from terminal:    blender -b -P low_poly_island.py -- --save island.blend --export island.glb --render island.png
Options (after --):   --seed N   --save PATH.blend   --export PATH.glb   --render PATH.png
"""

import math
import random
import sys

import bpy  # must come before bmesh when run as the standalone bpy module
import bmesh
from mathutils import Matrix, Vector, noise

ISLAND_RADIUS = 14.0
GRID_SEGMENTS = 64
WATER_LEVEL = 0.0


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    opts = {"seed": 7, "save": None, "export": None, "render": None}
    for i, arg in enumerate(argv[:-1]):
        key = arg.lstrip("-")
        if key in opts:
            opts[key] = int(argv[i + 1]) if key == "seed" else argv[i + 1]
    return opts


# ---------------------------------------------------------------- scene setup

def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.lights,
                 bpy.data.cameras, bpy.data.curves):
        for block in list(coll):
            if block.users == 0:
                coll.remove(block)


def make_material(name, color, roughness=0.8, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)  # colour in Solid viewport
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        # Input was renamed "Emission" -> "Emission Color" in Blender 4.0
        emit = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        emit.default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def build_materials():
    return {
        "sand": make_material("Sand", (0.85, 0.72, 0.45)),
        "grass": make_material("Grass", (0.25, 0.55, 0.18)),
        "rock": make_material("Rock", (0.42, 0.40, 0.38), 0.9),
        "snow": make_material("Snow", (0.92, 0.94, 0.97), 0.6),
        "water": make_material("Water", (0.05, 0.35, 0.65), 0.05),
        "bark": make_material("Bark", (0.35, 0.20, 0.10)),
        "leaves": make_material("Leaves", (0.12, 0.42, 0.15)),
        "leaves_light": make_material("LeavesLight", (0.30, 0.60, 0.20)),
        "wood": make_material("Wood", (0.55, 0.35, 0.18)),
        "roof": make_material("Roof", (0.65, 0.20, 0.12)),
        "gold": make_material("Gold", (1.0, 0.75, 0.15), 0.25,
                              emission=(1.0, 0.6, 0.1), strength=0.6),
        "fire": make_material("Fire", (1.0, 0.45, 0.05), 1.0,
                              emission=(1.0, 0.4, 0.05), strength=8.0),
    }


def new_object(name, bm, materials, collection):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for mat in materials:
        mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def track_new_faces(bm, build, material_index):
    """Run a bmesh.ops builder and assign a material slot to the faces it adds."""
    before = set(bm.faces)
    build()
    for face in set(bm.faces) - before:
        face.material_index = material_index


def get_collection(name):
    coll = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(coll)
    return coll


# --------------------------------------------------------------- terrain

def terrain_height(x, y, seed):
    d = math.hypot(x, y) / ISLAND_RADIUS
    falloff = 1.0 - d * d
    bumps = noise.noise(Vector((x * 0.18, y * 0.18, seed))) * 1.6
    ridges = abs(noise.noise(Vector((x * 0.07, y * 0.07, seed + 10)))) * 4.0
    mountain = 5.5 * math.exp(-((x - 5.0) ** 2 + (y - 4.0) ** 2) / 14.0)
    return (falloff * 2.2 + bumps * max(falloff, 0) + ridges * max(falloff, 0) ** 2
            + mountain - 0.6)


def build_terrain(mats, seed, coll):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=GRID_SEGMENTS, y_segments=GRID_SEGMENTS,
                          size=ISLAND_RADIUS * 1.25)
    for v in bm.verts:
        v.co.z = terrain_height(v.co.x, v.co.y, seed)
    # Colour each face by its height, like a low-poly game map
    for f in bm.faces:
        z = f.calc_center_median().z
        f.material_index = 0 if z < 0.45 else 1 if z < 2.6 else 2 if z < 3.6 else 3
    obj = new_object("Terrain", bm,
                     [mats["sand"], mats["grass"], mats["rock"], mats["snow"]], coll)

    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=ISLAND_RADIUS * 4)
    water = new_object("Water", bm, [mats["water"]], coll)
    water.location.z = WATER_LEVEL
    return obj


# ----------------------------------------------------------------- props

def build_tree(mats, loc, rng, coll, index):
    bm = bmesh.new()
    height = rng.uniform(1.6, 2.6)
    track_new_faces(bm, lambda: bmesh.ops.create_cone(
        bm, cap_ends=True, segments=6, radius1=0.16, radius2=0.12, depth=height * 0.4,
        matrix=Matrix.Translation((0, 0, height * 0.2))), 0)
    for layer in range(3):
        r = (0.9 - layer * 0.22) * height / 2.2
        z = height * 0.35 + layer * height * 0.25
        track_new_faces(bm, lambda r=r, z=z: bmesh.ops.create_cone(
            bm, cap_ends=True, segments=7, radius1=r, radius2=0.0, depth=height * 0.45,
            matrix=Matrix.Translation((0, 0, z + height * 0.22))), 1 + layer % 2)
    obj = new_object(f"Tree.{index:03d}", bm,
                     [mats["bark"], mats["leaves"], mats["leaves_light"]], coll)
    obj.location = loc
    obj.rotation_euler.z = rng.uniform(0, math.tau)
    return obj


def build_rock(mats, loc, rng, coll, index):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    for v in bm.verts:
        v.co *= rng.uniform(0.75, 1.15)
    obj = new_object(f"Rock.{index:03d}", bm, [mats["rock"]], coll)
    s = rng.uniform(0.25, 0.7)
    obj.scale = (s * rng.uniform(1.0, 1.6), s, s * rng.uniform(0.5, 0.9))
    obj.location = loc
    obj.rotation_euler = (rng.uniform(0, 0.4), rng.uniform(0, 0.4), rng.uniform(0, math.tau))
    return obj


def build_hut(mats, loc, coll):
    bm = bmesh.new()
    track_new_faces(bm, lambda: bmesh.ops.create_cube(
        bm, size=1.0, matrix=Matrix.Translation((0, 0, 0.5)) @ Matrix.Diagonal((2.0, 1.6, 1.2, 1.0))), 0)
    # Four-sided cone rotated 45 degrees = pyramid roof
    roof = Matrix.Translation((0, 0, 1.75)) @ Matrix.Rotation(math.pi / 4, 4, "Z") @ Matrix.Diagonal((1.0, 0.8, 1.0, 1.0))
    track_new_faces(bm, lambda: bmesh.ops.create_cone(
        bm, cap_ends=True, segments=4, radius1=1.75, radius2=0.0, depth=1.1, matrix=roof), 1)
    track_new_faces(bm, lambda: bmesh.ops.create_cube(
        bm, size=1.0, matrix=Matrix.Translation((0, -0.81, 0.45)) @ Matrix.Diagonal((0.5, 0.05, 0.9, 1.0))), 2)
    obj = new_object("Hut", bm, [mats["wood"], mats["roof"], mats["bark"]], coll)
    obj.location = loc
    obj.rotation_euler.z = math.radians(-20)
    return obj


def build_campfire(mats, loc, coll):
    bm = bmesh.new()
    for i in range(4):
        rot = Matrix.Rotation(i * math.pi / 4, 4, "Z") @ Matrix.Rotation(math.pi / 2, 4, "X")
        track_new_faces(bm, lambda rot=rot: bmesh.ops.create_cone(
            bm, cap_ends=True, segments=6, radius1=0.07, radius2=0.07, depth=0.9,
            matrix=Matrix.Translation((0, 0, 0.08)) @ rot), 0)
    track_new_faces(bm, lambda: bmesh.ops.create_cone(
        bm, cap_ends=True, segments=5, radius1=0.25, radius2=0.0, depth=0.6,
        matrix=Matrix.Translation((0, 0, 0.4))), 1)
    obj = new_object("Campfire", bm, [mats["bark"], mats["fire"]], coll)
    obj.location = loc

    light = bpy.data.lights.new("FireLight", "POINT")
    light.color = (1.0, 0.55, 0.2)
    light.energy = 250
    lamp = bpy.data.objects.new("FireLight", light)
    lamp.location = loc + Vector((0, 0, 0.8))
    coll.objects.link(lamp)
    return obj


def add_driver(obj, path, index, expression):
    # Drivers instead of keyframes: no fcurve API differences between Blender versions,
    # and simple expressions like these run without enabling Python auto-exec.
    fcurve = obj.driver_add(path, index)
    fcurve.driver.type = "SCRIPTED"
    fcurve.driver.expression = expression


def build_coin(mats, loc, coll, index):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.35, radius2=0.35,
                          depth=0.08, matrix=Matrix.Rotation(math.pi / 2, 4, "X"))
    obj = new_object(f"Coin.{index:03d}", bm, [mats["gold"]], coll)
    obj.location = loc
    add_driver(obj, "rotation_euler", 2, f"frame / 12 + {index}")
    add_driver(obj, "location", 2, f"{loc.z:.3f} + sin(frame / 10 + {index}) * 0.15")
    return obj


def scatter(rng, seed, count, z_min, z_max, keep_out):
    points, tries = [], 0
    while len(points) < count and tries < count * 200:
        tries += 1
        a, r = rng.uniform(0, math.tau), ISLAND_RADIUS * math.sqrt(rng.random())
        x, y = math.cos(a) * r, math.sin(a) * r
        z = terrain_height(x, y, seed)
        p = Vector((x, y, z))
        if z_min < z < z_max and all((p.xy - k.xy).length > d for k, d in keep_out):
            points.append(p)
            keep_out.append((p, 0.9))
    return points


# ------------------------------------------------------- light and camera

def build_lighting_and_camera(coll):
    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 3.5
    sun_data.angle = math.radians(3)
    sun = bpy.data.objects.new("Sun", sun_data)
    sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
    coll.objects.link(sun)

    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.45, 0.68, 0.95, 1.0)
    bg.inputs["Strength"].default_value = 0.9

    pivot = bpy.data.objects.new("CameraPivot", None)
    coll.objects.link(pivot)
    add_driver(pivot, "rotation_euler", 2, "frame * 2 * pi / 240")

    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = 32
    cam = bpy.data.objects.new("Camera", cam_data)
    cam.location = (0, -28, 15)
    cam.parent = pivot
    track = cam.constraints.new("TRACK_TO")
    track.target = pivot
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    coll.objects.link(cam)
    bpy.context.scene.camera = cam


def configure_render(scene):
    # EEVEE's identifier changed in 4.2 (EEVEE_NEXT) and back in 5.0
    for engine in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    scene.view_settings.view_transform = "Standard"  # punchier flat colours than Filmic/AgX
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    scene.frame_start, scene.frame_end = 1, 240


# ------------------------------------------------------------------ main

def main():
    opts = parse_args()
    seed = opts["seed"]
    rng = random.Random(seed)

    clear_scene()
    mats = build_materials()
    env, props, pickups = get_collection("Environment"), get_collection("Props"), get_collection("Pickups")

    build_terrain(mats, seed, env)

    hut_pos = scatter(rng, seed, 1, 0.9, 1.8, [])[0]
    build_hut(mats, hut_pos, props)
    fire_pos = hut_pos + Vector((2.2, -1.8, 0))
    fire_pos.z = terrain_height(fire_pos.x, fire_pos.y, seed)
    build_campfire(mats, fire_pos, props)

    keep_out = [(hut_pos, 3.0), (fire_pos, 1.5)]
    for i, p in enumerate(scatter(rng, seed, 45, 0.5, 2.6, keep_out)):
        build_tree(mats, p, rng, props, i)
    for i, p in enumerate(scatter(rng, seed, 25, 0.1, 4.5, keep_out)):
        build_rock(mats, p, rng, props, i)
    for i, p in enumerate(scatter(rng, seed, 8, 0.3, 2.5, keep_out)):
        build_coin(mats, p + Vector((0, 0, 0.7)), pickups, i)

    build_lighting_and_camera(env)
    scene = bpy.context.scene
    configure_render(scene)
    scene.frame_set(1)

    if opts["save"]:
        bpy.ops.wm.save_as_mainfile(filepath=bpy.path.abspath(opts["save"]))
    if opts["export"]:
        bpy.ops.export_scene.gltf(filepath=bpy.path.abspath(opts["export"]), export_format="GLB",
                                  export_apply=True, export_lights=True)
    if opts["render"]:
        scene.render.filepath = bpy.path.abspath(opts["render"])
        bpy.ops.render.render(write_still=True)

    print(f"Island built with seed {seed}: {len(bpy.data.objects)} objects")


if __name__ == "__main__":
    main()
