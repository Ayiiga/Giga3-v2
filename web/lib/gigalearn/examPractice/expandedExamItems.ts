import type { TechBankQuestion } from "../academy/techBanks/techBankTypes";

type Item = [strand: string, topic: string, stem: string, answer: string, b: string, c: string, d: string, explanation: string];

const bece: Record<string, [string, Item[]]> = {
  english: ["English", [
    ["Grammar Usage", "Tense", "By the time we reached the hall, the programme ___ already begun.", "had", "has", "will have", "would have", "The programme began before another past event, so the past perfect is appropriate."],
    ["Grammar Usage", "Pronouns", "Choose the correct form. ‘The prefect gave the books to Abena and ___.’", "me", "I", "my", "myself", "The pronoun is the object of the preposition to and takes the object form me."],
    ["Reading", "Reference words", "‘The volunteers repaired the desks before they returned home.’ Who returned home?", "The volunteers", "The desk owners", "The learners", "The repair customers", "They refers to the volunteers, who performed both actions."],
    ["Reading", "Main idea", "Kwesi used to leave his homework until Sunday. Now he does a little each evening and has time to check his answers. What is the main idea?", "Spreading work across the week helps Kwesi check it.", "Kwesi prefers to do all his homework on Sunday.", "Checking answers takes most of Kwesi’s time.", "Kwesi has been given less homework this week.", "The passage contrasts a last-minute habit with regular work and explains its benefit."],
    ["Vocabulary", "Word meaning in context", "‘The caretaker secured the loose gate before the wind grew stronger.’ What does secured mean here?", "Fastened", "Borrowed", "Painted", "Measured", "Fastened fits the context of making a loose gate safe before stronger wind."],
    ["Writing", "Linking ideas", "Choose the best connector. ‘The road was flooded. ___, the school bus took a different route.’", "Therefore", "Nevertheless", "Meanwhile", "Similarly", "The second sentence gives a consequence of the first."],
    ["Writing", "Formal language", "Which closing is most appropriate for a formal request to repair a classroom window?", "I would be grateful if you could consider this request.", "Let me know when you get around to it.", "I hope you understand how annoying this has been.", "You can give me a shout when it’s sorted.", "The first choice uses a respectful formal register."],
    ["Grammar Usage", "Reported speech", "Ama said, ‘I have finished my work.’ Which sentence reports her words in the past?", "Ama said that she had finished her work.", "Ama said that I have finished my work.", "Ama said that she will finish her work.", "Ama said that she was finishing my work.", "The pronouns shift to she and her, and the present perfect shifts to the past perfect."],
    ["Reading", "Inference", "Naa returned to the library carrying an umbrella although the sky was clear. She said, ‘The weather fooled me yesterday.’ What can we infer?", "She is prepared for unexpected rain.", "She forgot her umbrella yesterday at the library.", "She expects the library to close early.", "She wants to lend the umbrella to a librarian.", "Her comment connects yesterday’s surprise with taking a precaution today."],
    ["Grammar Usage", "Concord", "Which verb completes this sentence? ‘The box of donated books ___ ready for collection.’", "is", "are", "were", "have been", "The subject is the singular noun box. The plural noun books is part of a modifying phrase."],
  ]],
  mathematics: ["Mathematics", [
    ["Number", "Percentages", "A GH₵240 school bag is reduced by 15%. What is the sale price?", "GH₵204", "GH₵216", "GH₵225", "GH₵276", "The discount is 0.15 × 240 = 36. Subtract 36 from 240."],
    ["Geometry and Measurement", "Area", "A rectangular garden is 12 m long and 8 m wide. A path 1 m wide runs along the inside of all four sides. What is the area available for planting?", "60 m²", "77 m²", "36 m²", "80 m²", "Both dimensions lose 2 m. The planted area is 10 × 6 = 60 m²."],
  ]],
  "integrated-science": ["Integrated Science", [
    ["Diversity of Matter", "Materials", "A learner has iron filings mixed with dry sand. Which method most directly separates the filings without adding water?", "Pass a magnet over the mixture.", "Pass the mixture through filter paper.", "Heat the mixture until the sand evaporates.", "Allow the dry mixture to settle in a jar.", "Iron filings are attracted to a magnet, while ordinary sand is not."],
    ["Forces and Energy", "Electricity and Electronics", "A torch works with one cell but fails when a second identical cell is connected in series facing the opposite way. Why?", "The cells oppose each other’s potential differences.", "The second cell doubles the potential difference.", "The cells are connected in parallel.", "The second cell doubles the lamp’s resistance.", "Identical series cells connected in opposite directions produce approximately zero net potential difference."],
  ]],
  "social-studies": ["Social Studies", [
    ["Environment", "Environmental management", "A community’s drain floods after residents dump plastic waste into it. Which action directly addresses the cause?", "Provide regular waste collection and clear the blocked drain.", "Raise shop shelves without clearing the drain.", "Build a wall that diverts water into a neighbouring street.", "Move the market stalls closer to the drain.", "Waste collection reduces future dumping and clearing the blockage restores the flow of water."],
    ["Law and Order", "Responsible citizenship", "Residents believe a broken public streetlight creates danger. Which action best demonstrates responsible citizenship?", "Report it through the assembly’s service channel and follow up.", "Disconnect nearby lights to draw attention to the fault.", "Collect compulsory fines without authority to replace it.", "Accuse a neighbour publicly without evidence.", "Reporting the fault through an appropriate channel is constructive and lawful."],
  ]],
  rme: ["RME", [
    ["Ethics and Moral Life", "Responsibility", "A learner accidentally damages a borrowed book. Which action best shows responsibility?", "Explain what happened and agree how to repair or replace it.", "Return it quietly and wait for someone to notice.", "Ask the lender to replace it without giving a reason.", "Offer to replace it only if no one else knows.", "Taking responsibility means acknowledging the damage and helping put it right."],
    ["Ethics and Moral Life", "Fairness", "A group has one set of tools and four learners who need practice. Which plan is fairest?", "Agree on turns that give everyone enough time to practise.", "Give most turns to the learner who works fastest.", "Give longer turns to those who already own tools.", "Let the first two learners decide whether anyone else can practise.", "Fair access gives each learner enough time to take part."],
    ["Ethics and Moral Life", "Honesty", "A class treasurer receives GH₵5 more than the contribution due. Which response best demonstrates honesty?", "Return the excess and record the correct contribution.", "Keep the excess and record the correct contribution.", "Add the excess to the class fund without telling the payer.", "Record the excess as a donation without asking.", "Returning the money and keeping an accurate record respects both the payer and the class."],
    ["Ethics and Moral Life", "Tolerance", "Two classmates observe different religious festivals. What is a respectful response when planning a group meeting?", "Ask about their availability and agree on a time both can attend.", "Assume they both follow the same calendar.", "Ask the minority learner to keep their observance private.", "Exclude whichever learner cannot attend the first proposed time.", "Respectful planning considers each learner’s commitments and supports participation."],
  ]],
  computing: ["Computing", [
    ["Computational Thinking", "Algorithms", "A student wants a robot to water three pots. It must move to each pot before watering it. Which sequence meets the requirement?", "Repeat three times: move to the next pot, then water it.", "Move three times, then water the final pot three times.", "Water three times, then move to the next pot.", "Move to one pot and repeat the watering instruction three times.", "Putting both actions inside the loop makes the robot water each pot once."],
    ["Digital Literacy", "Spreadsheets", "Cells B2, B3 and B4 contain weekly sales. Which formula adds all three cells and updates when any value changes?", "=SUM(B2:B4)", "=SUM(B2,B4)", "=AVERAGE(B2:B4)", "=COUNT(B2:B4)", "SUM over B2:B4 includes each cell in the range and recalculates when the cells change."],
  ]],
  "career-technology": ["Career Technology", [
    ["Tools, Equipment and Processes", "Measuring and marking", "A learner needs a cutting line at a right angle to the long edge of a wooden strip. Which tool is most suitable for marking it?", "Try square", "Tape measure", "Spirit level", "Sliding bevel set to 45 degrees", "A try square gives a fixed 90-degree reference against the edge."],
    ["Designing and Making", "Evaluating a product", "A phone stand tips backwards when a phone is placed on it. Which change most directly improves stability?", "Extend the base in the direction it tips.", "Make the back support taller with the same base.", "Replace the base with a narrower strip.", "Move the phone farther back without extending the base.", "A larger base in the direction of tipping makes it easier for the combined centre of mass to remain above the base."],
  ]],
  "creative-arts": ["Creative Arts and Design", [
    ["Design", "Visual emphasis", "A poster has a title, date and venue. Which change best makes the title the focal point?", "Use a larger, bolder title than the date and venue.", "Give every line the same size and weight.", "Reduce the title to the smallest text on the poster.", "Set the date in larger type than the title.", "Size and weight help direct the viewer’s eye to the title."],
    ["Performing Arts", "Drama", "During a rehearsal, an actor forgets a line and the scene must continue. Which action uses improvisation?", "Respond in character using words that fit the scene.", "Repeat the previous scene from the beginning.", "Stop the performance and explain the script to the audience.", "Read the stage directions aloud instead of continuing the scene.", "Improvisation creates a suitable response in the moment while preserving the scene."],
    ["Design", "Contrast", "A school poster uses light yellow letters on white paper. Which change makes the message easier to read from across the room?", "Use dark blue letters on the white background.", "Use pale green letters on the white background.", "Use a lighter shade of yellow for the letters.", "Use pale yellow paper behind the yellow letters.", "A strong light–dark difference between text and background improves legibility."],
    ["Performing Arts", "Tempo and dynamics", "A choir sings the same notes and words more quickly at the conductor’s signal. Which musical feature has changed?", "Tempo", "Pitch", "Dynamics", "Timbre", "Tempo is the speed of the music. Dynamics describe loudness."],
  ]],
  french: ["French", [
    ["Communication", "Directions", "Complétez la phrase : « Pour aller à la pharmacie, tournez ___ gauche après le marché. »", "à", "en", "sur", "de", "L’expression pour indiquer la direction est « tourner à gauche »."],
    ["Communication", "Reading notices", "Une affiche dit : « La bibliothèque est fermée le lundi. » Quel jour ne peut-on pas entrer à la bibliothèque ?", "Le lundi.", "Le mardi.", "Le jeudi.", "Le samedi.", "L’affiche indique explicitement que la bibliothèque est fermée le lundi."],
  ]],
  "ghanaian-language-culture": ["Asante Twi", [
    ["Oral Language", "Greetings", "Wohunu wo kyerɛkyerɛfo anɔpa. Dɛn na wobɛka de akyea no?", "Maakye.", "Maadwo.", "Da yie.", "Nante yie.", "Maakye yɛ anɔpa nkyia. Maadwo yɛ anwummere nkyia."],
    ["Oral Language", "Courtesy", "Wo yɔnko de nwoma ama wo. Dɛn na wobɛka de ada no ase?", "Medaase.", "Mepa wo kyɛw.", "Maakye.", "Akwaaba.", "Medaase na yɛde da obi ase wɔ adeɛ a ɔde ama yɛn ho."],
  ]],
};

const wassce: Record<string, [string, Item[]]> = {
  "wassce-english": ["English Language", [
    ["Lexis and Structure", "Register", "Choose the most appropriate opening for a formal letter to a district education director requesting replacement classroom furniture.", "I am writing to request replacement furniture for our classroom.", "I just wanted to ask you for a few chairs, if that’s cool.", "The desks are terrible, and everyone already knows.", "Guess what happened to our classroom chairs last term.", "The first opening states the purpose directly in a formal register."],
    ["Comprehension", "Contrast", "Although the clinic extended its opening hours, attendance remained low because evening buses stopped running. What prevented the change from achieving its aim?", "Transport was unavailable when patients needed it.", "The clinic reduced the number of hours it opened.", "Patients preferred to travel by evening bus.", "The clinic moved farther away from the bus route.", "The sentence identifies the lack of evening buses as the obstacle."],
  ]],
  "wassce-core-mathematics": ["Core Mathematics", [
    ["Geometry and Mensuration", "Bearings", "From P, Q is on a bearing of 065°. What is the bearing of P from Q?", "245°", "115°", "295°", "065°", "A reverse bearing differs by 180°. Add 180° to 065°."],
    ["Statistics and Probability", "Weighted mean", "A class has 12 learners averaging 65 marks and 18 learners averaging 75 marks. What is the overall mean?", "71", "70", "69", "72", "The total is 12 × 65 + 18 × 75 = 2130. Dividing by 30 gives 71."],
    ["Algebra", "Direct variation", "The mass of flour varies directly with the number of loaves. If 4.5 kg makes 15 loaves, how much flour is needed for 24 loaves?", "7.2 kg", "6.9 kg", "2.8125 kg", "9.0 kg", "Each loaf requires 4.5 ÷ 15 = 0.3 kg. Multiply by 24."],
    ["Number", "Standard form", "Express the product of 3.2 × 10⁴ and 2.5 × 10⁻³ in standard form.", "8.0 × 10¹", "8.0 × 10⁷", "8.0 × 10⁻¹", "8.0 × 10⁻⁷", "Multiply the coefficients and add the powers: 3.2 × 2.5 = 8.0 and 4 + (−3) = 1."],
  ]],
  "wassce-integrated-science": ["Integrated Science", [
    ["Physics", "Electrical circuits", "A 6 Ω and a 3 Ω resistor are connected in parallel across a 6 V supply. What total current is drawn?", "3 A", "2 A", "1 A", "2/3 A", "Each branch has 6 V. The branch currents are 1 A and 2 A, which add to 3 A."],
    ["Biology", "Experimental design", "A student tests how temperature affects enzyme activity by measuring the time needed to break down starch. What must stay constant across trials?", "The amounts of enzyme and starch and the pH.", "The temperature and the time measured.", "The amount of starch and the temperature.", "The amount of enzyme and the time measured.", "Temperature is varied and time is measured. The quantities and pH must be controlled."],
  ]],
  "wassce-social-studies": ["Social Studies", [
    ["Governance, Politics and Stability", "Conflict resolution", "Two communities dispute access to a borehole during the dry season. Which step best supports a lasting agreement?", "Have both communities identify their needs and agree on enforceable usage rules.", "Give control to whichever community reaches the borehole first.", "Publish the dispute online and let comments determine access.", "Suspend access until one community withdraws its claim.", "Jointly agreed rules address the communities’ needs and provide a basis for resolving later disputes."],
    ["Social and Economic Development", "Human resource development", "A district offers vocational training, but most graduates cannot access tools or apprenticeships. Which measure best addresses this gap?", "Partner with local businesses to offer supervised placements and shared tools.", "Increase lecture hours while keeping the same practical facilities.", "Replace placements with written tests on entrepreneurship.", "Buy equipment for offices that do not run training workshops.", "Placements and tool access let graduates practise and apply what they learned."],
  ]],
};

export const expandedExamItems: TechBankQuestion[] = ([["bece", bece], ["wassce", wassce]] as const).flatMap(([exam, subjects]) =>
  Object.entries(subjects).flatMap(([topicId, [topicLabel, questions]]) =>
    questions.map(([strand, subStrand, questionText, answer, b, c, d, explanation], index) => ({
      questionId: `exam-${exam === "bece" ? "bece-" + topicId : topicId}-curriculum-v2-${index + 1}`,
      courseSlug: exam === "bece" ? "exam-bece-prep" : `exam-${topicId}`,
      topicId, topicLabel, questionText, options: [answer, b, c, d], correctIndex: 0,
      explanation, difficulty: "intermediate", questionType: "mcq",
      sourceDocument: "Original GigaLearn curriculum-informed practice",
      sourceQuestionNumber: index + 1, reviewStatus: "pending_review",
      tags: [strand, subStrand], curriculumStrand: strand, curriculumSubStrand: subStrand,
    })),
  ),
);
