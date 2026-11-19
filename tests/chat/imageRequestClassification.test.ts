import { describe, expect, it } from 'vitest';
import { classifyRequestKind } from '../../convex/providerRouter';
import { shouldDeductCreditsForChatRequestKind } from '../../convex/creditsConfig';
import { isChatImageUploadForMessage, missingChatImageReferenceMessage, isImageDeliveryFollowup, resolveChatImagePrompt, resolveChatImageSourceUrl } from '../../convex/chatImageSource';

const history = [{ role: 'assistant', content: 'Here is your generated image:\n\nhttps://example.com/old-cat.png' }];
const commentary = [
  'Give me feedback on this poster',
  'Write an AI prompt to create a poster',
  'Draft a highly detailed AI prompt for an image of a school',
  'Create an AI prompt to render a text logo',
  'Generate flyer copy for a school open day',
  'Create a prompt without an image',
  'Give a critique of this logo',
  'Please provide a review of my banner',
  'Can you analyse this image?',
  'Show me how to insert an image in HTML',
  'Please show me how to create a poster in Canva',
  'Teach me how to edit this photo',
  'How do I remove the background from this image?',
  'Where is the image stored in this project?',
  'Where is my image saved on Android?',
  'Tell me where to find the picture settings',
  'Write text for a missing person poster',
  'Give me a prompt for an image of a classroom',
  'Explain this image of a classroom',
];
describe('image request classification and source boundaries', () => {
  it.each(commentary)('keeps commentary and instruction credit-free: %s', query => {
    for (const mode of ['general','social']) {
      for (const options of [{}, {hasImageAttachment:true}, {hasEditableImageSource:true}]) {
        const kind=classifyRequestKind(query,mode,options);
        expect(kind).toBe('text_chat');
        expect(shouldDeductCreditsForChatRequestKind(kind)).toBe(false);
      }
    }
    expect(isImageDeliveryFollowup(query)).toBe(false);
  });
  it.each([
    'Create a poster for our school open day',
    'Create a text logo for my bakery',
    'Create an original poster for our school',
    'Create a poster without text',
    'Generate an image without captions',
    'Create a poster, not text',
    'Create a poster excluding captions',
    'Create a poster and add the text Open day',
    'Generate an image then include captions',
    'Create a logo for my photo studio',
    'Create a source image for my robotics presentation',
    'Create a copy of this image with a blue background',
    'Create a clean copy of a bright image with a blue background',
    'Give me a text-based banner for my bakery',
    'Create a poster titled Write text for a school project',
    'Please give me a bright and clear image banner',
    'Create a poster explaining how to wash your hands',
    'Create a poster to teach how to wash your hands',
    'Create an image of a teacher showing learners how to plant maize',
    'I am waiting for the poster',
    'Where is my image?',
    "Where's my image?",
    'Show me the actual poster',
    'I want the actual image instead of text',
  ])('preserves explicit generation and delivery requests: %s', query => {
    expect(classifyRequestKind(query,'general')).toBe('image_generation');
    expect(classifyRequestKind(query,'general',true)).toBe('image_generation');
  });
  it('uses a current upload for a new poster, but never an unrelated historical image', () => {
    const query='Create a poster for our school open day';
    expect(resolveChatImageSourceUrl({query,history,imageAttachments:[]})).toBeUndefined();
    expect(resolveChatImageSourceUrl({query,history,imageAttachments:[{dataUrl:'https://example.com/current-photo.jpg'}]})).toBe('https://example.com/current-photo.jpg');
  });
  it.each(['Make it brighter', 'Create a school poster using the previous image', 'Edit this photo'])('requires an explicit historical edit or reference: %s', query => {
    const source=resolveChatImageSourceUrl({query,history,imageAttachments:[]});
    expect(source).toBe('https://example.com/old-cat.png');
    expect(classifyRequestKind(query,'general',{hasEditableImageSource:Boolean(source)})).toBe('image_generation');
  });
  it('distinguishes a cached upload from an attachment belonging to the current request', () => {
    const attachments=[{dataUrl:'https://example.com/old-upload.jpg'}];
    const fresh='Create a poster for our school open day';
    expect(resolveChatImageSourceUrl({query:fresh,history,imageAttachments:attachments,imageAttachmentsAreHistorical:true})).toBeUndefined();
    expect(resolveChatImageSourceUrl({query:fresh,history,imageAttachments:attachments,imageAttachmentsAreHistorical:false})).toBe(attachments[0].dataUrl);
    expect(resolveChatImageSourceUrl({query:'Make it brighter',history:[],imageAttachments:attachments,imageAttachmentsAreHistorical:true})).toBe(attachments[0].dataUrl);
    expect(resolveChatImageSourceUrl({query:'Make it brighter',history,imageAttachments:attachments,imageAttachmentsAreHistorical:true})).toBe('https://example.com/old-cat.png');
  });
  it('preserves the original upload when a replacement job retries the same user turn', () => {
    const storedAt=100_000;
    const now=storedAt+5*60*1000;
    const query='Create a poster for our school open day';
    const current=isChatImageUploadForMessage({storedAt,messageCreatedAt:storedAt,now});
    expect(current).toBe(true);
    expect(resolveChatImageSourceUrl({query,history,imageAttachments:[{dataUrl:'https://example.com/original-upload.jpg'}],imageAttachmentsAreHistorical:!current})).toBe('https://example.com/original-upload.jpg');
    expect(isChatImageUploadForMessage({storedAt,messageCreatedAt:storedAt+1,now})).toBe(false);
    expect(isChatImageUploadForMessage({storedAt,messageCreatedAt:storedAt,now:storedAt+46*60*1000})).toBe(false);
    expect(isChatImageUploadForMessage({storedAt,messageCreatedAt:storedAt,now:storedAt-1})).toBe(false);
    expect(isChatImageUploadForMessage({messageCreatedAt:storedAt,now})).toBe(false);
  });
  it.each(['Create a poster using my photo', 'Create a poster using the uploaded photo', 'Create a poster using the previous uploaded photo', 'Create a poster based on my photo'])('uses the requested upload even after an unrelated generated image: %s', query => {
    const source=resolveChatImageSourceUrl({query,history,imageAttachments:[{dataUrl:'https://example.com/my-portrait.jpg'}],imageAttachmentsAreHistorical:true});
    expect(source).toBe('https://example.com/my-portrait.jpg');
    expect(classifyRequestKind(query,'general',{hasEditableImageSource:true})).toBe('image_generation');
    expect(missingChatImageReferenceMessage(query,source)).toBeUndefined();
  });
  it('honours an explicitly generated source instead of a cached uploaded portrait', () => {
    const query='Create a poster using the previous generated image';
    expect(resolveChatImageSourceUrl({query,history,imageAttachments:[{dataUrl:'https://example.com/my-portrait.jpg'}],imageAttachmentsAreHistorical:true})).toBe('https://example.com/old-cat.png');
  });
  it('asks for a missing explicit source rather than substituting an unrelated image or rendering without it', () => {
    const query='Create a poster using my photo';
    const source=resolveChatImageSourceUrl({query,history,imageAttachments:[],imageAttachmentsAreHistorical:true});
    expect(source).toBeUndefined();
    expect(missingChatImageReferenceMessage(query,source)).toContain('attach the original photo');
    const generated='Create a poster using the previous generated image';
    const missing=resolveChatImageSourceUrl({query:generated,history:[],imageAttachments:[{dataUrl:'https://example.com/my-portrait.jpg'}],imageAttachmentsAreHistorical:true});
    expect(missing).toBeUndefined();
    expect(missingChatImageReferenceMessage(generated,missing)).toContain('No image credits were charged');
    expect(missingChatImageReferenceMessage('Create a new school poster')).toBeUndefined();
  });
  it('does not mistake original/source design adjectives for references to an old upload', () => {
    for (const query of ['Create an original poster for our school', 'Create a source image for my robotics presentation']) {
      expect(resolveChatImageSourceUrl({query,history,imageAttachments:[{dataUrl:'https://example.com/old-upload.jpg'}],imageAttachmentsAreHistorical:true})).toBeUndefined();
      expect(missingChatImageReferenceMessage(query)).toBeUndefined();
    }
  });
  it('uses a newly attached generated image for this-image references while keeping earlier references explicit', () => {
    const upload='https://example.com/current-generated-image.png';
    expect(resolveChatImageSourceUrl({query:'Create a poster using this generated image',history,imageAttachments:[{dataUrl:upload}],imageAttachmentsAreHistorical:false})).toBe(upload);
    expect(resolveChatImageSourceUrl({query:'Create a poster using the previous generated image',history,imageAttachments:[{dataUrl:upload}],imageAttachmentsAreHistorical:false})).toBe('https://example.com/old-cat.png');
  });
  it('does not treat a photo-related business name as a request to use a cached portrait', () => {
    const query='Create a logo for my photo studio';
    expect(resolveChatImageSourceUrl({query,history,imageAttachments:[{dataUrl:'https://example.com/old-portrait.jpg'}],imageAttachmentsAreHistorical:true})).toBeUndefined();
    expect(missingChatImageReferenceMessage(query)).toBeUndefined();
  });
  it('does not convert a delivery follow-up into an edit of a previously generated unrelated image', () => {
    expect(resolveChatImageSourceUrl({query:'I am waiting for the poster',history,imageAttachments:[]})).toBeUndefined();
  });
  it('does not reuse instructional history as a creative brief', () => {
    const query='I am waiting for the poster';
    expect(resolveChatImagePrompt(query,[{role:'user',content:'Show me how to create a poster in Canva'}])).toBe(query);
  });
});
