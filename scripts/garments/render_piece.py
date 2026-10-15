# blender -b --factory-startup --python render_piece.py -- <mannequin.glb> <garment.glb> <out.png>
import math
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
body_path, piece_path, out = argv
bpy.ops.wm.read_factory_settings(use_empty=True)


def load(path, color):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    for o in objs:
        o.color = color
    return objs


objs = load(body_path, (0.82, 0.82, 0.8, 1)) + load(piece_path, (0.25, 0.27, 0.33, 1))
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
sh = scene.display.shading
sh.light = "STUDIO"
sh.color_type = "OBJECT"
sh.show_cavity = True
sh.cavity_type = "BOTH"
scene.world = bpy.data.worlds.new("w")
scene.world.color = (0.9, 0.9, 0.88)
scene.render.resolution_x = 1400
scene.render.resolution_y = 1100
roots = [o for o in bpy.data.objects if o.parent is None]
for j, rot in enumerate((-25, 180)):
    pivot = bpy.data.objects.new("pivot", None)
    scene.collection.objects.link(pivot)
    pivot.location = ((j - 0.5) * 1.0, 0, 0)
    pivot.rotation_euler.z = math.radians(rot)
    for o in roots:
        c = o.copy()
        scene.collection.objects.link(c)
        c.parent = pivot
    for o in roots:
        o.hide_render = True
cam_data = bpy.data.cameras.new("cam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = 2.1
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
cam.location = (0, -6, 1.05)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
