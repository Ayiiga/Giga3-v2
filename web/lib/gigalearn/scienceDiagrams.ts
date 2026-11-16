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
  "measuring-cylinder": {
    asset: "measuring-cylinder",
    alt: "Measuring cylinder. Graduated scale. Liquid level. Wide base. Read the bottom of the water meniscus at eye level..",
  },
  "conical-flask": {
    asset: "conical-flask",
    alt: "Conical flask. Narrow neck. Sloping shoulder. Flat base. The narrow neck helps prevent splashing when swirling..",
  },
  "volumetric-flask": {
    asset: "volumetric-flask",
    alt: "Volumetric flask. Stopper. Single calibration mark. Bulb. Make a solution up to the marked volume..",
  },
  "watch-glass": {
    asset: "watch-glass",
    alt: "Watch glass. Circular rim. Shallow concave surface. It can hold a small sample or cover a beaker..",
  },
  "spatula": {
    asset: "spatula",
    alt: "Spatula. Scoop end. Handle. Flat end. Transfer small amounts of solid reagent..",
  },
  "wash-bottle": {
    asset: "wash-bottle",
    alt: "Wash bottle. Bent delivery nozzle. Screw cap. Squeezable bottle. Internal dip tube. Use a controlled jet for rinsing..",
  },
  "reagent-bottle": {
    asset: "reagent-bottle",
    alt: "Reagent bottle. Tight-fitting cap. Contents label. Storage bottle. Choose compatible glass or plastic for the reagent..",
  },
  "desiccator": {
    asset: "desiccator",
    alt: "Desiccator. Lid handle. Sealed rim. Perforated shelf. Desiccant. The sample sits above the moisture-absorbing material..",
  },
  "crucible-tongs": {
    asset: "crucible-tongs",
    alt: "Crucible tongs. Finger loops. Pivot. Curved gripping jaws. Grip a hot crucible with the jaws..",
  },
  "digital-thermometer": {
    asset: "digital-thermometer",
    alt: "Digital thermometer. Digital display. Power button. Temperature-sensing tip. Wait for a stable reading before recording it..",
  },
  "ph-meter-and-ph-paper": {
    asset: "ph-meter-and-ph-paper",
    alt: "pH meter and pH paper. Meter display. pH electrode. Indicator paper. Comparison colour chart. A meter gives a reading; paper gives an estimate..",
  },
  "microscope": {
    asset: "microscope",
    alt: "Compound microscope. Eyepiece. Objective lenses. Slide stage. Focus knob. Light source. Begin focusing with the lowest-power objective..",
  },
  "beaker": {
    asset: "beaker",
    alt: "Laboratory beaker. Pouring spout. Approximate graduations. Flat base. Use it to hold or mix liquids..",
  },
  "test-tube": {
    asset: "test-tube",
    alt: "Test tube. Open mouth. Small sample. Rounded base.",
  },
  "test-tube-rack": {
    asset: "test-tube-rack",
    alt: "Test tube rack. Tube support. Test tubes. Rack base.",
  },
  "bunsen-burner": {
    asset: "bunsen-burner",
    alt: "Bunsen burner. Flame. Air inlet. Gas inlet. Base.",
  },
  "tripod-stand": {
    asset: "tripod-stand",
    alt: "Tripod stand. Support ring. One of three legs.",
  },
  "wire-gauze": {
    asset: "wire-gauze",
    alt: "Wire gauze. Wire mesh. Ceramic centre.",
  },
  "evaporating-dish": {
    asset: "evaporating-dish",
    alt: "Evaporating dish. Pouring lip. Shallow bowl.",
  },
  "crucible-with-lid": {
    asset: "crucible-with-lid",
    alt: "Crucible with lid. Removable lid. Heat-resistant crucible.",
  },
  "mortar-and-pestle": {
    asset: "mortar-and-pestle",
    alt: "Mortar and pestle. Mortar bowl. Pestle.",
  },
  "funnel": {
    asset: "funnel",
    alt: "Funnel. Wide mouth. Conical wall. Stem.",
  },
  "filter-paper": {
    asset: "filter-paper",
    alt: "Filter paper. Circular sheet. Folded paper cone.",
  },
  "stirring-rod": {
    asset: "stirring-rod",
    alt: "Stirring rod. Solid glass rod. Rounded end.",
  },
  "thermometer": {
    asset: "thermometer",
    alt: "Liquid-in-glass thermometer. Graduated scale. Liquid column. Sensing bulb.",
  },
  "weighing-balance": {
    asset: "weighing-balance",
    alt: "Weighing balance. Weighing pan. Mass display. Tare control.",
  },
  "retort-stand-with-clamp": {
    asset: "retort-stand-with-clamp",
    alt: "Retort stand with clamp. Stand rod. Boss head. Clamp jaws. Weighted base.",
  },
  "clamp": {
    asset: "clamp",
    alt: "Laboratory clamp. Support shaft. Adjusting screw. Padded jaws.",
  },
  "pipette-dropper": {
    asset: "pipette-dropper",
    alt: "Pipette dropper. Squeeze bulb. Dropper tube. Fine tip.",
  },
  "burette": {
    asset: "burette",
    alt: "Burette. Graduated tube. Stopcock. Delivery tip.",
  },
  "gas-jar": {
    asset: "gas-jar",
    alt: "Gas jar. Cover plate. Open rim. Gas collection space.",
  },
  "graduated-measuring-pipette": {
    asset: "graduated-measuring-pipette",
    alt: "Graduated pipette. Upper opening. Graduated scale. Delivery tip. Use a pipette filler..",
  },
  "magnetic-stirrer-with-hot-plate": {
    asset: "magnetic-stirrer-with-hot-plate",
    alt: "Magnetic stirrer hot plate. Stir bar inside the beaker. Heating surface. Stirring control. Heating control.",
  },
  "digital-multimeter": {
    asset: "digital-multimeter",
    alt: "Digital multimeter. Display. Mode selector. COM socket. Voltage/resistance socket.",
  },
  "human-excretory-system-organs-and-functions": {
    asset: "human-excretory-system-organs-and-functions",
    alt: "Urinary system. Kidneys form urine. Ureters carry urine. Bladder stores urine. Urethra carries urine out.",
  },
  "human-endocrine-system-glands-and-functions": {
    asset: "human-endocrine-system-glands-and-functions",
    alt: "Endocrine glands. Pituitary gland. Thyroid gland. Adrenal glands. Pancreas. Ovaries. Testes.",
  },
  "human-muscular-system-organs-and-functions": {
    asset: "human-muscular-system-organs-and-functions",
    alt: "Three types of muscle. Skeletal: striated, usually voluntary. Smooth: tapered, involuntary. Cardiac: branched, involuntary. Compare the shape and markings of the fibres..",
  },
  "human-reproductive-system-organs-and-functions": {
    asset: "human-reproductive-system-organs-and-functions",
    alt: "Reproductive systems. Ovary. Fallopian tube. Uterus. Cervix. Vagina. Testis. Sperm duct. Prostate. Penis.",
  },
  "human-respiratory-system-organs-and-functions": {
    asset: "human-respiratory-system-organs-and-functions",
    alt: "Respiratory system. Nasal passage. Trachea. Bronchi. Lung. Alveoli. Diaphragm.",
  },
  "human-digestive-system-organs-and-functions": {
    asset: "human-digestive-system-organs-and-functions",
    alt: "Digestive system. Mouth. Oesophagus. Liver. Gallbladder. Stomach. Pancreas. Small intestine. Large intestine. Rectum and anus.",
  },
  "human-circulatory-system-organs-and-functions": {
    asset: "human-circulatory-system-organs-and-functions",
    alt: "Right heart pumps to the lung capillaries; blood returns to the left heart. Left heart pumps to the body capillaries; blood returns to the right heart.",
  },
  "human-nervous-system-organs-and-functions": {
    asset: "human-nervous-system-organs-and-functions",
    alt: "Nervous system. Brain. Spinal cord. Peripheral nerves. Signals travel between the brain, spinal cord and body..",
  },
  "human-skeletal-system-organs-and-functions": {
    asset: "human-skeletal-system-organs-and-functions",
    alt: "Skeletal system. Skull. Rib cage. Vertebral column. Pelvis. Femur. Knee joint.",
  },
  "science-laboratory-rules-and-safety-precautions": {
    asset: "science-laboratory-rules-and-safety-precautions",
    alt: "Laboratory safety rules. Check risks before starting. Tell the teacher about incidents. Know where the eyewash and emergency equipment are..",
  },
  "laboratory-safety-symbols-and-meanings": {
    asset: "laboratory-safety-symbols-and-meanings",
    alt: "Chemical hazard pictograms. Read the complete chemical label..",
  },
};

const aliases: Readonly<Record<string, string>> = {
  "parts-of-a-compound-microscope": "microscope",
  "measuring-beaker": "beaker",
  "laboratory-thermometer": "thermometer",
  "setup-simple-titration-set-up-version-2": "simple-titration-set-up",
  "simple-titration-set-up-version-2": "simple-titration-set-up",
  "equipment-beaker": "beaker",
  "equipment-conical-flask": "conical-flask",
  "equipment-measuring-cylinder": "measuring-cylinder",
  "equipment-test-tube": "test-tube",
  "equipment-test-tube-rack": "test-tube-rack",
  "equipment-bunsen-burner": "bunsen-burner",
  "equipment-tripod-stand": "tripod-stand",
  "equipment-wire-gauze": "wire-gauze",
  "equipment-evaporating-dish": "evaporating-dish",
  "equipment-crucible-with-lid": "crucible-with-lid",
  "equipment-mortar-and-pestle": "mortar-and-pestle",
  "equipment-funnel": "funnel",
  "equipment-filter-paper": "filter-paper",
  "equipment-stirring-rod": "stirring-rod",
  "equipment-thermometer": "thermometer",
  "equipment-weighing-balance": "weighing-balance",
  "equipment-retort-stand-with-clamp": "retort-stand-with-clamp",
  "equipment-clamp": "clamp",
  "equipment-pipette-dropper": "pipette-dropper",
  "equipment-burette": "burette",
  "equipment-volumetric-flask": "volumetric-flask",
  "equipment-wash-bottle": "wash-bottle",
  "equipment-spatula": "spatula",
  "equipment-watch-glass": "watch-glass",
  "equipment-crucible-tongs": "crucible-tongs",
  "equipment-digital-thermometer": "digital-thermometer",
  "equipment-ph-meter-and-ph-paper": "ph-meter-and-ph-paper",
  "equipment-desiccator": "desiccator",
  "equipment-reagent-bottle": "reagent-bottle",
  "equipment-gas-jar": "gas-jar",
  "equipment-graduated-measuring-pipette": "graduated-measuring-pipette",
  "equipment-magnetic-stirrer-with-hot-plate": "magnetic-stirrer-with-hot-plate",
};

export function scienceDiagramFor(slug: string) {
  const name = Object.prototype.hasOwnProperty.call(aliases, slug) ? aliases[slug] : slug.replace(/^setup-/, "");
  const diagram = Object.prototype.hasOwnProperty.call(diagrams, name) ? diagrams[name] : undefined;
  return diagram
    ? { src: `/gigalearn/science-diagrams/${diagram.asset}.svg`, alt: diagram.alt }
    : undefined;
}
