import { describe, expect, it } from 'vitest';
import { classifyRequestKind } from '../../convex/providerRouter';
import { shouldDeductCreditsForChatRequestKind } from '../../convex/creditsConfig';
import { isChatImageUploadForMessage, isImageDeliveryFollowup, resolveChatImagePrompt, resolveChatImageSourceUrl } from '../../convex/chatImageSource';

const history = [{ role: 'assistant', content: 'Here is your generated image:\n\nhttps://example.com/old-cat.png' }];
const commentary = [
  'Give me feedback on this poster',
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
  it('does not convert a delivery follow-up into an edit of a previously generated unrelated image', () => {
    expect(resolveChatImageSourceUrl({query:'I am waiting for the poster',history,imageAttachments:[]})).toBeUndefined();
  });
  it('does not reuse instructional history as a creative brief', () => {
    const query='I am waiting for the poster';
    expect(resolveChatImagePrompt(query,[{role:'user',content:'Show me how to create a poster in Canva'}])).toBe(query);
  });
});
