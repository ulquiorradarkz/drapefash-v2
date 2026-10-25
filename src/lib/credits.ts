/**
 * Museum pictures used in the collage (public/collage), all public domain (CC0) from
 * The Metropolitan Museum of Art Open Access. Titles are the museum's own, cited as published.
 * The fitting-room mannequins (public/models) come from Blender's Human Base Meshes bundle, also CC0,
 * with the faces smoothed into mannequin heads. The street photographs (public/street) are from Unsplash
 * via Lorem Picsum (Unsplash licence); the street clip is from Wikimedia Commons (CC BY 3.0).
 */
export const IMAGE_CREDITS = [
  {
    file: "statue-draped",
    title: "Marble statue of a woman",
    maker: "Roman maker, 1st or 2nd century CE",
    url: "https://www.metmuseum.org/art/collection/search/246994",
  },
  {
    file: "statue-attendant",
    title: "Marble and limestone statue of an attendant",
    maker: "Greek, South Italian, Tarentine maker, late 4th or 3rd century BCE",
    url: "https://www.metmuseum.org/art/collection/search/258495",
  },
  {
    file: "statue-head",
    title: "Marble head of a young woman from a funerary statue",
    maker: "Greek, Attic maker, late 4th century BCE",
    url: "https://www.metmuseum.org/art/collection/search/255423",
  },
  { file: "frame-swept", title: "Swept frame", maker: "French maker, ca. 1735–45", url: "https://www.metmuseum.org/art/collection/search/460701" },
  { file: "frame-carved", title: "Picture Frame", maker: "Southern Italy, late 17th century", url: "https://www.metmuseum.org/art/collection/search/459778" },
  {
    file: "frame-astragal",
    title: "Astragal frame",
    maker: "Italian, Veneto maker, late 16th–early 17th century",
    url: "https://www.metmuseum.org/art/collection/search/461609",
  },
  {
    file: "mannequin",
    title: "Human Base Meshes (fitting-room mannequins)",
    maker: "Blender Studio, CC0",
    url: "https://download.blender.org/demo/asset-bundles/human-base-meshes/",
  },
  { file: "street-tower", title: "City street with a glass tower", maker: "Matthew Wiebe, Unsplash", url: "https://unsplash.com/photos/nOhUx3tiaQQ" },
  { file: "street-alley", title: "Cobbled alley", maker: "Afroz Nawaf, Unsplash", url: "https://unsplash.com/photos/dSyWD7oRns8" },
  { file: "street-bicycle", title: "Bicycle on a wet street", maker: "Sylwia Bartyzel, Unsplash", url: "https://unsplash.com/photos/eDDQRAYKo7k" },
  { file: "street-brick", title: "Brick street in shadow", maker: "Nicholas Swanson, Unsplash", url: "https://unsplash.com/photos/SyBYM8R6VU4" },
  {
    file: "street-shop",
    title: "Traffic on Slovenska street 2 (video)",
    maker: "Sounds of Changes, CC BY 3.0, via Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:Traffic_on_Slovenska_street_2.webm",
  },
] as const;
