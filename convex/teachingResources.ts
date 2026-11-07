import { httpAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { isPlatformAdminEmail } from "./platformAdmin";
import { isSubscriptionActive } from "./creditsConfig";

const fileKind = v.union(v.literal("guide"), v.literal("worksheet"), v.literal("image"), v.literal("diagram"));
const accessKind = v.union(v.literal("free"), v.literal("subscriber"));
const statusKind = v.union(v.literal("draft"), v.literal("pending"), v.literal("published"), v.literal("archived"));

function parseStringArray(value: string, field: string): string[] {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error(`${field} must be valid JSON.`); }
  if (!Array.isArray(parsed) || !parsed.every(item => typeof item === "string")) {
    throw new Error(`${field} must be a JSON array of text values.`);
  }
  return parsed;
}


async function hasActiveSubscriptionAccess(ctx: any, email: string, user: any): Promise<boolean> {
  // The subscriptions table is the billing source of truth. Older accounts may
  // have a valid active row while denormalized users fields are stale.
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_user_status", (q: any) => q.eq("userId", email).eq("status", "active"))
    .order("desc")
    .first();
  const now = Date.now();
  const subscriptionRowActive = Boolean(subscription && subscription.periodEnd > now);
  const userPlanActive = Boolean(
    user && isSubscriptionActive(
      (user.subscriptionPlan ?? "free") as any,
      user.subscriptionExpiresAt
    )
  );
  return subscriptionRowActive || userPlanActive;
}

function publicResource(row: any) {
  return {
    _id: row._id, slug: row.slug, title: row.title, summary: row.summary,
    subject: row.subject, levelBand: row.levelBand, classes: row.classes,
    topic: row.topic, category: row.category, activity: row.activity,
    access: row.access, previewText: row.previewText ?? null,
    videoUrl: row.videoUrl ?? null,
  };
}

export const listPublished = query({
  args: {
    search: v.optional(v.string()), subject: v.optional(v.string()),
    levelBand: v.optional(v.union(v.literal("jhs"), v.literal("shs"), v.literal("both"))),
    className: v.optional(v.string()), category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let rows = await ctx.db.query("teachingResources")
      .withIndex("by_status_updated", q => q.eq("status", "published"))
      .order("desc").collect();
    if (args.subject) rows = rows.filter(r => r.subject === args.subject);
    if (args.levelBand) rows = rows.filter(r => r.levelBand === args.levelBand || r.levelBand === "both");
    if (args.className) rows = rows.filter(r => r.classes.includes(args.className!));
    if (args.category) rows = rows.filter(r => r.category === args.category);
    const q = args.search?.trim().toLowerCase();
    if (q) rows = rows.filter(r =>
      [r.title, r.summary, r.subject, r.topic, r.category, r.activity].join(" ").toLowerCase().includes(q)
    );
    return rows.slice(0, 300).map(publicResource);
  },
});

export const getPublicDetail = query({
  args: { slug: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("teachingResources")
      .withIndex("by_slug", q => q.eq("slug", args.slug)).first();
    if (!row || row.status !== "published") return null;
    let active = false;
    if (args.sessionToken) {
      try {
        const email = await requireSession(args.sessionToken, ctx);
        const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", email)).first();
        active = await hasActiveSubscriptionAccess(ctx, email, user);
      } catch { active = false; }
    }
    const fullAccess = active || row.access === "free";
    const components = JSON.parse(row.componentsJson);
    const instructions = JSON.parse(row.instructionsJson);
    const activities = JSON.parse(row.activitiesJson);
    const safety = JSON.parse(row.safetyJson);
    const mistakes = JSON.parse(row.mistakesJson);
    return {
      ...publicResource(row),
      description: fullAccess ? row.description : (row.previewText ?? row.summary),
      components: fullAccess ? components : components.slice(0, 2),
      instructions: fullAccess ? instructions : instructions.slice(0, 1),
      activities: fullAccess ? activities : activities.slice(0, 1),
      safety: fullAccess ? safety : safety.slice(0, 1),
      commonMistakes: fullAccess ? mistakes : [],
      teacherGuidance: fullAccess ? row.teacherGuidance ?? "" : "",
      studentExercises: fullAccess ? row.studentExercises ?? "" : "",
      curriculumReference: row.curriculumReference ?? "",
      hasImage: Boolean(row.imageStorageId), hasDiagram: Boolean(row.diagramStorageId),
      hasGuide: Boolean(row.guideStorageId), hasWorksheet: Boolean(row.worksheetStorageId),
      fullAccess,
    };
  },
});

export const listAdminResources = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    const rows = await ctx.db.query("teachingResources").order("desc").take(300);
    return rows.map(row => ({
      _id: row._id, slug: row.slug, title: row.title, subject: row.subject,
      status: row.status, access: row.access, hasGuide: Boolean(row.guideStorageId),
      hasWorksheet: Boolean(row.worksheetStorageId), hasImage: Boolean(row.imageStorageId),
      hasDiagram: Boolean(row.diagramStorageId),
    }));
  },
});

export const seedStarterResources = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    const starters = [
      { slug: "microscope", title: "Compound Light Microscope", subject: "Integrated Science", levelBand: "jhs" as const, classes: ["JHS 2", "JHS 3"], topic: "Cells and microscopy", category: "Laboratory Equipment", activity: "Observe onion epidermal cells", summary: "Learn the parts, functions and safe operation of a compound light microscope.", description: "A compound light microscope uses visible light and multiple lenses to magnify small specimens so that cells and other structures can be observed.", components: ["Eyepiece: lens viewed by the eye", "Objective lenses: provide different magnifications", "Stage and clips: hold the slide", "Diaphragm: controls light", "Coarse and fine focus knobs: sharpen the image"], instructions: ["Carry the microscope with two hands, supporting the arm and base.", "Place it on a stable, dry bench and select the low-power objective.", "Place a prepared slide on the stage and secure it with clips.", "Adjust the light and look through the eyepiece while using coarse focus carefully.", "Use fine focus to sharpen the image; centre the specimen before changing magnification.", "After use, return to low power, remove the slide and cover the microscope."], activities: ["Observe a prepared onion-cell slide and draw what is visible.", "Compare the field of view at low and high power."], safety: ["Carry with two hands.", "Never allow the objective lens to touch the slide.", "Keep liquids away from electrical parts.", "Clean lenses only with lens paper."], mistakes: ["Starting on high power", "Using coarse focus on high power", "Touching lenses with fingers"] },
      { slug: "measuring-beaker", title: "Laboratory Beaker", subject: "Chemistry", levelBand: "shs" as const, classes: ["SHS 1", "SHS 2"], topic: "Laboratory apparatus and measurement", category: "Laboratory Equipment", activity: "Measure and mix a liquid sample", summary: "Identify a beaker and use it safely for holding, mixing and approximate volume measurement.", description: "A beaker is a wide-mouthed laboratory vessel used mainly for holding, mixing and heating liquids. Its graduations give approximate rather than highly accurate volumes.", components: ["Rim and spout: pouring", "Graduation marks: approximate volume", "Flat base: stable support", "Heat-resistant glass: suitable for controlled heating when specified"], instructions: ["Check the beaker for cracks or chips.", "Place it on a stable, suitable surface.", "Pour the liquid slowly and read the approximate graduation at eye level.", "Use a measuring cylinder when an accurate volume is required.", "Use suitable tongs or heat protection for hot glassware and allow it to cool before washing."], activities: ["Compare a beaker reading with a measuring-cylinder reading.", "Mix two safe water-based solutions as directed by the teacher."], safety: ["Do not use cracked glassware.", "Never heat a sealed container.", "Use eye protection and teacher-approved heating equipment.", "Treat hot glass as hot even when it looks cool."], mistakes: ["Treating beaker graduations as precise", "Heating damaged glassware", "Pouring too close to the rim"] },
      { slug: "laboratory-thermometer", title: "Laboratory Thermometer", subject: "Integrated Science", levelBand: "jhs" as const, classes: ["JHS 1", "JHS 2"], topic: "Temperature and heat", category: "Laboratory Equipment", activity: "Measure the temperature of water", summary: "Read temperature correctly and use a laboratory thermometer without damaging it.", description: "A laboratory thermometer measures the temperature of substances during an experiment. The scale and range depend on the instrument.", components: ["Bulb or sensing tip: detects temperature", "Stem: supports the scale", "Graduated scale: displays temperature", "Liquid column or digital display: indicates the reading"], instructions: ["Check the thermometer range and condition.", "Place the sensing bulb in the liquid without touching the container sides or base.", "Wait for the reading to stabilise.", "Read at eye level while the bulb remains immersed.", "Remove carefully, clean as instructed and store safely."], activities: ["Measure room-temperature water and warm water using teacher-approved methods.", "Record readings in a results table and compare them."], safety: ["Do not use a damaged glass thermometer.", "Do not exceed the stated temperature range.", "Avoid direct flame unless the instrument is designed for it.", "Report spills or breakage immediately."], mistakes: ["Allowing the bulb to touch the beaker", "Reading from above or below eye level", "Recording before the reading stabilises"] },
      { slug: "digital-multimeter", title: "Digital Multimeter", subject: "Physics", levelBand: "shs" as const, classes: ["SHS 1", "SHS 2", "SHS 3"], topic: "Electricity and electrical measurement", category: "Practical Materials", activity: "Measure a low-voltage cell", summary: "Understand multimeter controls and safely measure voltage in a low-voltage classroom circuit.", description: "A digital multimeter measures electrical quantities such as voltage, current and resistance. Learners should use only teacher-approved low-voltage circuits.", components: ["Display: shows measured value", "Rotary selector: chooses measurement type and range", "COM socket: common test lead", "V/Ω socket: voltage and resistance lead", "Current socket: current measurement lead"], instructions: ["Inspect the meter and leads for damage.", "Ask the teacher to confirm the correct mode, range and sockets.", "For voltage, connect the meter in parallel with the low-voltage component.", "Observe polarity for DC measurements and record the display.", "Disconnect the leads and return the selector to OFF."], activities: ["Measure the voltage of a teacher-approved low-voltage cell.", "Compare the voltage across two cells connected in series under supervision."], safety: ["Never measure mains electricity as a student activity.", "Never connect a meter set to current mode directly across a battery.", "Use only approved low-voltage supplies.", "Do not use damaged leads or equipment."], mistakes: ["Wrong socket or selector setting", "Connecting a voltmeter in series", "Attempting mains measurements"] },
    ];
    let created = 0;
    for (const item of starters) {
      const existing = await ctx.db.query("teachingResources").withIndex("by_slug", q => q.eq("slug", item.slug)).first();
      if (existing) continue;
      const { components, instructions, activities, safety, mistakes, ...base } = item;
      const now = Date.now();
      await ctx.db.insert("teachingResources", {
        ...base, componentsJson: JSON.stringify(components), instructionsJson: JSON.stringify(instructions),
        activitiesJson: JSON.stringify(activities), safetyJson: JSON.stringify(safety), mistakesJson: JSON.stringify(mistakes),
        teacherGuidance: "Demonstrate the equipment first, check learners understand its purpose, then supervise small-group practice. Align the activity to the school's approved scheme of learning.",
        studentExercises: "Draw and label the equipment. State its purpose, describe the safe operating steps and record observations in a results table.",
        previewText: item.summary, access: "subscriber", status: "published",
        createdBy: email, reviewedBy: email, reviewedAt: now, createdAt: now, updatedAt: now,
      });
      created++;
    }
    return { created, message: created ? `Published ${created} starter practical guides.` : "Starter resources are already available." };
  },
});


/**
 * Idempotently publishes the first curated Ghana JHS/SHS science-aid catalogue.
 * Each poster/topic is its own searchable resource. Images are attached through
 * the existing administrator upload queue after the records are created.
 */
export const seedScienceLearningAids = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    const allClasses = ["JHS 1", "JHS 2", "JHS 3", "SHS 1", "SHS 2", "SHS 3"];
    const make = (slug: string, title: string, topic: string, category: string, summary: string, description: string, components: string[], activity: string, safety: string[] = []) => ({
      slug, title, subject: "Integrated Science", levelBand: "both" as const, classes: allClasses,
      topic, category, activity, summary, description, components,
      instructions: ["Study the labelled illustration and identify each part or stage.", "Explain the function of each labelled part in your own words.", "Complete the related class activity and compare answers with a partner."],
      activities: [activity], safety, mistakes: [],
    });
    const items = [
      make("parts-of-a-compound-microscope", "Parts of a Compound Microscope", "Microscopy; cells; microscope parts and functions", "Laboratory Equipment", "Identify the ocular lenses, revolving nosepiece, objective lenses, stage, condenser, light source, arm and focusing controls.", "A compound microscope uses visible light and a system of lenses to magnify small specimens. Learners identify the main parts, explain their functions and practise safe handling and focusing.", ["Ocular lens / eyepiece — lens viewed through", "Revolving nosepiece — holds and rotates objective lenses", "Objective lenses — provide different magnifications", "Stage and clips — support and secure the slide", "Condenser and diaphragm — direct and regulate light", "Coarse and fine adjustment — bring the specimen into focus", "Arm and base — support and carry the microscope"], "Draw and label a compound microscope; calculate total magnification by multiplying eyepiece and objective magnifications.", ["Carry with two hands, supporting the arm and base.", "Begin focusing with the lowest-power objective.", "Keep the objective lens from touching the slide."]),
      make("common-science-laboratory-equipment-uses", "Common Science Laboratory Equipment and Their Uses", "Laboratory apparatus; equipment identification; practical science", "Laboratory Equipment", "Identify common apparatus including beakers, conical flasks, measuring cylinders, test tubes, burners, tripods, wire gauze, funnels and balances.", "A visual guide to frequently used science laboratory apparatus and their purposes. It distinguishes equipment for holding, measuring, heating, transferring, separating and weighing substances.", ["Beaker — holds, mixes and heats liquids", "Conical flask — mixes and stores solutions", "Measuring cylinder — measures liquid volume", "Test tube and rack — hold small samples upright", "Bunsen burner, tripod and wire gauze — provide controlled heating and support", "Evaporating dish and crucible — heat or evaporate materials", "Funnel and filter paper — support filtration", "Thermometer and balance — measure temperature and mass"], "Match each apparatus to its name, function and the practical activity in which it is used.", ["Wear goggles and follow teacher instructions.", "Use tongs or suitable heat protection for hot apparatus.", "Never heat sealed containers."]),
      make("additional-science-laboratory-equipment-uses", "Additional Science Laboratory Equipment and Their Uses", "Laboratory apparatus; measurement; handling and storage", "Laboratory Equipment", "Learn the uses of retort stands, clamps, pipettes, burettes, volumetric flasks, wash bottles, spatulas, tongs, pH meters and desiccators.", "This resource introduces additional apparatus used for accurate measurement, supporting glassware, transferring samples, preparing solutions, testing pH and keeping materials dry.", ["Retort stand and clamp — support apparatus", "Pipette — transfers measured liquid", "Burette — delivers accurately measured variable volumes", "Volumetric flask — prepares a solution to an exact volume", "Wash bottle — rinses apparatus with distilled water", "Spatula and tongs — transfer solids and handle hot items", "pH meter — measures acidity or alkalinity", "Desiccator — keeps substances dry"], "Select the correct apparatus for measuring a fixed volume, delivering a variable volume and preparing a standard solution.", ["Use pipette fillers; never pipette by mouth.", "Handle hot crucibles with suitable tongs.", "Use chemical containers with clear labels."]),
      make("common-science-laboratory-setups-1-9", "Common Science Laboratory Set-ups (1–9)", "Filtration; heating; distillation; titration; gas collection; evaporation; sublimation; separating funnel", "Laboratory Set-ups", "Study nine common practical arrangements and the apparatus used in each set-up.", "A visual guide to filtration, heating, distillation, simple titration, gas collection over water, gas preparation, evaporation, sublimation and separation with a separating funnel.", ["Filtration — separates an insoluble solid from a liquid", "Heating — warms a substance using a burner and support", "Distillation — vaporises and condenses a liquid", "Titration — determines concentration by controlled reaction", "Gas collection — collects suitable gases over water", "Gas preparation — generates and collects a gas", "Evaporation — obtains a dissolved solid", "Sublimation — separates a sublimable solid", "Separating funnel — separates immiscible liquids"], "For each set-up, name the apparatus, draw the arrangement and explain the separation or measurement principle.", ["Perform heating and gas-generation experiments only under direct teacher supervision.", "Use eye protection and check glassware before use."]),
      make("more-science-laboratory-setups-1-9", "More Science Laboratory Set-ups (1–9)", "Electrolysis; titration; Brownian motion; diffusion; melting point; boiling point; crystallisation; chromatography; density", "Laboratory Set-ups", "Explore nine further practical arrangements used to investigate physical and chemical properties.", "This learning aid covers electrolysis of water, titration, Brownian motion, diffusion of gases, melting point, boiling point, crystallisation, paper chromatography and density by displacement.", ["Electrolysis — decomposes water using electrical energy", "Titration — estimates solution concentration", "Brownian motion — shows random movement of tiny particles", "Gas diffusion — demonstrates movement and mixing of gases", "Melting point — determines when a solid melts", "Boiling point — determines when a liquid boils", "Crystallisation — obtains crystals from a solution", "Chromatography — separates mixture components", "Displacement — measures the volume of an irregular solid"], "Identify the independent, dependent and controlled variables for one of the investigations.", ["Use only teacher-approved low-voltage supplies for electrolysis.", "Handle acids, flames and hot apparatus under supervision."]),
      make("science-laboratory-rules-and-safety-precautions", "Science Laboratory Rules and Safety Precautions", "Laboratory conduct; personal protective equipment; accident prevention", "Laboratory Safety", "Learn essential rules for safe conduct, protective clothing, chemical handling, cleanliness and emergency reporting.", "This resource explains expected behaviour before, during and after practical science lessons, including following instructions, wearing protective equipment and reporting accidents immediately.", ["Follow the teacher's instructions.", "Wear a laboratory coat or apron and safety goggles.", "Use gloves when required for the substance or procedure.", "Do not eat, drink, taste or directly smell chemicals.", "Keep benches clean and dispose of waste correctly.", "Keep flammable materials away from flames.", "Report spills, breakages and injuries immediately.", "Know the locations of the fire extinguisher, first-aid box and eyewash station."], "Create a laboratory safety checklist and explain how to respond to a chemical spill or broken glass.", ["Never work with hazardous chemicals or flames without teacher supervision.", "Use a fume cupboard when instructed for harmful vapours."]),
      make("laboratory-safety-symbols-and-meanings", "Laboratory Safety Symbols and Their Meanings", "Hazard pictograms; chemical labels; risk awareness", "Laboratory Symbols", "Recognise hazard symbols and understand the risks they communicate on chemical containers and in laboratories.", "A visual reference to common hazard pictograms, including flammable, explosive, corrosive, toxic, harmful or irritant, oxidising, gas under pressure, environmental, radioactive and biological hazards.", ["Flammable — catches fire easily", "Explosive — may explode under specified conditions", "Corrosive — can cause burns or corrode materials", "Toxic — can cause serious harm or death", "Harmful / irritant — may cause irritation or other harm", "Oxidising — can intensify a fire", "Gas under pressure — container may rupture if heated", "Environmental hazard — harmful to organisms or ecosystems", "Radioactive — emits ionising radiation", "Biological hazard — may contain infectious material"], "Match each symbol to its meaning and identify the precaution required before handling a labelled substance.", ["Read the complete chemical label before use.", "Do not handle unknown substances.", "Follow the teacher's instructions and the laboratory risk assessment."]),
      make("human-digestive-system-organs-and-functions", "The Human Digestive System: Organs and Functions", "Human body systems; digestion; nutrition; absorption", "Human Biology", "Identify the mouth, oesophagus, stomach, liver, gallbladder, pancreas, small intestine, large intestine, rectum and anus.", "The digestive system breaks food into smaller soluble substances, absorbs nutrients and water, and removes undigested waste. Accessory organs support digestion by producing or storing digestive substances.", ["Mouth — chews food and mixes it with saliva", "Oesophagus — moves food to the stomach by peristalsis", "Stomach — churns food and begins protein digestion", "Liver — produces bile", "Gallbladder — stores and releases bile", "Pancreas — releases digestive enzymes", "Small intestine — completes digestion and absorbs most nutrients", "Large intestine — absorbs water and forms faeces", "Rectum and anus — store and expel faeces"], "Trace the path of food through the alimentary canal and explain where digestion and absorption occur.", []),
      make("human-respiratory-system-organs-and-functions", "The Human Respiratory System: Organs and Functions", "Human body systems; breathing; gas exchange; respiration", "Human Biology", "Identify the nose, mouth, trachea, bronchi, bronchioles, alveoli, lungs and diaphragm.", "The respiratory system takes oxygen into the body and removes carbon dioxide. Gas exchange occurs across the thin walls of the alveoli, while the diaphragm helps ventilate the lungs.", ["Nose — filters, warms and moistens incoming air", "Trachea — carries air towards the lungs", "Bronchi — carry air into each lung", "Bronchioles — distribute air within the lungs", "Alveoli — exchange oxygen and carbon dioxide with blood", "Lungs — contain the airways and alveoli", "Diaphragm — changes chest volume during breathing"], "Use a labelled diagram to describe inhalation and exhalation and explain gas exchange in the alveoli.", []),
      make("human-circulatory-system-organs-and-functions", "The Human Circulatory System: Organs and Functions", "Human body systems; heart; blood; blood vessels; transport", "Human Biology", "Study the heart, blood, arteries, veins and capillaries and how they work together.", "The circulatory system transports oxygen, nutrients and hormones around the body and carries carbon dioxide and other waste products away from cells.", ["Heart — muscular pump that moves blood", "Arteries — carry blood away from the heart", "Veins — return blood towards the heart", "Capillaries — allow exchange between blood and tissues", "Blood — transports gases, nutrients, hormones and wastes"], "Trace the route of blood through the heart, lungs and body and compare arteries, veins and capillaries.", []),
      make("human-nervous-system-organs-and-functions", "The Human Nervous System: Organs and Functions", "Human body systems; brain; spinal cord; nerves; coordination", "Human Biology", "Identify the brain, spinal cord and nerves and explain how they coordinate body activities.", "The nervous system detects changes inside and outside the body, processes information and coordinates rapid responses through nerve impulses.", ["Brain — processes information and coordinates activities", "Spinal cord — carries messages between the brain and body and coordinates some reflexes", "Nerves — carry impulses to and from the central nervous system", "Sense receptors — detect stimuli such as touch, light, sound and temperature"], "Draw a simple stimulus-response pathway and explain the role of the brain, spinal cord and nerves in a reflex action.", []),
      make("human-skeletal-system-organs-and-functions", "The Human Skeletal System: Bones and Functions", "Human body systems; skeleton; joints; support and protection", "Human Biology", "Identify major bones and explain the roles of the skeleton, joints and cartilage.", "The skeletal system supports the body, protects delicate organs, provides attachment points for muscles and works with muscles to produce movement. Bone marrow also forms blood cells.", ["Skull — protects the brain", "Vertebral column — supports the body and protects the spinal cord", "Rib cage — protects the heart and lungs", "Pelvis — supports the trunk and protects pelvic organs", "Femur and other limb bones — support movement", "Joints — allow movement between bones", "Cartilage — cushions and reduces friction at joints"], "Label a human skeleton and classify examples of bones by shape or function.", []),
      make("human-muscular-system-organs-and-functions", "The Human Muscular System: Types and Functions", "Human body systems; skeletal muscle; smooth muscle; cardiac muscle", "Human Biology", "Compare skeletal, smooth and cardiac muscles and explain how muscles support movement and body functions.", "Muscles contract to produce movement, maintain posture and generate heat. Different muscle types perform voluntary and involuntary actions.", ["Skeletal muscles — attach to bones and produce voluntary movement", "Smooth muscles — move substances through internal organs", "Cardiac muscle — contracts rhythmically in the heart", "Tendons — attach muscles to bones"], "Compare the location, appearance and control of the three muscle types and identify examples in the body.", []),
      make("human-excretory-system-organs-and-functions", "The Human Excretory System: Organs and Functions", "Human body systems; kidneys; urine; waste removal; osmoregulation", "Human Biology", "Identify the kidneys, ureters, urinary bladder and urethra and explain urine formation and removal.", "The urinary system filters blood, removes metabolic wastes and helps regulate water and salt balance in the body.", ["Kidneys — filter blood and form urine", "Ureters — carry urine to the bladder", "Urinary bladder — stores urine temporarily", "Urethra — carries urine out of the body"], "Trace the path of urine and explain why the kidneys are important for maintaining internal balance.", []),
      make("human-reproductive-system-organs-and-functions", "The Human Reproductive System: Organs and Functions", "Human body systems; male and female reproductive organs; reproduction", "Human Biology", "Identify the main male and female reproductive organs and describe their roles in human reproduction.", "The reproductive system produces sex cells and sex hormones and enables fertilisation and reproduction. The male and female systems have different organs and functions.", ["Testes — produce sperm and testosterone", "Sperm duct — transports sperm", "Prostate gland — adds fluid to semen", "Penis — delivers semen", "Ovaries — produce ova and hormones", "Fallopian tubes — transport the ovum and are the usual site of fertilisation", "Uterus — supports development during pregnancy", "Cervix and vagina — form the lower reproductive passage"], "Compare the male and female reproductive systems using labelled diagrams and describe fertilisation at an age-appropriate curriculum level.", []),
      make("human-endocrine-system-glands-and-functions", "The Human Endocrine System: Glands and Functions", "Human body systems; hormones; endocrine glands; coordination", "Human Biology", "Identify major endocrine glands and explain how hormones regulate body activities.", "The endocrine system consists of glands that release hormones into the blood. These chemical messengers regulate growth, metabolism, reproduction and responses to stress.", ["Pituitary gland — regulates several other endocrine glands", "Thyroid gland — helps regulate metabolism", "Adrenal glands — release hormones involved in stress responses", "Pancreas — produces insulin and glucagon to regulate blood glucose", "Ovaries — produce oestrogen and progesterone", "Testes — produce testosterone"], "Match each endocrine gland to a hormone and one major function, and explain how hormones travel to target organs.", []),
    ];
    let created = 0;
    for (const item of items) {
      const existing = await ctx.db.query("teachingResources").withIndex("by_slug", q => q.eq("slug", item.slug)).first();
      if (existing) continue;
      const now = Date.now();
      await ctx.db.insert("teachingResources", {
        slug: item.slug, title: item.title, summary: item.summary, description: item.description,
        subject: item.subject, levelBand: item.levelBand, classes: item.classes, topic: item.topic,
        category: item.category, activity: item.activity,
        componentsJson: JSON.stringify(item.components), instructionsJson: JSON.stringify(item.instructions),
        activitiesJson: JSON.stringify(item.activities), safetyJson: JSON.stringify(item.safety),
        mistakesJson: JSON.stringify(item.mistakes),
        teacherGuidance: "Use the labelled learning aid for teacher-led explanation, learner discussion and a short formative assessment. Adapt the activity to the approved class scheme of learning.",
        studentExercises: "Label the relevant parts, explain their functions and answer the activity questions in your own words.",
        previewText: item.summary, access: "free", status: "published",
        createdBy: email, reviewedBy: email, reviewedAt: now, createdAt: now, updatedAt: now,
      });
      created++;
    }
    return { created, total: items.length, message: created ? `Published ${created} of ${items.length} science learning resources. Attach the matching image to each record in the administrator review queue.` : "All 16 science learning resources are already present." };
  },
});

export const createResource = mutation({
  args: {
    sessionToken: v.string(), slug: v.string(), title: v.string(), summary: v.string(),
    description: v.string(), subject: v.string(), levelBand: v.union(v.literal("jhs"), v.literal("shs")),
    classes: v.array(v.string()), topic: v.string(), category: v.string(), activity: v.string(),
    componentsJson: v.string(), instructionsJson: v.string(), activitiesJson: v.string(),
    safetyJson: v.string(), mistakesJson: v.string(), teacherGuidance: v.optional(v.string()),
    studentExercises: v.optional(v.string()), curriculumReference: v.optional(v.string()),
    previewText: v.optional(v.string()), videoUrl: v.optional(v.string()), access: accessKind,
    status: statusKind,
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Only platform administrators can create official resources.");
    const slug = args.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!slug || slug.length > 100) throw new Error("Enter a valid resource slug.");
    const existing = await ctx.db.query("teachingResources").withIndex("by_slug", q => q.eq("slug", slug)).first();
    if (existing) throw new Error("A resource with this slug already exists.");
    const now = Date.now();
    parseStringArray(args.componentsJson, "Components");
    parseStringArray(args.instructionsJson, "Instructions");
    parseStringArray(args.activitiesJson, "Activities");
    parseStringArray(args.safetyJson, "Safety precautions");
    parseStringArray(args.mistakesJson, "Common mistakes");
    const { sessionToken: _token, ...data } = args;
    return await ctx.db.insert("teachingResources", {
      ...data, slug, createdBy: email, createdAt: now, updatedAt: now,
    });
  },
});

export const updateResourceStatus = mutation({
  args: { sessionToken: v.string(), resourceId: v.id("teachingResources"), status: statusKind },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    await ctx.db.patch(args.resourceId, {
      status: args.status,
      ...(args.status === "published" ? { reviewedBy: email, reviewedAt: Date.now() } : {}),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const createUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachResourceFile = mutation({
  args: { sessionToken: v.string(), resourceId: v.id("teachingResources"), fileKind, storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) throw new Error("Uploaded file was not found.");
    const allowed = args.fileKind === "guide" || args.fileKind === "worksheet"
      ? ["application/pdf"]
      : args.fileKind === "image" ? ["image/jpeg", "image/png", "image/webp"] : ["image/png", "image/jpeg"];
    if (!allowed.includes(metadata.contentType)) throw new Error("Unsupported file type for this resource attachment.");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.fileKind === "guide") { patch.guideStorageId = args.storageId; patch.guideContentType = metadata.contentType; }
    if (args.fileKind === "worksheet") { patch.worksheetStorageId = args.storageId; patch.worksheetContentType = metadata.contentType; }
    if (args.fileKind === "image") { patch.imageStorageId = args.storageId; patch.imageContentType = metadata.contentType; }
    if (args.fileKind === "diagram") { patch.diagramStorageId = args.storageId; patch.diagramContentType = metadata.contentType; }
    await ctx.db.patch(args.resourceId, patch);
    return { ok: true };
  },
});

export const issueDownloadToken = mutation({
  args: { sessionToken: v.string(), resourceId: v.id("teachingResources"), fileKind },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.status !== "published") throw new Error("Resource is unavailable.");
    const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", email)).first();
    const active = await hasActiveSubscriptionAccess(ctx, email, user);
    const freeAccess = resource.access === "free";
    if (!freeAccess && !active) throw new Error("An active subscription is required to access this resource file.");
    const storageId = args.fileKind === "guide" ? resource.guideStorageId
      : args.fileKind === "worksheet" ? resource.worksheetStorageId
      : args.fileKind === "image" ? resource.imageStorageId : resource.diagramStorageId;
    if (!storageId) throw new Error("This resource file has not been uploaded yet.");
    const token = crypto.randomUUID().replace(/-/g, "");
    const now = Date.now();
    await ctx.db.insert("teachingResourceDownloadTokens", {
      token, resourceId: args.resourceId, userEmail: email, fileKind: args.fileKind,
      expiresAt: now + 90_000, createdAt: now,
    });
    return { token, expiresInSeconds: 90 };
  },
});

export const consumeDownloadToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("teachingResourceDownloadTokens")
      .withIndex("by_token", q => q.eq("token", args.token)).first();
    if (!row || row.consumedAt || row.expiresAt <= Date.now()) return null;
    const resource = await ctx.db.get(row.resourceId);
    const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", row.userEmail)).first();
    if (!resource || resource.status !== "published" || !user) return null;
    const active = await hasActiveSubscriptionAccess(ctx, row.userEmail, user);
    if (resource.access !== "free" && !active) return null;
    const storageId = row.fileKind === "guide" ? resource.guideStorageId
      : row.fileKind === "worksheet" ? resource.worksheetStorageId
      : row.fileKind === "image" ? resource.imageStorageId : resource.diagramStorageId;
    if (!storageId) return null;
    await ctx.db.patch(row._id, { consumedAt: Date.now() });
    const contentType = row.fileKind === "guide" ? resource.guideContentType
      : row.fileKind === "worksheet" ? resource.worksheetContentType
      : row.fileKind === "image" ? resource.imageContentType : resource.diagramContentType;
    return { storageId, title: resource.title, fileKind: row.fileKind, contentType: contentType ?? "application/octet-stream" };
  },
});

export const teachingResourceDownload = httpAction(async (ctx, request) => {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{32}$/.test(token)) return new Response("Invalid or expired download link.", { status: 403 });
  const access = await ctx.runMutation(internal.teachingResources.consumeDownloadToken, { token });
  if (!access) return new Response("This download link has expired or access is no longer active.", { status: 403 });
  const blob = await ctx.storage.get(access.storageId);
  if (!blob) return new Response("Resource file not found.", { status: 404 });
  const ext = access.contentType === "image/png" ? "png" : access.contentType === "image/webp" ? "webp" : access.contentType === "image/jpeg" ? "jpg" : "pdf";
  const filename = `${access.title.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 70)}-${access.fileKind}.${ext}`;
  return new Response(blob, {
    headers: {
      "Content-Type": access.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
