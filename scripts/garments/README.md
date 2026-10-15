# Fitting room garments

The 3D clothes in the fitting room are cloth simulations made in Blender 4.5 on the two mannequins, so
they hang, fold and sag like real garments (fitted, regular and oversized tops; slim, straight and baggy
trousers; skirts, dresses, jackets, puffers, shoes, hats and a bag). The product picture is laid over
them in the browser (`src/lib/fitting/garment-texture.ts`), after a clothes-segmentation model has found
which pixels are the garment (`src/app/api/fitting/[slug]/route.ts`).

## Rebuild

1. Bodies: `blender -b --factory-startup --python export_bodies.py -- hbm.blend out`
   (`hbm.blend` is Blender's Human Base Meshes bundle, CC0). Writes `out/mannequin-{male,female}.glb`,
   which are compressed into `public/models/` the same way as the garments.
2. Garments, per body (about 30 minutes each on a laptop):

   ```
   blender -b --factory-startup --python build.py -- hbm.blend out final/male male top_fitted,top_regular,top_oversized,outer_regular,outer_puffer,bottom_slim,bottom_straight,bottom_baggy,skirt_mini,skirt_midi,dress_mini,dress_long,shoes,hat_beanie,hat_cap,bag preview export
   ```

   and the same with `female`. `preview` renders a contact sheet next to the files; for a quick look at a
   single piece: `blender -b --factory-startup --python render_piece.py -- out/mannequin-male.glb final/male/top_fitted.glb check.png`.
3. Compress into the site: `node scripts/garments/compress.mjs final`

Keep absolute or short paths: Blender's bundled Python fails on long Windows paths.

## What the files carry

| attribute    | meaning                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| `TEXCOORD_0` | front projection (x/H + 0.5, z/H); shoes use the side (y/H + 0.5, z/H)            |
| `TEXCOORD_1` | sleeve code (0 off the sleeves, 0.05 bag strap, 0.1 armpit … 1.0 wrist), rest z/H |
| `COLOR_0`    | baked ambient occlusion                                                           |

glTF stores V flipped (1 − v); the scene turns it back. Sleeves, cropped hems, shorts and shoe heights are
cut in the shader from `TEXCOORD_1`, so one simulation serves several cuts.
