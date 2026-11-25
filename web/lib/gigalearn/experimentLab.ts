export type LabSetting = { label: string; value: number };
export type LabTopic = "Motion" | "Light and sound" | "Materials and energy";

export type Experiment = {
  id: string;
  title: string;
  topic: LabTopic;
  scene: "motion" | "light" | "magnet" | "wave" | "meter";
  question: string;
  measure: string;
  unit: string;
  goal?: "min";
  settings: readonly [LabSetting, LabSetting, LabSetting];
  result: (value: number) => number;
  explanation: string;
  classroom: string;
};

export const EXPERIMENTS: readonly Experiment[] = [
  {
    id: "magnet", title: "Magnet Materials", topic: "Materials and energy", scene: "magnet",
    question: "Which object will move toward the magnet?",
    measure: "Attracted", unit: "",
    settings: [{ label: "Iron clip", value: 1 }, { label: "Wooden peg", value: 0 }, { label: "Plastic button", value: 0 }],
    result: (attracts) => attracts,
    explanation: "Iron is attracted by a magnet. The wood and plastic in this test are not. Some metals, such as aluminium, are also not attracted in this way.",
    classroom: "Ask a teacher to show what happens when a classroom magnet is held near an iron paper clip, a wooden pencil and a plastic ruler.",
  },
  {
    id: "circuit", title: "Light the Circuit", topic: "Materials and energy", scene: "light",
    question: "Which connection will make the lamp glow in this battery model?",
    measure: "Lamp on", unit: "",
    settings: [{ label: "Closed switch", value: 1 }, { label: "Open switch", value: 0 }, { label: "Missing wire", value: 0 }],
    result: (connected) => connected,
    explanation: "Current can flow in the model when the battery, wires and lamp form a complete loop.",
    classroom: "Draw the three circuits on paper. Ask a teacher to demonstrate with a school battery kit.",
  },
  {
    id: "friction", title: "Sliding Block", topic: "Motion", scene: "motion",
    question: "A block starts at the same speed on each surface. Which surface gives the longest slide in this model?",
    measure: "Stopping distance", unit: "cm",
    settings: [{ label: "Smooth tile", value: 0.2 }, { label: "Cardboard", value: 0.4 }, { label: "Rough mat", value: 0.8 }],
    result: (friction) => 8 / friction,
    explanation: "The model assigns different friction values. Greater friction slows the block faster and shortens its slide.",
    classroom: "With a teacher, release a block from the same low ramp onto different surfaces and compare how far it travels.",
  },
  {
    id: "lever", goal: "min", title: "Lever Lift", topic: "Motion", scene: "meter",
    question: "The same load stays 10 cm from the pivot. Where will you need the least effort?",
    measure: "Effort in the model", unit: "N",
    settings: [{ label: "10 cm from pivot", value: 10 }, { label: "20 cm from pivot", value: 20 }, { label: "40 cm from pivot", value: 40 }],
    result: (arm) => 80 / arm,
    explanation: "A longer effort arm lets a smaller force balance the same load. Force multiplied by distance from the pivot gives the turning effect.",
    classroom: "Draw a seesaw and label the pivot. Use a ruler and a pencil on a table to compare which position balances two identical erasers.",
  },
  {
    id: "pendulum", goal: "min", title: "Pendulum Swing", topic: "Motion", scene: "wave",
    question: "Which string length gives the shortest time for one complete swing?",
    measure: "Time for one swing", unit: "s",
    settings: [{ label: "25 cm string", value: 0.25 }, { label: "50 cm string", value: 0.5 }, { label: "100 cm string", value: 1 }],
    result: (length) => 2 * Math.PI * Math.sqrt(length / 9.81),
    explanation: "For small swings, a longer pendulum takes longer to swing back and forth.",
    classroom: "Ask your teacher to demonstrate two short pendulums. Time ten small swings of each to make comparison easier.",
  },
  {
    id: "spring", title: "Spring Stretch", topic: "Motion", scene: "meter",
    question: "For the same spring within its elastic range, which load makes it stretch most?",
    measure: "Extension from the starting length", unit: "cm",
    settings: [{ label: "1 N load", value: 1 }, { label: "2 N load", value: 2 }, { label: "3 N load", value: 3 }],
    result: (load) => load * 2,
    explanation: "This spring stretches 2 cm per newton within the modelled elastic range. A different spring may stretch by a different amount.",
    classroom: "Sketch how you would mark the spring's unloaded length and compare extensions in a teacher-led demonstration.",
  },
  {
    id: "gears", title: "Gear Train", topic: "Motion", scene: "meter",
    question: "A 12-tooth gear turns four times. Which connected gear turns the most?",
    measure: "Turns of the connected gear", unit: "turns",
    settings: [{ label: "12 teeth", value: 12 }, { label: "24 teeth", value: 24 }, { label: "48 teeth", value: 48 }],
    result: (teeth) => 48 / teeth,
    explanation: "The same number of teeth pass the contact point on both gears. A gear with more teeth needs fewer turns.",
    classroom: "Draw two connected gears of different sizes. Put a dot on each gear and trace how they would turn.",
  },
  {
    id: "mirror", title: "Mirror Ray", topic: "Light and sound", scene: "light",
    question: "Which incoming ray gives the greatest reflected angle, measured from the line perpendicular to the mirror?",
    measure: "Reflected angle from the perpendicular", unit: "°",
    settings: [{ label: "15° incoming angle", value: 15 }, { label: "30° incoming angle", value: 30 }, { label: "60° incoming angle", value: 60 }],
    result: (angle) => angle,
    explanation: "For a flat mirror, the angle of reflection equals the angle of incidence. Measure both angles from the perpendicular line.",
    classroom: "On paper, draw a mirror and a perpendicular line. Use a protractor to draw and measure two pairs of rays.",
  },
  {
    id: "pitch", title: "String Pitch", topic: "Light and sound", scene: "wave",
    question: "With the same string and tension, which vibrating length makes the highest pitch?",
    measure: "Vibration frequency", unit: "Hz",
    settings: [{ label: "20 cm string", value: 20 }, { label: "40 cm string", value: 40 }, { label: "80 cm string", value: 80 }],
    result: (length) => 8800 / length,
    explanation: "With tension and string type unchanged, a shorter vibrating section vibrates faster and produces a higher pitch.",
    classroom: "Listen as a teacher or musician plays the same string using shorter and longer vibrating lengths.",
  },
  {
    id: "pressure", goal: "min", title: "Block Footprints", topic: "Materials and energy", scene: "meter",
    question: "The same 12 N block rests on different faces. Which contact area gives the lowest pressure?",
    measure: "Pressure from the block", unit: "N/cm²",
    settings: [{ label: "2 cm² face", value: 2 }, { label: "4 cm² face", value: 4 }, { label: "8 cm² face", value: 8 }],
    result: (area) => 12 / area,
    explanation: "Pressure is force divided by contact area. Spreading the same force over a larger area lowers the pressure.",
    classroom: "Set a rectangular eraser on a soft pad on two different faces. Trace each contact area and compare their sizes.",
  },
  {
    id: "panel", title: "Solar Panel Angle", topic: "Light and sound", scene: "light",
    question: "Which angle from straight-on receives the most light per unit area in the model?",
    measure: "Light received compared with straight-on", unit: "%",
    settings: [{ label: "0° from straight-on", value: 0 }, { label: "30° from straight-on", value: 30 }, { label: "60° from straight-on", value: 60 }],
    result: (angle) => 100 * Math.cos(angle * Math.PI / 180),
    explanation: "The same beam spreads over more panel area when it hits at a slant, so each part of the panel receives less light.",
    classroom: "Draw equal-width beams approaching a card straight-on and at an angle. Outline the patch each beam covers.",
  },
  {
    id: "water-jet", title: "Water Jet Depth", topic: "Materials and energy", scene: "motion",
    question: "The tank stays full at the same level. Which hole depth gives the fastest jet in the model?",
    measure: "Jet exit speed", unit: "m/s",
    settings: [{ label: "5 cm below the surface", value: 0.05 }, { label: "10 cm below the surface", value: 0.1 }, { label: "20 cm below the surface", value: 0.2 }],
    result: (depth) => Math.sqrt(2 * 9.81 * depth),
    explanation: "Pressure increases with depth. At a deeper hole the model predicts a faster initial jet.",
    classroom: "Sketch a tank and mark three depths. Ask an adult to demonstrate with a prepared container over a basin.",
  },
  {
    id: "mix", title: "Mix Water Temperatures", topic: "Materials and energy", scene: "meter",
    question: "Mix a cup at 20 °C with an equal cup. Which second cup gives the warmest mixture?",
    measure: "Final temperature in the insulated model", unit: "°C",
    settings: [{ label: "20 °C water", value: 20 }, { label: "30 °C water", value: 30 }, { label: "35 °C water", value: 35 }],
    result: (other) => (20 + other) / 2,
    explanation: "For equal amounts of water and negligible heat loss, the final model temperature is the average of the starting temperatures.",
    classroom: "With a teacher and a school thermometer, compare equal amounts of cool and mildly warm water before and after mixing.",
  },
  {
    id: "air", title: "Trapped Air", topic: "Materials and energy", scene: "meter",
    question: "In a sealed model cylinder at constant temperature, which volume gives the highest air pressure?",
    measure: "Pressure compared with the 40 mL setting", unit: "×",
    settings: [{ label: "40 mL", value: 40 }, { label: "30 mL", value: 30 }, { label: "20 mL", value: 20 }],
    result: (volume) => 40 / volume,
    explanation: "With the same amount of air and a constant temperature, reducing the volume raises the pressure.",
    classroom: "Sketch the same number of air particles in a large box and a smaller box. Compare the spacing.",
  },
  {
    id: "wave", title: "Ripple Spacing", topic: "Light and sound", scene: "wave",
    question: "The model wave speed stays constant. Which frequency gives the longest distance between peaks?",
    measure: "Wavelength", unit: "cm",
    settings: [{ label: "2 waves per second", value: 2 }, { label: "4 waves per second", value: 4 }, { label: "8 waves per second", value: 8 }],
    result: (frequency) => 40 / frequency,
    explanation: "At a fixed speed, waves created more often have less space between peaks. Wavelength equals speed divided by frequency.",
    classroom: "Draw two sets of ripples with the same starting edge. Make one set closely spaced and measure the distances between peaks.",
  },
  {
    id: "pulley", goal: "min", title: "Pulley Lift", topic: "Motion", scene: "meter",
    question: "Which ideal rope arrangement needs the least force to lift the same 12 N load?",
    measure: "Effort without friction", unit: "N",
    settings: [{ label: "1 supporting rope segment", value: 1 }, { label: "2 supporting rope segments", value: 2 }, { label: "4 supporting rope segments", value: 4 }],
    result: (segments) => 12 / segments,
    explanation: "More supporting rope segments share the weight. You pull more rope to raise the load the same distance.",
    classroom: "Draw the pulley arrangements and highlight each rope segment supporting the moving load.",
  },
];
