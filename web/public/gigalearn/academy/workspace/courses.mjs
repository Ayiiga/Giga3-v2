export default [
  {
    id:'teaching', name:'Teaching', field:'CLASSROOM PRACTICE', icon:'book', color:'purple',
    summary:'Plan clear lessons, check understanding, and support every learner in a basic-school classroom.',
    lessons:[
      ['Plan around a learning outcome','An outcome describes what pupils can show by the end of the lesson. “Compare two fractions using a drawing” is easier to assess than “Understand fractions.”',['Choose one curriculum indicator and identify the skill pupils need.','Write an outcome with an observable verb and a success criterion.','Plan a short task that produces evidence of that outcome.'],'Draft a 30-minute lesson for one JHS topic. Ask a colleague to match your exit task to the outcome.','Backward design and curriculum alignment'],
      ['Model, guide and release','Show the thinking first, practise it together, then ask pupils to try independently. Fade support as their work shows they are ready.',['Demonstrate one example and explain each decision aloud.','Solve a similar example together and ask pupils to explain a step.','Assign an independent example and use responses to decide who needs another model.'],'Prepare a worked example, a guided example and one independent task for the same skill.','Scaffolding and inclusive instruction'],
      ['Use exit tickets to plan the next lesson','An exit ticket is a short check that gives you evidence while there is still time to respond.',['Ask a two-minute question tied directly to the outcome.','Group responses by secure understanding, partial understanding or a shared misconception.','Plan an extension, a guided practice task and a short reteach based on those groups.'],'Create three plausible pupil responses and write one specific piece of feedback for each.','Formative assessment and feedback']
    ],
    quiz:[
      ['Which outcome is easiest to assess?',['Know fractions','Compare two fractions using a drawing','Enjoy maths'],1,'Comparing with a drawing gives pupils an observable task.'],
      ['What comes immediately after modelling in gradual release?',['Guided practice','An unrelated assignment','Final grading'],0,'Guided practice lets pupils try the process with support.'],
      ['What should drive tomorrow’s reteach?',['The number of questions asked','The seating plan','A misconception found in exit tickets'],2,'A repeated misconception gives you a precise target for reteaching.'],
      ['Which feedback gives a learner a next step?',['Shade equal-sized parts before comparing','Try harder','Good work'],0,'The learner gets an action they can apply immediately.']
    ],
    material:['Basic-school lesson planning sheet','Planning template',['Write the curriculum indicator and observable outcome.','List the materials, model, guided task and independent task.','Draft an exit ticket and a response for each likely misconception.']]
  },
  {
    id:'ai', name:'Artificial Intelligence', field:'RESPONSIBLE AI', icon:'spark', color:'blue',
    summary:'Write better prompts, verify AI-generated answers, and build a responsible everyday workflow.',
    lessons:[
      ['Understand how generative AI answers','A generative model uses patterns learned from examples to produce plausible text. A fluent answer can still contain an error.',['Give a chatbot a simple question about a familiar topic.','Underline the claims that can be checked independently.','Compare two claims against a trusted reference and record any correction.'],'Generate a short explanation of evaporation and annotate every claim you verified.','Machine learning and information literacy'],
      ['Write a prompt with clear constraints','A prompt works better when it states the task, audience, constraints and expected format.',['State the goal and who will read the output.','Supply non-sensitive context, a length limit and a format.','Review the draft against your instructions and revise one constraint.'],'Draft a prompt for a five-question revision exercise and check whether every question matches the topic and level.','Prompt design and instructional design'],
      ['Protect information and verify before sharing','Use invented or anonymised examples when practising. Check quoted sources, names, figures and calculations before reusing output.',['Remove names and identifiers from the sample.','Ask the model to flag uncertainty and separate claims from suggestions.','Open and verify any cited sources, then take responsibility for the final edit.'],'Turn a fictional customer enquiry into a reply and add a short verification log.','Data privacy and media literacy']
    ],
    quiz:[
      ['What should you do with a plausible AI-generated fact?',['Verify it against a trusted source','Treat confident wording as proof','Publish it immediately'],0,'A model can generate plausible errors.'],
      ['Which prompt is most specific?',['Explain something','Explain evaporation to JHS 1 in 80 words with one local example','Write more'],1,'It supplies the topic, audience, length and example constraint.'],
      ['Which data is best for a practice prompt?',['Real pupil names and grades','Private customer records','Fictional examples'],2,'Fictional examples avoid exposing personal information.'],
      ['What should you do with a generated citation?',['Open it and check that it supports the claim','Assume it is correct if it looks formal','Delete the title only'],0,'A source must exist and support the claim.']
    ],
    material:['AI prompt and verification checklist','Checklist',['State your task, audience, constraints and format.','Remove personal data before sending the prompt.','Check claims, calculations and sources before sharing.']]
  },
  {
    id:'web', name:'Web and PWA Development', field:'WEB ENGINEERING', icon:'web', color:'indigo',
    summary:'Build a responsive website and add installation metadata and an offline fallback.',
    lessons:[
      ['Structure a page with semantic HTML','HTML describes what page elements mean. A heading names a section and a button performs an action.',['Create index.html with a title and viewport meta tag.','Add header, main and footer landmarks with a logical heading order.','Use a link for navigation and a labelled button for an action.'],'Build a school notice page and navigate its interactive elements with the keyboard.','Web accessibility and semantic HTML'],
      ['Make a layout fit small screens','A responsive layout adjusts to available space. Start with a single column, then add columns where content has room.',['Set a readable base font and use a flexible content width.','Limit images to their container width.','Add a wider-screen grid and test at 320px as well as desktop width.'],'Build a three-card notice grid that works without horizontal scrolling.','CSS Grid and responsive design'],
      ['Add a manifest and offline fallback','The manifest describes the app for supported installation experiences. A service worker can serve a cached fallback when a navigation fails offline.',['Link a web manifest with a name, icons, start URL and display mode.','On HTTPS or localhost, register a service worker that precaches an offline page.','Simulate offline mode, reload a page, and verify the fallback is reachable.'],'Add an offline notice to your school page and test a return to online mode.','Service worker caching and installability']
    ],
    quiz:[
      ['What should navigate to another page?',['A paragraph','A native link','An unlabelled icon'],1,'Links expose navigation semantics to browsers and assistive technology.'],
      ['Which rule helps prevent an image overflowing its column?',['max-width: 100%','width: 1400px','position: fixed'],0,'The maximum tracks the container width.'],
      ['Where should the app name and display preference go?',['In a CSS selector','In a database table','In the web manifest'],2,'The web manifest supplies app metadata.'],
      ['What can serve a cached offline fallback?',['A service worker','A heading','A colour palette'],0,'The service worker can intercept navigation and return a cached response.']
    ],
    material:['Responsive PWA release checklist','Checklist',['Test narrow widths, keyboard focus and readable headings.','Validate manifest fields and icon paths.','Test first load online, a later offline navigation and recovery online.']]
  },
  {
    id:'mobile', name:'Mobile Development', field:'APP DEVELOPMENT', icon:'phone', color:'pink',
    summary:'Design a focused mobile app flow, handle missing input, and test on a small screen.',
    lessons:[
      ['Sketch a small-screen user journey','A user journey links a person’s goal to the screens and actions needed to complete it.',['Choose one goal such as recording a homework task.','Sketch a list, an add screen and a confirmation state.','Trace what happens when the user goes back or cancels.'],'Ask a peer to follow your paper prototype without coaching and note where they hesitate.','Interaction design and usability testing'],
      ['Build and validate an input form','Validation gives users a clear path to fix incomplete or incorrect input. Keep the form state while they correct it.',['Label the title and due-date fields.','Reject a blank title and display an error beside the field.','Preserve the date and title while showing errors or retrying a save.'],'Build or prototype the form and test blank, valid and repeated submissions.','State management and form accessibility'],
      ['Test interruption and recovery','Phones can rotate, lose connectivity or background an app mid-task. Test what happens to the draft and navigation in each case.',['Enter a draft and rotate the device or change the viewport.','Simulate an interrupted save and confirm the draft survives.','Retry once and verify that only one record appears.'],'Write three expected outcomes and record pass or fail after testing on a device or emulator.','Mobile lifecycle and resilient local state']
    ],
    quiz:[
      ['What should a first prototype focus on?',['Every possible feature','One clear user goal','A full animation library'],1,'One goal makes the flow easier to build and test.'],
      ['What should a form do when the title is empty?',['Keep other values and identify the missing title','Clear all values','Return to the home screen'],0,'The user can fix the exact problem without re-entering other data.'],
      ['What should a retry after an interrupted save avoid?',['A readable message','Keyboard access','Creating duplicate records'],2,'Repeated saves should leave one intended record.'],
      ['Which test checks lifecycle resilience?',['Background the app while editing and resume','Change the app icon','Count the screens'],0,'Resuming after interruption reveals whether the draft survives.']
    ],
    material:['Mobile app usability test sheet','Test sheet',['Give a tester one goal without describing the screens.','Record errors, back actions and any lost input.','Repeat the main task after rotation and an interrupted save.']]
  },
  {
    id:'robotics', name:'Robotics', field:'INTELLIGENT SYSTEMS', icon:'robot', color:'teal',
    summary:'Explore sensors, actuators, and feedback through a simple simulated control project.',
    lessons:[
      ['Map inputs, decisions and outputs','A sensor reports information, a controller applies a rule, and an actuator acts on the result.',['Choose a simulated distance sensor and a status light.','Draw an arrow from sensor to controller and from controller to light.','Describe what the light should show for near and far readings.'],'Make an input–decision–output table using simulated readings of 10, 30 and 50 cm.','Sensors and embedded systems'],
      ['Turn a threshold into a program','A threshold divides readings into cases. Defining the exact boundary gives predictable results.',['Choose a threshold of 30 cm.','Write a rule that turns the simulated light on below 30 cm and off otherwise.','Test 29, 30 and 31 cm and compare each result with your prediction.'],'Create a three-row test table with reading, expected output and actual output.','Conditional logic and boundary testing'],
      ['Stabilise output with two thresholds','Readings close to a boundary can cause an output to flicker. Use different thresholds for turning on and turning off.',['Turn the light on below 25 cm and off above 35 cm.','Keep the previous state between the thresholds.','Replay a series of readings around 30 cm and compare with the single-threshold rule.'],'Explain how the output changes for 20, 29, 31 and 40 cm starting with the light off.','Feedback and hysteresis']
    ],
    quiz:[
      ['Which part reports distance?',['The sensor','The light','The enclosure'],0,'The distance sensor provides the input reading.'],
      ['For a rule that turns the light on below 30 cm, what happens at 30 cm?',['It stays on by definition','It turns off','The reading disappears'],1,'Exactly 30 does not satisfy “below 30.”'],
      ['What should a two-threshold rule do between its limits?',['Toggle every time','Ignore the next input forever','Keep the previous state'],2,'Keeping the previous state avoids frequent switching near the boundary.'],
      ['Which set tests both sides of a 30 cm boundary most directly?',['29, 30 and 31 cm','0, 5 and 10 cm','50, 60 and 70 cm'],0,'It includes the boundary and the nearest cases on either side.']
    ],
    material:['Sensor and actuator experiment sheet','Worksheet',['Label the sensor, controller and actuator.','Record predicted and actual outputs at each boundary.','Compare the number of output changes under one and two thresholds.']]
  },
  {
    id:'digital', name:'Digital Technology', field:'DIGITAL SKILLS', icon:'chip', color:'amber',
    summary:'Organise digital files, build a simple spreadsheet, and collaborate with the right permissions.',
    lessons:[
      ['Organise and back up your files','A good folder structure makes documents easy to find. A separate backup helps recover files if the original is lost.',['Create folders for drafts, final work and reference material.','Name documents with the topic, date and version.','Back up one sample folder and restore a copy to confirm it opens.'],'Organise five practice files and ask someone to find the latest version without your help.','File systems and version management'],
      ['Calculate totals in a spreadsheet','A formula reads values from cells and recalculates when inputs change.',['Create columns for item, quantity, unit price and amount.','Multiply quantity by unit price for each row, then sum the amount column.','Change one quantity and verify the row amount and total update.'],'Create a three-item budget in Ghana cedis and compare the spreadsheet total with a manual calculation.','Spreadsheet formulas and digital record keeping'],
      ['Share files with appropriate permissions','View access lets someone read a document. Edit access allows them to change its contents.',['Use a sample document with no personal data.','Share it as view-only with someone who needs to read it.','Review who has access and remove access when the task ends.'],'Write a permission plan for a class notice and a shared planning document.','Online collaboration and access management']
    ],
    quiz:[
      ['Which filename best identifies a current draft?',['newfinalfinal','science-budget-2026-11-v2','Document1'],1,'The topic, date and version make the file recognisable.'],
      ['What should calculate quantity times unit price?',['A spreadsheet formula','A typed result that never changes','A filename'],0,'The formula updates as the input values change.'],
      ['What access suits someone who only needs to read a notice?',['Owner','Editor','Viewer'],2,'Viewer provides the needed access without allowing edits.'],
      ['How can you verify a backup works?',['Restore and open a sample file','Rename the backup folder','Check the folder colour'],0,'A successful restore confirms that the sample is usable.']
    ],
    material:['Digital workspace starter worksheet','Worksheet',['Create Drafts, Final and Reference folders and add versioned filenames.','Build a three-row budget with calculated amounts and a total.','List who needs view or edit access to each example file.']]
  }
];
