# Blender (background) script: exports the realistic human base meshes (Blender Human Base Meshes, CC0)
# as faceless mannequin bodies in GLB.
# blender -b --factory-startup --python export_bodies.py -- <bundle.blend> <out dir>
import os
import sys

import bpy
import bmesh

argv = sys.argv[sys.argv.index("--") + 1 :]
blend, outdir = argv[0], argv[1]
bpy.ops.wm.open_mainfile(filepath=blend)
os.makedirs(outdir, exist_ok=True)

BODIES = {"male": "GEO-body_male_realistic", "female": "GEO-body_female_realistic"}
TARGET_TRIS = 42000

for key, name in BODIES.items():
    src = bpy.data.objects.get(name)
    if not src:
        print(f"MISSING {name}")
        continue
    for m in src.modifiers:
        if m.type == "MULTIRES":
            m.levels = 2
    deps = bpy.context.evaluated_depsgraph_get()
    deps.update()
    mesh = bpy.data.meshes.new_from_object(src.evaluated_get(deps), preserve_all_data_layers=False, depsgraph=deps)
    obj = bpy.data.objects.new(f"mannequin_{key}", mesh)
    obj.matrix_world = src.matrix_world.copy()
    bpy.context.scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Centre the body: feet on the floor (z = 0), middle of the body on x = y = 0.
    xs = [v.co.x for v in mesh.vertices]
    ys = [v.co.y for v in mesh.vertices]
    zs = [v.co.z for v in mesh.vertices]
    cx, cy, z0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    for v in mesh.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= z0
    height = max(zs) - z0

    # One clean outer skin: a voxel remesh seals the eye sockets and the mouth cavity, then only the
    # largest connected piece (the body) is kept, dropping any sealed-off inner pockets.
    rem = obj.modifiers.new("skin", "REMESH")
    rem.mode = "VOXEL"
    rem.voxel_size = 0.0032
    rem.adaptivity = 0.0
    rem.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=rem.name)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    seen = set()
    islands = []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, island = [v], []
        seen.add(v.index)
        while stack:
            cur = stack.pop()
            island.append(cur)
            for e in cur.link_edges:
                o = e.other_vert(cur)
                if o.index not in seen:
                    seen.add(o.index)
                    stack.append(o)
        islands.append(island)
    islands.sort(key=len, reverse=True)
    extra = [v for isl in islands[1:] for v in isl]
    if extra:
        bmesh.ops.delete(bm, geom=extra, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    print(f"SKIN {key}: {len(islands)} pieces, kept {len(islands[0])} vertices")

    # Faceless head, like a store mannequin: pull the head onto a smooth egg shape fitted to it,
    # blending in from the neck so the join stays invisible.
    head = [v for v in mesh.vertices if v.co.z > 0.875 * height]
    hx = [v.co.x for v in head]
    hy = [v.co.y for v in head]
    hz = [v.co.z for v in head]
    c = ((min(hx) + max(hx)) / 2, (min(hy) + max(hy)) / 2 + 0.004, (min(hz) + max(hz)) / 2)
    r = ((max(hx) - min(hx)) / 2 * 0.86, (max(hy) - min(hy)) / 2 * 0.95, (max(hz) - min(hz)) / 2 * 1.0)
    def egg(co):
        dx, dy, dz = (co.x - c[0]) / r[0], (co.y - c[1]) / r[1], (co.z - c[2]) / r[2]
        return (dx * dx + dy * dy + dz * dz) ** 0.5

    lo, hi = 0.84 * height, 0.885 * height
    for v in mesh.vertices:
        if v.co.z <= lo:
            continue
        w = min(1.0, (v.co.z - lo) / (hi - lo))
        w = w * w * (3 - 2 * w)
        dx, dy, dz = (v.co.x - c[0]) / r[0], (v.co.y - c[1]) / r[1], (v.co.z - c[2]) / r[2]
        n = (dx * dx + dy * dy + dz * dz) ** 0.5 or 1.0
        tx, ty, tz = c[0] + dx / n * r[0], c[1] + dy / n * r[1], c[2] + dz / n * r[2]
        # Only pull, never push the neck outwards: keep vertices that are already inside the egg below the chin.
        if v.co.z < c[2] - r[2] * 0.55 and n < 1.0:
            continue
        v.co.x += (tx - v.co.x) * w
        v.co.y += (ty - v.co.y) * w
        v.co.z += (tz - v.co.z) * w
    vg = obj.vertex_groups.new(name="head")
    for v in mesh.vertices:
        if v.co.z > 0.82 * height:
            vg.add([v.index], min(1.0, (v.co.z - 0.82 * height) / (0.05 * height)), "REPLACE")
    sm = obj.modifiers.new("blend", "SMOOTH")
    sm.factor = 1.0
    sm.iterations = 45
    sm.vertex_group = "head"
    bpy.ops.object.modifier_apply(modifier=sm.name)
    # Remesh again: any folds the reshaping left inside the eye sockets end up inside the volume and vanish.
    rem2 = obj.modifiers.new("skin2", "REMESH")
    rem2.mode = "VOXEL"
    rem2.voxel_size = 0.0032
    rem2.adaptivity = 0.0
    bpy.ops.object.modifier_apply(modifier=rem2.name)
    obj.vertex_groups.clear()
    vg2 = obj.vertex_groups.new(name="head2")
    for v in mesh.vertices:
        if v.co.z > 0.84 * height:
            vg2.add([v.index], min(1.0, (v.co.z - 0.84 * height) / (0.04 * height)), "REPLACE")
    sm3 = obj.modifiers.new("polish", "SMOOTH")
    sm3.factor = 1.0
    sm3.iterations = 30
    sm3.vertex_group = "head2"
    bpy.ops.object.modifier_apply(modifier=sm3.name)
    # A light overall smoothing softens the sculpt into a fibreglass finish.
    sm2 = obj.modifiers.new("soften", "SMOOTH")
    sm2.factor = 0.5
    sm2.iterations = 2
    bpy.ops.object.modifier_apply(modifier=sm2.name)

    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris > TARGET_TRIS:
        dec = obj.modifiers.new("decimate", "DECIMATE")
        dec.ratio = TARGET_TRIS / tris
        bpy.ops.object.modifier_apply(modifier=dec.name)
    tri = obj.modifiers.new("tri", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=tri.name)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.vertex_groups.clear()
    dims = tuple(round(d, 3) for d in obj.dimensions)
    print(f"EXPORT {key}: tris {tris} -> {len(obj.data.polygons)}, dims {dims}")

    path = os.path.join(outdir, f"mannequin-{key}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        use_selection=True,
        export_format="GLB",
        export_apply=True,
        export_normals=True,
        export_texcoords=False,
        export_materials="NONE",
        export_yup=True,
    )
    print(f"WROTE {path} {os.path.getsize(path)} bytes")
