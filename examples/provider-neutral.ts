import {
  createMotion,
  defineMotionProvider,
  type MotionProviderInput,
} from 'motionproof';

declare function callYourAgent(input: {
  system: string;
  prompt: string;
  feedback: MotionProviderInput['previousIssues'];
}): Promise<string>;

const provider = defineMotionProvider('example/agent', async (input) => (
  callYourAgent({
    system: input.systemPrompt,
    prompt: input.request.prompt,
    feedback: input.previousIssues,
  })
));

const result = await createMotion({
  id: 'verified-decision',
  prompt: 'Three agents route evidence into one verified decision.',
  preset: 'technical',
  maxAttempts: 3,
}, {
  provider,
  outputDirectory: './motionproof-output',
});

if (!result.ok) {
  throw new Error(result.issues.map((issue) => issue.message).join('\n'));
}

console.log(result.outputDirectory);
