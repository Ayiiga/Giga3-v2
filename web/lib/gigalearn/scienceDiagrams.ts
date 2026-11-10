const diagrams: Readonly<Record<string, { asset: string; alt: string }>> = {
  "preparation-of-hydrogen-gas": {
    asset: "hydrogen-gas",
    alt: "A reaction flask containing zinc and dilute hydrochloric acid connects by delivery tube to an inverted gas jar in a water trough. Hydrogen displaces the water.",
  },
  "evaporation-set-up": {
    asset: "evaporation",
    alt: "An evaporating dish holds salt solution over a hot plate. Arrows show water vapour escaping while the salt remains.",
  },
  "sublimation-set-up": {
    asset: "sublimation",
    alt: "Iodine vapour rises from the solid and deposits as crystals on a cold finger. Sublimation is solid to gas. Deposition is gas to solid.",
  },
  "electrolysis-of-water": {
    asset: "electrolysis",
    alt: "A DC supply drives separate electrodes. The negative cathode produces hydrogen and the positive anode produces oxygen. The gas volumes are about two to one.",
  },
  "separating-funnel-set-up": {
    asset: "separating-funnel",
    alt: "A clamped separating funnel holds oil above denser water. The open neck admits air as the lower water layer drains through the stopcock into a beaker.",
  },
  "filtration-set-up": {
    asset: "filtration",
    alt: "Filter paper inside a funnel retains sand residue. Water passes through into a beaker as the filtrate.",
  },
  "distillation-set-up": {
    asset: "distillation",
    alt: "Water vapour from a heated flask passes through a downward-sloping condenser. Coolant enters the lower connection and water distillate collects in a beaker.",
  },
  "simple-titration-set-up": {
    asset: "titration",
    alt: "A clamped graduated burette dispenses a measured volume through its stopcock into a conical flask containing the sample and indicator.",
  },
  "paper-chromatography-set-up": {
    asset: "chromatography",
    alt: "An ink spot starts on a pencil baseline above the solvent. Separated dye spots appear between the baseline and the solvent front.",
  },
};

export function scienceDiagramFor(slug: string) {
  const name = slug.replace(/^setup-/, "");
  const diagram = diagrams[name === "simple-titration-set-up-version-2" ? "simple-titration-set-up" : name];
  return diagram?.asset
    ? { src: `/gigalearn/science-diagrams/${diagram.asset}.svg`, alt: diagram.alt }
    : undefined;
}
