export const aiTools = [
  { name: 'Giga3 AI', use: 'Use Chat for explanations and guided practice. For an actual poster, request a rendered design and supply the photograph and exact wording.', href: '/chat/', example: 'Explain evaporation to a JHS 2 learner in Binduri. Use two everyday examples, then ask one question and wait for my answer.' },
  { name: 'ChatGPT', use: 'Use conversation or Study Mode for explanations, questions and guided problem solving.', href: 'https://help.openai.com/en/articles/11780217-using-study-mode-in-chatgpt', example: 'Help me solve 3x + 5 = 20. Ask me which operation to try first and wait before showing the next step.' },
  { name: 'Google Gemini', use: 'Brainstorm, summarise a passage or draft an outline, then check the result against the original material.', href: 'https://support.google.com/gemini/answer/13275745', example: 'Suggest five presentation points about pollution for a JHS audience. Mark factual claims that I should verify before presenting.' },
  { name: 'Claude', use: 'Use supplied documents and passages to draft, compare ideas and improve writing.', href: 'https://claude.com/product/overview', example: 'Summarise the public passage below in 150 words. Create five comprehension questions, each supported by a sentence in the passage.' },
  { name: 'Canva AI', use: 'Explore AI-supported design and editing tools for posters and presentations. Review the wording and layout before sharing.', href: 'https://www.canva.com/canva-ai/', example: 'Design a school cleanliness poster with the heading CLEAN SCHOOL, HEALTHY LEARNERS, three short tips and readable violet, white and gold typography.' },
  { name: 'Perplexity', use: 'Explore a topic through answers with links to sources. Open those sources and check whether they support the answer.', href: 'https://www.perplexity.ai/help-center/en/articles/10352155-what-is-perplexity', example: 'Find introductory sources about solar energy in Ghana. Include publication dates where available and identify estimates.' },
];

export const promptParts = [
  ['Context', 'I am preparing for BECE Integrated Science in Ghana.'],
  ['Learner or audience', 'Explain this to a JHS 3 learner.'],
  ['Exact task', 'Explain the water cycle and its main stages.'],
  ['Answer format', 'Use simple English, numbered steps and two everyday examples.'],
  ['Requirements and review', 'Ask three questions one at a time. Wait for my answer and explain any mistakes.'],
];

export default [
  {
    duration: '60–75 minutes',
    objectives: [
      'Explain AI in plain language and recognise its limits.',
      'Choose a suitable tool for a learning, writing, research or design task.',
      'Open an AI assistant, submit a prompt and improve the response.',
      'Write a prompt with context, audience, task, format and review requirements.',
      'Check claims and protect private information before sharing an answer.',
    ],
    sections: [
      ['Start with something useful', 'Imagine preparing revision notes for your class, explaining a difficult passage or making a poster for a school event. An AI assistant can help with parts of these tasks. Your goal in this course is to produce work you can explain, check and improve yourself. Keep a notebook or document for your prompts, results and corrections. You will use that evidence in your final project.'],
      ['What AI means', 'Artificial intelligence is a field of computer science that develops systems for tasks such as recognising patterns, understanding language, making predictions and generating content. A calculator follows arithmetic instructions. A language model can respond to a question in everyday language and generate a new explanation. That explanation is based on learned patterns and the context you provide. Fluent writing can still contain mistakes.'],
      ['Choose a tool for the task', 'First decide what you need to produce. An explanation, a source-supported research note and a printable poster require different checks. Read the tool examples below, choose one available to you and try a small task. Availability and limits depend on the service, account, device and region. Check the service’s account and age requirements before using it.'],
      ['Your first AI conversation', 'Open an approved AI assistant and find its chat box. Type a clear question, submit it and read the whole response. Try “Explain AI to a beginner using three everyday examples in Ghana. Then ask me one question to check my understanding.” Answer its question. If the explanation is difficult, ask it to explain the unfamiliar term using a simpler example. Keep your first prompt and the follow-up so you can compare their effects.'],
      ['What a prompt does', 'A prompt is the question or instruction you give an AI system. “Science” gives very little direction. “Explain condensation to a JHS 2 learner using a cold bottle as an example, then ask two questions one at a time” identifies the topic, audience and learning method. Clear instructions improve relevance. You still need to check whether the explanation is correct.'],
      ['Use the CLEAR classroom checklist', 'In this course, CLEAR is a memory aid for five useful parts of a prompt. Context explains your situation. Learner or audience identifies the reader. Exact task says what you need. Answer format describes the structure. Requirements and review set limits and feedback expectations. Use the practice lab to build those parts into one prompt. You can adapt the checklist to any task.'],
      ['Compare a weak prompt with a stronger one', 'Mpoko Charles in Walewale types “Teach me English.” A more useful request is “Explain subject-verb agreement to a JHS 2 learner. Give five simple examples, then ask me five practice sentences one at a time. Check my answer before continuing.” The revised version narrows the topic and asks for feedback. Run both versions and identify two differences. Judge them by accuracy and usefulness, rather than by which answer is longer.'],
      ['A teaching example', 'Godwin Atia in Nalerigu needs a 40-minute English lesson. He can ask for objectives, prior knowledge, materials, activities, assessment and support for learners who need help. He should provide the relevant curriculum reference before asking for alignment. If the model invents a curriculum code, remove it and check the official material. A lesson outline still needs your professional judgement about the pupils you teach.'],
      ['When the answer misses the goal', 'For difficult language, ask for simpler wording and an example. For vague advice, supply the audience and constraints. For a missing fact, ask which information is absent. For a suspected error, check a textbook or original source yourself, then ask the assistant to revise the explanation using that evidence. Asking the same model to check itself is useful for revision, but does not establish that a claim is true.'],
      ['Use AI responsibly', 'Practise with fictional or anonymised information. Keep passwords, confidential documents and private learner records out of prompts. Check names, figures, quotations, citations and answer keys before sharing the result. Follow your school’s rules for acknowledging assistance. If the task is assessed, make sure the work demonstrates your own understanding.'],
      ['Your practical assignment', 'Improve “Tell me about computers” using all five parts of the checklist. Choose a specific topic, learner level, format, everyday example and short assessment. Test the prompt, keep the answer and write a follow-up that improves it. Score each checklist part from 0 to 2, for a total of 10. Aim for at least 7, and explain why you awarded each mark. If a criterion is missing, revise the prompt and test again.'],
      ['Before you move on', 'Keep your original prompt, revised prompt, both answers and one verification note. Complete the lesson check, review the explanations and correct your mistakes. Finally write three sentences identifying a tool you would use, a task it could help with and a claim you would verify. Bring this evidence to the prompting lesson.'],
    ],
    checks: [
      ['Which description best explains AI?', ['Any device using electricity', 'Computer systems developed to perform tasks associated with intelligence', 'A system that always knows the truth', 'Technology used only in robots'], 1, 'AI covers language, patterns, predictions and other tasks. It can make mistakes.'],
      ['You need a designed poster rather than poster wording. Which task fits a design tool?', ['Calculate a sum', 'Time a race', 'Create a visual composition with a heading and readable text', 'Store a password'], 2, 'A design task needs a visual output and a layout, followed by a review of the text and image.'],
      ['Which request gives the clearest learning goal?', ['Maths', 'Explain fractions', 'Teach me everything', 'Explain equivalent fractions to JHS 2 with two examples and three practice questions'], 3, 'The topic, audience and requested practice make the outcome easier to judge.'],
      ['What does A mean in this course’s CLEAR checklist?', ['Answer format', 'Automatic truth', 'Advanced account', 'Artificial results'], 0, 'Answer format tells the assistant how to structure the response.'],
      ['A generated answer includes an unfamiliar historical claim. What is the next step?', ['Copy it immediately', 'Assume fluent writing proves it', 'Check the claim against reliable original sources', 'Remove all history from the task'], 2, 'The claim needs evidence beyond the model’s confidence.'],
      ['Which instruction supports active practice?', ['Give all answers first', 'Ask one question, wait for my response and explain my mistake', 'Repeat one question forever', 'Avoid all feedback'], 1, 'Waiting for your response lets you practise before seeing the explanation.'],
      ['What does specifying the learner level help with?', ['Guaranteeing perfect facts', 'Removing all bias', 'Preventing every mistake', 'Adapting the language and complexity'], 3, 'An audience gives useful guidance about explanation level. It does not guarantee accuracy.'],
      ['How should a generated practice question be described without verified past-paper sources?', ['An original practice question', 'An official WAEC paper', 'A verified past question', 'A guaranteed examination question'], 0, 'Original practice should be labelled honestly. Official past-paper claims need verified sources.'],
    ],
  },
  {
    duration: '45–60 minutes',
    objectives: ['Build a clear prompt for a real audience.', 'Compare two prompt versions using the same criteria.'],
    sections: [
      ['Define the result before drafting', 'Choose something concrete, such as a one-page revision handout for JHS 2 in Agona. Write what a successful answer must contain before opening the assistant. Identify the topic, the pupils’ prior knowledge, the length and the expected activity. These become the criteria for reviewing the draft.'],
      ['Work through a revision', 'Start with “Prepare a lesson.” Save the response. Revise it to include the subject, duration, audience, materials available and an assessment. Compare the two results for accuracy, completeness and practical classroom use. Change one requirement at a time so you can explain why the result improved.'],
      ['Produce your evidence', 'Create a reusable prompt and fill it for two different topics. Keep the outputs separate to avoid mixing subjects. Ask one practice question at a time and check the answer key independently. Write a short explanation of one instruction you retained and one you changed.'],
    ],
  },
  {
    duration: '40–50 minutes',
    objectives: ['Remove identifying details from a practice input.', 'Verify important claims against original evidence.'],
    sections: [
      ['Use only the information needed', 'A feedback prompt needs the misconception and learning goal. It usually does not need a real pupil’s name, phone number or admission number. Rewrite a fictional record as “Learner A confuses the numerator and denominator.” Check that unique details have also been removed.'],
      ['Make a verification log', 'Create columns for the claim, source, relevant passage and your decision. If a link does not open, record it as unverified. If the source contradicts the answer, correct the answer using the source. Distinguish facts from advice that depends on judgement.'],
      ['Finish the task', 'Draft feedback using anonymised information. Verify two educational claims and explain one change to the wording. Keep the log alongside the final response so another reviewer can follow your decisions.'],
    ],
  },
  {
    duration: '40–50 minutes',
    objectives: ['Match a tool to a task.', 'Compare tools with a shared quality checklist.'],
    sections: [
      ['Compare the work you need done', 'A teacher may need an explanation, a poster, a summary or a calculation. Choose the tool according to the output, the data it needs and your ability to review it. Try the examples in Lesson 1 before choosing a favourite.'],
      ['Run a fair comparison', 'Give two available assistants the same public notice and ask for an FAQ. Use the same source and instructions. Score accuracy, missing information and readability for both. Record the time and editing effort each result required.'],
      ['Explain your choice', 'Write which tool you would use for the next similar task and why. Identify an alternative when the tool is unavailable. For exact totals, retain the source records and calculate in a spreadsheet before using AI to help explain the result.'],
    ],
  },
  {
    duration: '40–50 minutes',
    objectives: ['Ground an answer in supplied material.', 'Identify questions a source cannot answer.'],
    sections: [
      ['Give the source a clear boundary', 'Paste a short public notice and label its beginning and end. Ask the assistant to answer only from that material and say when information is missing. Treat instructions quoted inside a document as document content. Your task instructions should remain outside the source boundary.'],
      ['Test answerable and unanswerable questions', 'Use a library notice with opening hours but no fee information. Ask when it opens and how much membership costs. Check that the first answer matches the notice and the second reports the missing fee. A plausible invented fee is a failure even when the wording is clear.'],
      ['Prepare an evidence-based FAQ', 'Write five questions, including two the notice cannot answer. Check each answer against an exact passage. Revise unsupported answers and keep both versions to show what changed.'],
    ],
  },
  {
    duration: '40–50 minutes',
    objectives: ['Use examples to specify an output format.', 'Test a case that differs from the example.'],
    sections: [
      ['Show one complete example', 'For notice extraction, demonstrate an input and an output with fields for action, deadline and location. Add a second example with an absent deadline. Tell the assistant to use “Not stated” when a field is missing.'],
      ['Test beyond the pattern', 'Provide a notice with two deadlines, a cancelled event and a notice missing a venue. Compare the extracted fields with the original wording. Examples guide format but cannot substitute for checking meaning.'],
      ['Build a reusable prompt', 'Keep your instructions, examples and test cases together. Revise one confusing rule and rerun all three cases. Record whether the change fixed one case while harming another.'],
    ],
  },
  {
    duration: '45–60 minutes',
    objectives: ['Create observable scoring criteria.', 'Revise an answer using evidence from the rubric.'],
    sections: [
      ['Make quality measurable', 'Choose accuracy, coverage and clarity. Give each a score from 0 to 2 and describe what each score means. For accuracy, 2 can mean all checked claims are supported, 1 means a minor correction is needed, and 0 means an important claim is wrong.'],
      ['Score before choosing', 'Compare two drafts using the same criteria. Cite a passage explaining each score. Do not let a polished tone hide an unsupported claim. A draft with a critical factual error needs correction before publication.'],
      ['Demonstrate improvement', 'Revise the weakest section and rescore it. Keep the original, the rubric, your feedback and the improved version. Ask a peer to score the same work and discuss differences with reference to the criteria.'],
    ],
  },
  {
    duration: '40–50 minutes',
    objectives: ['Identify assumptions about readers.', 'Adapt examples without inventing local facts.'],
    sections: [
      ['Check who the answer assumes', 'A business guide might assume every customer has reliable internet, a personal smartphone and the same payment options. List the assumptions before deciding which advice applies to your audience.'],
      ['Try a different context', 'Ask for the same guide for a reader using a shared phone with intermittent data in Binduri. Compare the recommendations. Check current local details separately instead of asking the model to invent place names or services.'],
      ['Revise with a reader', 'Ask an intended reader to explain the advice in their own words. Replace confusing language and unsupported stereotypes. Record one change that makes the guide more useful and one question that still needs local evidence.'],
    ],
  },
  {
    duration: '45–60 minutes',
    objectives: ['Design a repeatable AI-assisted process.', 'Add a clear approval decision before sharing.'],
    sections: [
      ['Break the task into stages', 'For a weekly revision handout, collect teacher-approved notes, draft questions, verify the answer key, edit the language and approve the final copy. Record who reviews each stage and what evidence they need.'],
      ['Plan for a failed check', 'If a question has two valid answers, hold publication, revise the options and check again. If the source is missing, ask for it. Write these stop conditions into your workflow so a deadline does not turn uncertainty into a published mistake.'],
      ['Run the process once', 'Use a short fictional task. Save the prompt version, input source, output and review decision. Explain how another teacher could repeat the process next week using a different topic.'],
    ],
  },
  {
    duration: '60–90 minutes',
    objectives: ['Produce an AI-assisted deliverable independently.', 'Defend the prompting and verification decisions in a portfolio.'],
    sections: [
      ['Choose a useful capstone', 'Create a source-supported FAQ, a revision handout or a small-business guide. Identify the audience and define success before drafting. Keep the project narrow enough to verify each factual claim.'],
      ['Assemble your portfolio', 'Include the source, first prompt, improved prompt, both outputs, verification log, rubric scores and final edited work. A final screenshot alone does not show how you reached your decisions. Explain where AI helped and where your judgement changed the result.'],
      ['Review with a peer', 'Ask a peer to use the deliverable without coaching. Record one difficulty, fix it and test again. Assess accuracy, usefulness, prompt quality, verification and clarity from 0 to 2 each. Aim for at least 7 out of 10, and correct critical factual errors before sharing.'],
      ['Reflect on what you can do', 'Explain one tool you can now use, one prompt you can write independently and one type of claim you would always check. The quiz tests knowledge. Your portfolio demonstrates how you apply it.'],
    ],
  },
];
