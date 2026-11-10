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
  "density-by-displacement-set-up": {
    asset: "density-by-displacement",
    alt: "The water level in a measuring cylinder rises from 50 to 70 mL when an irregular solid is fully submerged. Its volume is 20 cubic centimetres. Divide its separately measured mass by this volume to find density.",
  },
  "crystallisation-set-up": {
    asset: "crystallisation",
    alt: "A hot, saturated solution cools. Crystals form in the beaker as the solute becomes less soluble, leaving liquid around the crystals.",
  },
  "determination-of-boiling-point": {
    asset: "boiling-point",
    alt: "A clamped thermometer measures water in an open beaker over a hot plate. Its bulb is submerged without touching the glass, and the temperature is read when boiling is steady.",
  },
  "determination-of-melting-point": {
    asset: "melting-point",
    alt: "A solid sample in a capillary tube is aligned with the thermometer bulb in a heated oil bath. The melting range runs from first visible liquid to disappearance of the last solid.",
  },
  "diffusion-of-a-gas": {
    asset: "gas-diffusion",
    alt: "A particle model shows gas initially concentrated near one side of a chamber and later distributed more evenly as particles move in random directions.",
  },
  "brownian-motion-set-up": {
    asset: "brownian-motion",
    alt: "A microscope looks down on a side-lit smoke cell. The magnified view shows an irregular path of a smoke particle as air molecules collide with it.",
  },
  "gas-collection-over-water": {
    asset: "gas-collection-over-water",
    alt: "A delivery tube bubbles gas into an inverted, initially water-filled jar in a trough. The gas collects at the top and displaces the water.",
  },
  "heating-set-up": {
    asset: "heating-set-up",
    alt: "A beaker rests on wire gauze supported by a tripod above a Bunsen burner. A heatproof mat sits under the burner and tripod.",
  },
};

export function scienceDiagramFor(slug: string) {
  const name = slug.replace(/^setup-/, "");
  const diagram = diagrams[name === "simple-titration-set-up-version-2" ? "simple-titration-set-up" : name];
  return diagram?.asset
    ? { src: `/gigalearn/science-diagrams/${diagram.asset}.svg`, alt: diagram.alt }
    : undefined;
}
