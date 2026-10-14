/**
 * Museum pictures used in the collage (public/collage), all public domain (CC0) from
 * The Metropolitan Museum of Art Open Access. Titles are the museum's own, cited as published.
 * The fitting-room mannequins (public/models) come from Blender's Human Base Meshes bundle, also CC0,
 * with the faces smoothed into mannequin heads.
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
] as const;
