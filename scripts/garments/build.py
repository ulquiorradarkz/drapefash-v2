# Drape garment builder (Blender 4.5, background).
#
# Tops, jackets and trousers start from the realistic base mesh's quad topology for their region, projected
# onto the mannequin; skirts, dresses, shoes and hats are lofted from the body's cross-sections. Each piece is
# shaped the way fabric hangs: every horizontal slice goes out to the convex hull of the body's cross-section
# (cloth bridges the spine, the abs, the seat, the gap between the thighs) and below the chest / seat / hips it
# falls like a curtain (a little for fitted cuts, fully for oversized and baggy ones). Extra length is added
# and a cloth simulation (pinned at the shoulders, waistband or neckline, body and floor as colliders) buckles
# it into folds. Then ambient occlusion is baked into vertex colours and every piece is exported as a GLB with:
#   TEXCOORD_0  front projection (x/H + 0.5, z/H); shoes use a side projection (y/H + 0.5, z/H)
#   TEXCOORD_1  (sleeve code, rest height z/H): 0 off the sleeves, 0.05 bag strap, 0.1 at the armpit .. 1.0 at the wrist
#   COLOR_0     ambient occlusion
#
# blender -b --factory-startup --python build.py -- <hbm.blend> <mannequin dir> <out dir> <body> <pieces,...> [preview] [export]
import math
import os
import random
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1 :]
BLEND = os.path.abspath(argv[0])
MANNEQUINS = os.path.abspath(argv[1])
OUT = os.path.abspath(argv[2])
BODY = argv[3]
WANTED = argv[4].split(",")
FLAGS = set(argv[5:])
os.makedirs(OUT, exist_ok=True)
random.seed(7)

# Landmarks measured from horizontal slices of each body (metres, z up, front is -y).
LM = {
    "male": dict(
        src="GEO-body_male_realistic",
        neck=1.430, neck_y=-0.005, neck_rx=0.072, neck_ry=0.072,
        shoulder=1.362, shoulder_x=0.205, armpit=1.205, armpit_x=0.172, chest=1.27, wrist=0.965,
        waist=1.020, hip=0.905, seat=0.86, crotch=0.725, knee=0.480, ankle=0.105, head_band=1.572, strap_x=0.095,
        arm_gap=[(1.205, 0.172), (1.18, 0.180), (1.10, 0.196), (1.02, 0.212), (0.98, 0.222), (0.90, 0.250), (0.70, 0.250)],
    ),
    "female": dict(
        src="GEO-body_female_realistic",
        neck=1.392, neck_y=-0.008, neck_rx=0.064, neck_ry=0.066,
        shoulder=1.325, shoulder_x=0.195, armpit=1.195, armpit_x=0.147, chest=1.215, wrist=0.880,
        waist=1.040, hip=0.925, seat=0.88, crotch=0.745, knee=0.465, ankle=0.095, head_band=1.512, strap_x=0.085,
        arm_gap=[(1.195, 0.147), (1.16, 0.150), (1.12, 0.152), (1.04, 0.160), (0.96, 0.192), (0.92, 0.212), (0.70, 0.230)],
    ),
}

# ease: distance from the hull (m). curtain: 0 follows the waist, 1 falls straight from the chest / seat / hips.
# grow: extra length the drape compresses into folds. hem: fraction of body height.
PIECES = {
    "top_fitted": dict(kind="top", skim=1, ease=0.008, sleeve_ease=0.008, curtain=0.15, hem=0.530, grow=1.0, bend=0.3, mass=0.15, comp=8, frames=30),
    "top_regular": dict(kind="top", skim=4, ease=0.012, sleeve_ease=0.012, curtain=0.65, hem=0.512, grow=1.035, bend=0.4, mass=0.2, comp=5),
    "top_oversized": dict(kind="top", skim=6, ease=0.034, sleeve_ease=0.030, curtain=1.0, hem=0.488, grow=1.06, bend=0.5, mass=0.24, comp=3, drop=0.04),
    "outer_regular": dict(kind="top", outer=True, skim=6, ease=0.026, sleeve_ease=0.022, curtain=0.95, hem=0.505, grow=1.025, bend=3.0, mass=0.45, comp=8, collar=0.032, frames=45),
    "outer_puffer": dict(kind="top", outer=True, skim=8, ease=0.050, sleeve_ease=0.046, curtain=1.0, hem=0.525, grow=1.0, bend=6.0, mass=0.35, comp=14, collar=0.04, quilt=0.085, frames=24),
    "bottom_slim": dict(kind="bottom", skim=1, ease=0.003, leg_ease=0.003, hem_ease=0.0, curtain=0.15, grow=1.015, bend=1.2, mass=0.3, comp=6),
    "bottom_straight": dict(kind="bottom", skim=3, ease=0.006, leg_ease=0.012, hem_ease=0.006, curtain=0.45, grow=1.03, bend=1.6, mass=0.36, comp=3),
    "bottom_baggy": dict(kind="bottom", skim=4, ease=0.010, leg_ease=0.028, hem_ease=0.012, curtain=1.0, grow=1.07, bend=2.0, mass=0.42, comp=1.5),
    "skirt_mini": dict(kind="skirt", ease=0.006, flare=0.18, hem_drop=0.15, curtain=1.0, grow=1.0, bend=0.8, mass=0.22, comp=4),
    "skirt_midi": dict(kind="skirt", ease=0.008, flare=0.12, hem_drop=0.52, curtain=1.0, grow=1.015, bend=0.5, mass=0.25, comp=3),
    "dress_mini": dict(kind="dress", ease=0.004, flare=0.12, hem_drop=0.17, curtain=0.35, grow=1.0, bend=0.4, mass=0.2, comp=4),
    "dress_long": dict(kind="dress", ease=0.006, flare=0.16, hem_drop=0.80, curtain=1.0, grow=1.01, bend=0.35, mass=0.22, comp=3),
    "shoes": dict(kind="shoes"),
    "hat_beanie": dict(kind="hat"),
    "hat_cap": dict(kind="hat", brim=True),
    "bag": dict(kind="bag"),
}

NANG = 96
# Garments start this far from the skin: beyond the collider's reach (cloth distance 3 mm + body 2 mm),
# so nothing is shoved outwards on the first frame (that step crumples into a ridge).
CLEAR = 0.006
ANG = np.linspace(-math.pi, math.pi, NANG, endpoint=False)


def log(*a):
    print("[drape]", *a, flush=True)


def interp(table, z):
    table = sorted(table)
    if z <= table[0][0]:
        return table[0][1]
    for (z0, b0), (z1, b1) in zip(table, table[1:]):
        if z <= z1:
            return b0 + (b1 - b0) * (z - z0) / (z1 - z0)
    return table[-1][1]


def clamp01(v):
    return min(1.0, max(0.0, v))


def smoothstep(v):
    v = clamp01(v)
    return v * v * (3 - 2 * v)


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


# ------------------------------------------------------------------ bodies

def load_body(key):
    lm = LM[key]
    src = bpy.data.objects[lm["src"]]
    for m in src.modifiers:
        if m.type == "MULTIRES":
            m.levels = 2
    deps = bpy.context.evaluated_depsgraph_get()
    ev = src.evaluated_get(deps)
    me = ev.to_mesh()
    mw = src.matrix_world
    co = np.array([tuple(mw @ v.co) for v in me.vertices])
    ev.to_mesh_clear()
    cx, cy, z0 = (co[:, 0].min() + co[:, 0].max()) / 2, (co[:, 1].min() + co[:, 1].max()) / 2, co[:, 2].min()
    base = src.data.copy()
    base.transform(mw)
    base.transform(Matrix.Translation((-cx, -cy, -z0)))
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MANNEQUINS, f"mannequin-{key}.glb"))
    new = [o for o in bpy.data.objects if o not in before]
    body = [o for o in new if o.type == "MESH"][0]
    mwb = body.matrix_world.copy()
    body.parent = None
    body.matrix_world = mwb
    for o in new:
        if o is not body:
            bpy.data.objects.remove(o)
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    body.name = f"body_{key}"
    log(key, "base verts", len(base.vertices), "mannequin verts", len(body.data.vertices), "dims", tuple(round(d, 3) for d in body.dimensions))
    return base, body


def bvh_of(*objs):
    bm = bmesh.new()
    for o in objs:
        tmp = bmesh.new()
        tmp.from_mesh(o.data)
        tmp.transform(o.matrix_world)
        me = bpy.data.meshes.new("tmp")
        tmp.to_mesh(me)
        tmp.free()
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    tree = BVHTree.FromBMesh(bm)
    bm.free()
    return tree


def get_co(obj):
    a = np.empty(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get("co", a)
    return a.reshape(-1, 3)


def set_co(obj, co):
    obj.data.vertices.foreach_set("co", np.ascontiguousarray(co).reshape(-1))
    obj.data.update()


def is_arm(lm, x, z):
    ax = abs(x)
    if z > lm["shoulder"] + 0.02:
        return False
    if z >= lm["armpit"]:
        t = (z - lm["armpit"]) / (lm["shoulder"] - lm["armpit"])
        return ax > lm["armpit_x"] + (lm["shoulder_x"] - lm["armpit_x"]) * min(1.0, t)
    return ax > interp(lm["arm_gap"], z)


# ------------------------------------------------------------------ cross-section hulls

def hull2d(pts):
    P = sorted(set(map(tuple, np.round(pts, 5))))
    if len(P) < 3:
        return np.array(P)

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in P:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(P):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return np.array(lower[:-1] + upper[:-1])


def radial(poly, c):
    """Distance from c to the polygon boundary along each angle of ANG."""
    p = poly - c
    q = np.roll(p, -1, axis=0)
    e = q - p
    d = np.stack([np.cos(ANG), np.sin(ANG)], 1)
    den = d[:, None, 0] * (-e[None, :, 1]) - d[:, None, 1] * (-e[None, :, 0])
    den = np.where(np.abs(den) < 1e-12, 1e-12, den)
    t = (p[None, :, 0] * (-e[None, :, 1]) - p[None, :, 1] * (-e[None, :, 0])) / den
    s = (d[:, None, 0] * p[None, :, 1] - d[:, None, 1] * p[None, :, 0]) / den
    ok = (t >= 0) & (s >= -1e-6) & (s <= 1 + 1e-6)
    return np.where(ok, t, 0).max(1)


class Profile:
    """Convex cross-sections of part of the body, every `step` metres of height."""

    def __init__(self, pts, z0, z1, step=0.01, half=0.007, center=None):
        self.zs, self.cs, self.rs = [], [], []
        z = z0
        while z <= z1 + 1e-9:
            sl = pts[np.abs(pts[:, 2] - z) < half]
            if len(sl) >= 6:
                h = hull2d(sl[:, :2])
                if len(h) >= 3:
                    c = np.array([(h[:, 0].min() + h[:, 0].max()) / 2, (h[:, 1].min() + h[:, 1].max()) / 2]) if center is None else np.array(center)
                    self.zs.append(z)
                    self.cs.append(c)
                    self.rs.append(radial(h, c))
            z += step
        self.zs = np.array(self.zs)
        self.cs = np.array(self.cs)
        self.rs = np.array(self.rs)

    def dilate(self, k):
        """Widest radius within +-k slices: the cloth skims over small dips (abs, ribs, the small of the back)."""
        if k > 0:
            self.rs = np.array([self.rs[max(0, i - k) : i + k + 1].max(0) for i in range(len(self.rs))])
        return self

    def smooth_r(self, k):
        if k > 0:
            self.rs = np.array([self.rs[max(0, i - k) : i + k + 1].mean(0) for i in range(len(self.rs))])
        return self

    def smooth_centers(self, k):
        if k > 0:
            self.cs = np.array([self.cs[max(0, i - k) : i + k + 1].mean(0) for i in range(len(self.cs))])
        return self

    def curtain(self, z_top):
        """Radius that never shrinks going down from z_top (cloth hanging from the widest part above)."""
        out = self.rs.copy()
        top = min(max(int(np.searchsorted(self.zs, z_top)), 0), len(self.zs) - 1)
        for k in range(top - 1, -1, -1):
            out[k] = np.maximum(out[k], out[k + 1])
        return out

    def at(self, z, rs=None):
        rs = self.rs if rs is None else rs
        k = int(np.clip(np.searchsorted(self.zs, z) - 1, 0, len(self.zs) - 2))
        t = clamp01((z - self.zs[k]) / (self.zs[k + 1] - self.zs[k]))
        return self.cs[k] * (1 - t) + self.cs[k + 1] * t, rs[k] * (1 - t) + rs[k + 1] * t


def ang_lookup(r, theta):
    f = (theta + math.pi) / (2 * math.pi) * NANG
    i0 = int(math.floor(f)) % NANG
    t = f - math.floor(f)
    return r[i0] * (1 - t) + r[(i0 + 1) % NANG] * t


# ------------------------------------------------------------------ mesh helpers

def islands_keep_largest(bm):
    bm.verts.ensure_lookup_table()
    seen, islands = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, isl = [v], []
        seen.add(v.index)
        while stack:
            cur = stack.pop()
            isl.append(cur)
            for e in cur.link_edges:
                o = e.other_vert(cur)
                if o.index not in seen:
                    seen.add(o.index)
                    stack.append(o)
        islands.append(isl)
    islands.sort(key=len, reverse=True)
    for isl in islands[1:]:
        bmesh.ops.delete(bm, geom=isl, context="VERTS")


def boundary_relax(bm, iters=40):
    """Straighten the stair-steps left by cutting along faces."""
    for _ in range(iters):
        new = {}
        for v in bm.verts:
            if v.is_boundary:
                nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
                if len(nb) == 2:
                    new[v] = (nb[0].co + nb[1].co) * 0.5
        for v, p in new.items():
            v.co = v.co * 0.5 + p * 0.5


def adjacency(obj):
    n = len(obj.data.vertices)
    e = np.empty(len(obj.data.edges) * 2, int)
    obj.data.edges.foreach_get("vertices", e)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    boundary = np.array([v.is_boundary for v in bm.verts])
    bm.free()
    return e.reshape(-1, 2), boundary, n


def smooth(co, edges, boundary, n, iters, lam=0.5, weight=None):
    co = co.copy()
    bmask = boundary[edges[:, 0]] == boundary[edges[:, 1]]
    for _ in range(iters):
        acc = np.zeros_like(co)
        cnt = np.zeros(n)
        for a, b in ((0, 1), (1, 0)):
            src, dst = edges[:, a], edges[:, b]
            ok = bmask | ~boundary[dst]
            np.add.at(acc, dst[ok], co[src[ok]])
            np.add.at(cnt, dst[ok], 1)
        cnt[cnt == 0] = 1
        step = lam * (acc / cnt[:, None] - co)
        if weight is not None:
            step *= weight[:, None]
        co += step
    return co


def normals_of(obj, co):
    set_co(obj, co)
    nrm = np.empty(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get("normal", nrm)
    return nrm.reshape(-1, 3)


def push_outside(co, tree, clearance):
    out = co.copy()
    for i, p in enumerate(co):
        loc, nrm, _, _ = tree.find_nearest(Vector(p))
        if loc is not None and (Vector(p) - loc).dot(nrm) < clearance:
            out[i] = tuple(loc + nrm * clearance)
    return out


def project_to(co, tree):
    out = co.copy()
    for i, p in enumerate(co):
        loc, _, _, _ = tree.find_nearest(Vector(p))
        if loc is not None:
            out[i] = tuple(loc)
    return out


def mesh_from_rings(name, rings, closed=True, cap_bottom=False):
    """Quads between consecutive rings (top to bottom, same vertex count, angle increasing)."""
    bm = bmesh.new()
    vs = [[bm.verts.new(tuple(p)) for p in ring] for ring in rings]
    n = len(rings[0])
    for k in range(len(rings) - 1):
        for i in range(n if closed else n - 1):
            j = (i + 1) % n
            bm.faces.new((vs[k][i], vs[k + 1][i], vs[k + 1][j], vs[k][j]))
    if cap_bottom:
        bm.faces.new(list(reversed(vs[-1])))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))


def set_rest_uv(obj, sleeve):
    """TEXCOORD_1: (sleeve code, rest height / H), from the shape before the drape. sleeve: -1 off the sleeves,
    -2 bag strap, else 0..1 from armpit to wrist; stored in 0..1 (see the header)."""
    H = H_
    me = obj.data
    uv = me.uv_layers.new(name="UVRest")
    co = get_co(obj)
    for loop in me.loops:
        v = loop.vertex_index
        sv = float(sleeve[v])
        code = 0.0 if sv == -1.0 else 0.05 if sv == -2.0 else 0.1 + 0.9 * sv
        uv.data[loop.index].uv = (code, float(co[v, 2] / H))


# ------------------------------------------------------------------ tops, jackets, trousers (body topology)

def cut_piece(base, tree, lm, g, name):
    H = H_
    co = project_to(np.array([tuple(v.co) for v in base.vertices]), tree)
    keep = np.zeros(len(co), bool)
    for i, (x, y, z) in enumerate(co):
        if g["kind"] == "top":
            if is_arm(lm, x, z):
                keep[i] = z > lm["wrist"] - 0.03
            else:
                keep[i] = g["hem"] * H - 0.04 < z < lm["neck"] + 0.03
        else:
            if z > lm["waist"] + 0.03 or z < lm["ankle"] - 0.03:
                continue
            if abs(x) > interp(lm["arm_gap"], z) and z > lm["knee"]:
                continue
            keep[i] = True
    bm = bmesh.new()
    bm.from_mesh(base)
    bm.verts.ensure_lookup_table()
    for v, p in zip(bm.verts, co):
        v.co = Vector(p)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(keep[v.index] for v in f.verts)], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    islands_keep_largest(bm)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
    for v in bm.verts:
        loc, _, _, _ = tree.find_nearest(v.co)
        if loc is not None:
            v.co = loc

    def bisect(co_, no_, keep_side, only=None):
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        if only is not None:
            vs = [v for v in bm.verts if only(v.co)]
            vset = set(vs)
            geom = vs + [e for e in bm.edges if all(v in vset for v in e.verts)] + [f for f in bm.faces if all(v in vset for v in f.verts)]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co_, plane_no=no_, dist=1e-5)
        no = Vector(no_).normalized()
        cut = [f for f in bm.faces if (only is None or all(only(v.co) for v in f.verts)) and (f.calc_center_median() - Vector(co_)).dot(no) * keep_side < 0]
        bmesh.ops.delete(bm, geom=cut, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")

    if g["kind"] == "top":
        bisect((0, 0, g["hem"] * H), (0, 0, 1), +1, only=lambda p: not is_arm(lm, p.x, p.z))
        tilt = math.tan(math.radians(24))
        for side in (-1, 1):
            bisect((side * 0.3, 0, lm["wrist"] + 0.012), (side * tilt, 0, 1), +1, only=lambda p, s=side: p.x * s > 0.2 and p.z < lm["wrist"] + 0.12)
        # neckline: a scoop, lower at the front; jackets sit closer to the neck
        grow_x = 0.010 if g.get("outer") else 0.022
        drop = 0.012 if g.get("outer") else 0.035
        dead = []
        for f in bm.faces:
            c = f.calc_center_median()
            ex = (c.x / (lm["neck_rx"] + grow_x)) ** 2 + ((c.y - lm["neck_y"]) / (lm["neck_ry"] + grow_x)) ** 2
            front = clamp01(-(c.y - lm["neck_y"]) / 0.07)
            zcut = lm["neck"] - 0.035 - drop * front
            if (ex < 1.0 and c.z > zcut) or c.z > lm["neck"] + 0.01:
                dead.append(f)
        bmesh.ops.delete(bm, geom=dead, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    else:
        bisect((0, 0, lm["waist"]), (0, 0, 1), -1)
        bisect((0, 0, lm["ankle"] + 0.005), (0, 0, 1), +1)
    islands_keep_largest(bm)
    boundary_relax(bm, 30)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))


def add_collar(obj, lm, height):
    """Stand collar: the neckline edge extruded up and slightly out."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    ring = [e for e in bm.edges if e.is_boundary and all(v.co.z > lm["shoulder"] - 0.06 and abs(v.co.x) < lm["neck_rx"] + 0.06 for v in e.verts)]
    for step in range(3):
        res = bmesh.ops.extrude_edge_only(bm, edges=ring)
        new_verts = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
        for v in new_verts:
            d = Vector((v.co.x, v.co.y - lm["neck_y"], 0))
            d = d.normalized() if d.length > 1e-6 else Vector((0, -1, 0))
            v.co = v.co + Vector((0, 0, height / 3)) + d * 0.0015
        ring = [g for g in res["geom"] if isinstance(g, bmesh.types.BMEdge) and all(v in new_verts for v in g.verts)]
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def shape_top(obj, body_pts, tree, lm, g):
    co = get_co(obj)
    edges, boundary, n = adjacency(obj)
    nrm = normals_of(obj, smooth(co, edges, boundary, n, 6))
    out = co.copy()
    arm = np.array([is_arm(lm, x, z) for x, _, z in co])
    torso_pts = body_pts[[not is_arm(lm, x, z) for x, _, z in body_pts]]
    prof = Profile(torso_pts, g["hem"] * H_ - 0.06, lm["shoulder"] + 0.02).dilate(g.get("skim", 3))
    hang = prof.curtain(lm["chest"])
    for i, (x, y, z) in enumerate(co):
        if arm[i]:
            out[i] = co[i] + nrm[i] * g["sleeve_ease"]
            continue
        c, r = prof.at(z)
        _, rh = prof.at(z, hang)
        th = math.atan2(y - c[1], x - c[0])
        r0, r1 = ang_lookup(r, th), ang_lookup(rh, th)
        target = r0 + (r1 - r0) * g["curtain"] + g["ease"]
        hull_pos = np.array([c[0] + math.cos(th) * target, c[1] + math.sin(th) * target, z])
        # above the armpits the chest and shoulders are convex: follow the skin there, not the cross-section
        # (which spans armpit to armpit and would push a band of fabric out)
        w = clamp01((lm["armpit"] + 0.04 - z) / 0.06)
        out[i] = (co[i] + nrm[i] * g["ease"]) * (1 - w) + hull_pos * w
    if g.get("drop"):
        sel = arm & (co[:, 2] > lm["armpit"] - 0.06)
        out[sel, 2] -= g["drop"] * np.clip((co[sel, 2] - (lm["armpit"] - 0.06)) / 0.12, 0, 1)
    out = smooth(out, edges, boundary, n, 3, 0.4)
    out = push_outside(out, tree, CLEAR)
    if g.get("quilt"):
        # puffer channels: the fill bulges between horizontal stitch lines
        nrm2 = normals_of(obj, out)
        q = g["quilt"]
        bulge = np.abs(np.sin(math.pi * (out[:, 2] - g["hem"] * H_) / q)) ** 0.6
        out = out + nrm2 * (0.004 + 0.016 * bulge)[:, None]
    return arm, out


def shape_bottom(obj, body_pts, tree, lm, g):
    co = get_co(obj)
    edges, boundary, n = adjacency(obj)
    out = co.copy()
    keep = [abs(x) < interp(lm["arm_gap"], z) or z < lm["knee"] for x, _, z in body_pts]
    pts = body_pts[keep]
    sk = g.get("skim", 3)
    pelvis = Profile(pts, lm["crotch"], lm["waist"] + 0.03).dilate(sk)
    legs = {s: Profile(pts[pts[:, 0] * s > 0.0], 0.0, lm["crotch"] + 0.07).dilate(sk) for s in (-1, 1)}
    hang = {s: legs[s].curtain(lm["crotch"] - 0.02) for s in (-1, 1)}
    phang = pelvis.curtain(lm["seat"])

    def place(prof, rs_hang, cur, x, y, z, e, inner_side=0):
        c, r = prof.at(z)
        _, rh = prof.at(z, rs_hang)
        th = math.atan2(y - c[1], x - c[0])
        inward = max(0.0, -inner_side * math.cos(th)) if inner_side else 0.0
        r0, r1 = ang_lookup(r, th), ang_lookup(rh, th)
        t = r0 + (r1 - r0) * cur * (1 - 0.7 * inward) + e * (1 - 0.6 * inward)
        return np.array([c[0] + math.cos(th) * t, c[1] + math.sin(th) * t, z])

    lo, hi = lm["crotch"], lm["crotch"] + 0.065
    for i, (x, y, z) in enumerate(co):
        down = clamp01((lm["hip"] - z) / (lm["hip"] - lm["crotch"]))
        e = g["ease"] + (g["leg_ease"] - g["ease"]) * down
        e += g["hem_ease"] * clamp01((lm["knee"] - z) / (lm["knee"] - lm["ankle"]))
        w = smoothstep((z - lo) / (hi - lo))
        s = 1 if x > 0 else -1
        p_leg = place(legs[s], hang[s], g["curtain"], x, y, z, e, inner_side=s) if w < 1 else None
        p_pel = None
        if w > 0:
            cur = g["curtain"] * (1.0 - clamp01((z - lm["seat"]) / 0.06))
            p_pel = place(pelvis, phang, cur, x, y, z, e)
        p = p_pel if p_leg is None else p_leg if p_pel is None else p_leg * (1 - w) + p_pel * w
        if z < lo - 0.04:
            p[0] = s * max(abs(p[0]), 0.014)
        out[i] = p
    # the crotch: smooth the seam area so the two legs meet without a knot
    d = np.sqrt(out[:, 0] ** 2 + ((out[:, 2] - lm["crotch"]) * 0.8) ** 2)
    wgt = np.clip(1.0 - d / 0.085, 0, 1)
    out = smooth(out, edges, boundary, n, 25, 0.5, weight=wgt)
    out = smooth(out, edges, boundary, n, 3, 0.4)
    out = push_outside(out, tree, CLEAR)
    return out


# ------------------------------------------------------------------ skirts and dresses (lofted)

def lofted(lm, body_pts, g, z_top, z_bottom, name, waist_follow):
    """A tube from z_top down to z_bottom around the body's cross-sections (both legs together below the crotch)."""
    pts = body_pts[[(not is_arm(lm, x, z)) and (abs(x) < interp(lm["arm_gap"], z) or z < lm["knee"]) for x, _, z in body_pts]]
    prof = Profile(pts, max(0.02, z_bottom - 0.02), z_top + 0.02).dilate(3).smooth_centers(4)
    hang = prof.curtain(waist_follow)
    n = 128
    angs = np.linspace(-math.pi, math.pi, n, endpoint=False)
    rings = []
    step = 0.012
    zs = np.arange(z_top, z_bottom - 1e-6, -step)
    for z in zs:
        c, r = prof.at(z)
        _, rh = prof.at(z, hang)
        below = max(0.0, waist_follow - z)
        cur = g["curtain"] * smoothstep(below / 0.08)
        ring = []
        for th in angs:
            r0, r1 = ang_lookup(r, th), ang_lookup(rh, th)
            rr = r0 + (r1 - r0) * cur + g["ease"] + g["flare"] * below
            ring.append((c[0] + math.cos(th) * rr, c[1] + math.sin(th) * rr, z))
        rings.append(np.array(ring))
    return mesh_from_rings(name, rings)


def dress_straps(lm, tree, z_top):
    """Two thin straps over the shoulders, following the body 3 mm off the skin."""
    objs = []
    for s in (-1, 1):
        x = s * lm["strap_x"]
        path = []
        for k in range(41):
            a = math.pi * k / 40  # 0 = front, pi = back, over the top
            dy, dz = -math.cos(a), math.sin(a)
            origin = Vector((x, lm["neck_y"] + 0.0, z_top))
            # walk outwards from inside the body until we leave it
            hit = None
            for dist in np.linspace(0.30, 0.0, 120):
                p = origin + Vector((0, dy, dz)) * dist
                loc, nrm, _, d = tree.find_nearest(p)
                if loc is not None and d < 0.004:
                    hit = loc + nrm * 0.004
                    break
            if hit is not None and hit.z >= z_top - 0.005:
                path.append(hit)
        if len(path) < 4:
            continue
        verts = []
        for p in path:
            verts.append((p.x - 0.006, p.y, p.z))
            verts.append((p.x + 0.006, p.y, p.z))
        bm = bmesh.new()
        vv = [bm.verts.new(v) for v in verts]
        for k in range(len(path) - 1):
            bm.faces.new((vv[2 * k], vv[2 * k + 1], vv[2 * k + 3], vv[2 * k + 2]))
        me = bpy.data.meshes.new("strap")
        bm.to_mesh(me)
        bm.free()
        objs.append(link(bpy.data.objects.new("strap", me)))
    return objs


# ------------------------------------------------------------------ shoes, hats, bag (rigid)

def shoes(lm, body_pts):
    objs = []
    for s in (-1, 1):
        pts = body_pts[(body_pts[:, 0] * s > 0.02) & (body_pts[:, 2] < 0.34)]
        prof = Profile(pts, 0.004, 0.32, step=0.008, half=0.005).dilate(1).smooth_r(3).smooth_centers(3)
        n = 72
        angs = np.linspace(-math.pi, math.pi, n, endpoint=False)
        rings = []
        for z in np.arange(0.31, 0.0, -0.008):
            c, r = prof.at(z)
            ease = 0.006 + 0.004 * clamp01((0.05 - z) / 0.05)
            rings.append(np.array([(c[0] + math.cos(t) * (ang_lookup(r, t) + ease), c[1] + math.sin(t) * (ang_lookup(r, t) + ease), z) for t in angs]))
        # the sole: one ring at the floor, a little wider, then closed
        c, r = prof.at(0.006)
        rings.append(np.array([(c[0] + math.cos(t) * (ang_lookup(r, t) + 0.011), c[1] + math.sin(t) * (ang_lookup(r, t) + 0.011), 0.001) for t in angs]))
        objs.append(mesh_from_rings("shoe", rings, cap_bottom=True))
    return objs


def hat(lm, body_pts, tree, brim):
    """A dome over the head, ray-cast onto the skull: band just above the eyes, a little lower at the back."""
    H = H_
    head = body_pts[body_pts[:, 2] > 0.875 * H]
    lo, hi = head.min(0), head.max(0)
    c = Vector(((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2))
    r = Vector(((hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2, (hi[2] - lo[2]) / 2))
    band = lm["head_band"]
    n_th, n_ph = 96, 30
    angs = np.linspace(-math.pi, math.pi, n_th, endpoint=False)
    rings = []
    for k in range(1, n_ph + 1):
        ring = []
        for t in angs:
            front = clamp01(-math.sin(t))
            back = clamp01(math.sin(t))
            zb = band + 0.008 * front - 0.022 * back
            phb = math.acos(max(-1.0, min(1.0, (zb - c.z) / r.z)))
            ph = phb * k / n_ph
            d = Vector((math.sin(ph) * math.cos(t) * r.x, math.sin(ph) * math.sin(t) * r.y, math.cos(ph) * r.z)).normalized()
            hit, nrm, _, _ = tree.ray_cast(c + d * 0.4, -d, 0.4)
            p = hit if hit is not None else c + d * r.length * 0.6
            top = 1.0 - k / n_ph
            ease = 0.008 + (0.0 if brim else 0.012) * top * top + (0.003 if (not brim and k > n_ph - 6) else 0.0)
            ring.append(tuple(p + d * ease))
        rings.append(np.array(ring))
    apex = Vector(tuple(rings[0].mean(0)))
    rings.insert(0, np.repeat(np.array(apex)[None], n_th, 0) + (rings[0] - np.array(apex)) * 0.2)
    out = [mesh_from_rings("hat", rings)]
    if brim:
        edge = rings[-1]
        verts = []
        rows = 7
        sel = [i for i, t in enumerate(angs) if -math.pi * 0.78 <= t <= -math.pi * 0.22]
        for i in sel:
            t = angs[i]
            base = np.array(edge[i])
            span = (t + math.pi * 0.78) / (math.pi * 0.56)
            depth = 0.085 * math.sin(span * math.pi) ** 0.45 + 0.004
            out_dir = np.array([math.cos(t) * 0.45, math.sin(t) * 1.3 - 0.25, 0])
            out_dir /= np.linalg.norm(out_dir)
            for kk in range(rows):
                q = kk / (rows - 1)
                verts.append(tuple(base + out_dir * depth * q + np.array([0, 0, -0.016 * q * q])))
        bm = bmesh.new()
        vv = [bm.verts.new(v) for v in verts]
        for a in range(len(sel) - 1):
            for kk in range(rows - 1):
                i0, i1 = a * rows + kk, (a + 1) * rows + kk
                bm.faces.new((vv[i0], vv[i0 + 1], vv[i1 + 1], vv[i1]))
        me = bpy.data.meshes.new("brim")
        bm.to_mesh(me)
        bm.free()
        out.append(link(bpy.data.objects.new("brim", me)))
    return out


def bag(lm, tree):
    """A small crossbody bag resting on the front of the right hip, strap over the left shoulder."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    box = bpy.context.active_object
    box.scale = (0.2, 0.065, 0.135)
    bpy.ops.object.transform_apply(scale=True)
    bev = box.modifiers.new("bev", "BEVEL")
    bev.width = 0.022
    bev.segments = 5
    bpy.ops.object.modifier_apply(modifier=bev.name)
    sub = box.modifiers.new("sub", "SUBSURF")
    sub.levels = 1
    bpy.ops.object.modifier_apply(modifier=sub.name)
    hip_z = lm["hip"] + 0.01
    x = 0.105
    loc, nrm, _, _ = tree.ray_cast(Vector((x, -1.0, hip_z)), Vector((0, 1, 0)))
    front_y = loc.y if loc is not None else -0.13
    box.location = (x, front_y - 0.045, hip_z)
    box.rotation_euler = (math.radians(-6), 0, math.radians(-8))
    bpy.ops.object.transform_apply(location=True, rotation=True)
    # strap: from the bag's top corner up across the chest, over the left shoulder, down the back a little
    start = Vector((x + 0.07, front_y - 0.04, hip_z + 0.06))
    end_front = Vector((-lm["shoulder_x"] + 0.06, 0, lm["shoulder"] + 0.005))
    path = []
    for k in range(26):
        t = k / 25
        p = start.lerp(end_front, t)
        hit, n_, _, _ = tree.ray_cast(Vector((p.x, -1.0, p.z)), Vector((0, 1, 0)))
        y = (hit.y if hit is not None else p.y) - 0.03 - 0.02 * (1 - t)
        path.append(Vector((p.x, y, p.z)))
    top = path[-1]
    for k in range(1, 9):
        a = math.pi * k / 8
        path.append(Vector((top.x, top.y + (0.08 + abs(top.y)) * (1 - math.cos(a)) / 2 + 0.01, top.z + 0.03 * math.sin(a))))
    bm = bmesh.new()
    vv = []
    for i, p in enumerate(path):
        nxt = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        side = nxt.cross(Vector((0, -1, 0))).normalized() * 0.012
        vv.append((bm.verts.new(p - side), bm.verts.new(p + side)))
    for i in range(len(vv) - 1):
        bm.faces.new((vv[i][0], vv[i][1], vv[i + 1][1], vv[i + 1][0]))
    me = bpy.data.meshes.new("strap")
    bm.to_mesh(me)
    bm.free()
    strap = link(bpy.data.objects.new("strap", me))
    return [box, strap]


# ------------------------------------------------------------------ simulation, AO, export

def simulate(obj, pins, g, frames):
    """pins: vertex indices (fully pinned) or (index, weight) pairs (graduated, no ridge at the edge)."""
    vg = obj.vertex_groups.new(name="pin")
    for p in pins:
        i, w = (p, 1.0) if not isinstance(p, tuple) else p
        vg.add([int(i)], float(w), "REPLACE")
    cloth = obj.modifiers.new("cloth", "CLOTH")
    s = cloth.settings
    s.quality = 10
    s.mass = g.get("mass", 0.3)
    s.air_damping = 2.0
    s.tension_stiffness = 25
    s.compression_stiffness = g.get("comp", 5)
    s.shear_stiffness = 5
    s.bending_stiffness = g.get("bend", 0.5)
    s.tension_damping = 8
    s.compression_damping = 5
    s.shear_damping = 5
    s.bending_damping = 0.5
    s.vertex_group_mass = "pin"
    s.pin_stiffness = 1.0
    c = cloth.collision_settings
    c.collision_quality = 4
    c.distance_min = 0.003
    c.use_self_collision = True
    c.self_distance_min = 0.003
    c.self_friction = 5
    cloth.point_cache.frame_start = 1
    cloth.point_cache.frame_end = frames
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, frames
    t1 = time.time()
    for f in range(1, frames + 1):
        scene.frame_set(f)
    deps = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(deps))
    obj.modifiers.clear()
    obj.vertex_groups.clear()
    old = obj.data
    obj.data = me
    bpy.data.meshes.remove(old)
    scene.frame_set(1)
    log(obj.name, f"cloth {frames} frames {time.time() - t1:.1f}s")


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = name
    return obj


def bake_ao(obj, others):
    """Ambient occlusion from the body and the garment itself, into a vertex colour."""
    tree = bvh_of(obj, *others)
    co = get_co(obj)
    nrm = np.empty(len(co) * 3)
    obj.data.vertices.foreach_get("normal", nrm)
    nrm = nrm.reshape(-1, 3)
    rays = 20
    dirs = []
    for k in range(rays):
        u, v = (k + 0.5) / rays, ((k * 0.618034) % 1.0)
        r = math.sqrt(u)
        th = 2 * math.pi * v
        dirs.append((r * math.cos(th), r * math.sin(th), math.sqrt(1 - u)))
    ao = np.ones(len(co))
    for i in range(len(co)):
        n = Vector(nrm[i])
        if n.length < 0.5:
            continue
        t = n.orthogonal().normalized()
        b = n.cross(t)
        p = Vector(co[i])
        occluded = 0.0
        for dx, dy, dz in dirs:
            d = t * dx + b * dy + n * dz
            hit = tree.ray_cast(p + n * 0.002, d, 0.14)
            if hit[0] is not None:
                occluded += 1.0 - hit[3] / 0.14
        # garments are double sided: a vertex whose normal points inwards sees the body; use the darker side
        ao[i] = 1.0 - occluded / rays
    edges, boundary, n = adjacency(obj)
    ao = smooth(ao[:, None].repeat(3, 1), edges, np.zeros(n, bool), n, 2, 0.5)[:, 0]
    ao = np.clip(0.35 + 0.65 * ao, 0, 1)
    attr = obj.data.color_attributes.new(name="AO", type="FLOAT_COLOR", domain="POINT")
    for i, a in enumerate(ao):
        attr.data[i].color = (a, a, a, 1.0)
    obj.data.color_attributes.active_color = attr
    obj.data.attributes.default_color_name = "AO"


def front_uv(obj, side=False):
    me = obj.data
    uv = me.uv_layers.get("UVFront") or me.uv_layers.new(name="UVFront")
    co = get_co(obj)
    for loop in me.loops:
        x, y, z = co[loop.vertex_index]
        uv.data[loop.index].uv = ((y if side else x) / H_ + 0.5, z / H_)
    # TEXCOORD_0 must be the front projection: make it the first layer
    me.uv_layers.active = uv
    uv.active_render = True


def reorder_uv(obj):
    """Ensure UVFront is layer 0 and UVRest layer 1 (glTF exports them in order)."""
    me = obj.data
    names = [l.name for l in me.uv_layers]
    if names and names[0] == "UVFront":
        return
    data = {l.name: [d.uv[:] for d in l.data] for l in me.uv_layers}
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    for name in ("UVFront", "UVRest"):
        if name in data:
            l = me.uv_layers.new(name=name)
            for i, uvv in enumerate(data[name]):
                l.data[i].uv = uvv
    me.uv_layers.active = me.uv_layers["UVFront"]


def export(obj, path):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    kwargs = dict(
        filepath=path, use_selection=True, export_format="GLB", export_apply=True, export_normals=True,
        export_texcoords=True, export_materials="NONE", export_yup=True,
    )
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_vertex_color="ACTIVE")
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs, export_colors=True)
    log("wrote", path, os.path.getsize(path), "bytes", len(obj.data.vertices), "verts")


# ------------------------------------------------------------------ build one piece

def build(key, base, body, body_pts, tree, name):
    lm = LM[key]
    g = PIECES[name]
    kind = g["kind"]
    t0 = time.time()
    side_uv = False
    if kind == "top":
        obj = cut_piece(base, tree, lm, g, name)
        if g.get("collar"):
            add_collar(obj, lm, g["collar"])
        arm, out = shape_top(obj, body_pts, tree, lm, g)
        sleeve = np.full(len(out), -1.0)
        co0 = get_co(obj)
        for i, (x, y, z) in enumerate(co0):
            if arm[i]:
                sleeve[i] = clamp01((lm["armpit"] - z) / (lm["armpit"] - lm["wrist"]))
        set_co(obj, out)
        set_rest_uv(obj, sleeve)
        top = out[:, 2].max()
        out[:, 2] = top - (top - out[:, 2]) * g["grow"]
        set_co(obj, out)
        # shoulders hold the garment, fading out over 4.5 cm so the pinned band leaves no ridge
        pins = [
            (i, smoothstep((z - (lm["shoulder"] - 0.065)) / 0.045))
            for i, (x, y, z) in enumerate(out)
            if not arm[i] and z > lm["shoulder"] - 0.065 and abs(x) < lm["shoulder_x"] - 0.03
        ]
        if g.get("collar"):
            pins += [i for i, (x, y, z) in enumerate(out) if z > lm["neck"] - 0.03]
        log(name, "verts", len(out), f"{time.time() - t0:.1f}s shape")
        simulate(obj, pins, g, g.get("frames", 60))
    elif kind == "bottom":
        obj = cut_piece(base, tree, lm, g, name)
        out = shape_bottom(obj, body_pts, tree, lm, g)
        set_co(obj, out)
        set_rest_uv(obj, np.full(len(out), -1.0))
        top = out[:, 2].max()
        out[:, 2] = np.maximum(top - (top - out[:, 2]) * g["grow"], 0.004)
        set_co(obj, out)
        pins = [i for i, z in enumerate(out[:, 2]) if z > top - 0.025]
        log(name, "verts", len(out), f"{time.time() - t0:.1f}s shape")
        simulate(obj, pins, g, 70)
    elif kind in ("skirt", "dress"):
        if kind == "skirt":
            z_top = lm["waist"] - 0.01
            follow = lm["hip"]
        else:
            z_top = lm["armpit"] + 0.004
            follow = lm["hip"] if g["curtain"] < 0.5 else lm["waist"] + 0.02
        z_bottom = max(0.03, lm["crotch"] - g["hem_drop"] + (0.0 if kind == "skirt" else 0.0))
        obj = lofted(lm, body_pts, g, z_top, z_bottom, name, follow)
        out = push_outside(get_co(obj), tree, CLEAR)
        set_co(obj, out)
        set_rest_uv(obj, np.full(len(out), -1.0))
        top = out[:, 2].max()
        out[:, 2] = top - (top - out[:, 2]) * g["grow"]
        set_co(obj, out)
        pins = [i for i, z in enumerate(out[:, 2]) if z > top - 0.02]
        log(name, "verts", len(out), f"{time.time() - t0:.1f}s shape")
        simulate(obj, pins, g, 60)
        if kind == "dress":
            straps = dress_straps(lm, tree, z_top)
            for s_ in straps:
                set_rest_uv(s_, np.full(len(s_.data.vertices), -1.0))
            obj = join([obj] + straps, name)
    elif kind == "shoes":
        objs = shoes(lm, body_pts)
        for o in objs:
            set_rest_uv(o, np.full(len(o.data.vertices), -1.0))
        obj = join(objs, name)
        side_uv = True
    elif kind == "hat":
        objs = hat(lm, body_pts, tree, g.get("brim", False))
        for o in objs:
            set_rest_uv(o, np.full(len(o.data.vertices), -1.0))
        obj = join(objs, name)
    else:
        objs = bag(lm, tree)
        for o in objs:
            set_rest_uv(o, np.full(len(o.data.vertices), -2.0 if o.name.startswith("strap") else -1.0))
        obj = join(objs, name)
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.data.update()
    front_uv(obj, side=side_uv)
    reorder_uv(obj)
    bake_ao(obj, [body])
    log(name, f"done in {time.time() - t0:.1f}s")
    return obj


def setup_colliders(body):
    body.modifiers.new("collision", "COLLISION")
    body.collision.thickness_outer = 0.002
    body.collision.cloth_friction = 8
    bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0))
    floor = bpy.context.active_object
    floor.name = "floor"
    floor.modifiers.new("collision", "COLLISION")
    floor.collision.thickness_outer = 0.002
    floor.collision.cloth_friction = 12
    return floor


def preview(body, pieces, path):
    """One column per piece, front and back, AO shown."""
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    sh = scene.display.shading
    sh.light = "STUDIO"
    sh.color_type = "VERTEX"
    sh.show_cavity = True
    sh.cavity_type = "BOTH"
    scene.world = bpy.data.worlds.new("w")
    scene.world.color = (0.9, 0.9, 0.88)
    for o in scene.objects:
        o.hide_render = True
    cols = len(pieces)
    scene.render.resolution_x = 520 * cols
    scene.render.resolution_y = 1100
    made = []
    for i, piece in enumerate(pieces):
        for j, rot in enumerate((0, 180)):
            empty = link(bpy.data.objects.new("pivot", None))
            empty.location = ((i - (cols - 1) / 2) * 1.1 + (j - 0.5) * 0.52, 0, 0)
            empty.rotation_euler.z = math.radians(rot)
            made.append(empty)
            for o in (body, piece):
                c = link(o.copy())
                c.parent = empty
                c.hide_render = False
                made.append(c)
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = max(2.2, 1.1 * cols + 0.1)
    cam = link(bpy.data.objects.new("cam", cam_data))
    cam.location = (0, -6, 0.86)
    cam.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for c in made:
        bpy.data.objects.remove(c)
    bpy.data.objects.remove(cam)
    log("preview", path)


bpy.ops.wm.open_mainfile(filepath=BLEND)
base, body = load_body(BODY)
LM[BODY]["H"] = H_ = body.dimensions.z
for o in list(bpy.data.objects):
    if o is not body:
        bpy.data.objects.remove(o)
setup_colliders(body)
tree = bvh_of(body)
body_pts = get_co(body)
built = []
for name in WANTED:
    obj = build(BODY, base, body, body_pts, tree, name)
    built.append(obj)
    if "export" in FLAGS:
        export(obj, os.path.join(OUT, f"{name}.glb"))
if "preview" in FLAGS:
    preview(body, built, os.path.join(OUT, f"preview-{BODY}-{'_'.join(WANTED)}.png"))
