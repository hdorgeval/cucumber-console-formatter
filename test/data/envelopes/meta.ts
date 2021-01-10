import { messages } from '@cucumber/messages';

export const metaEnvelope: messages.IEnvelope = messages.Envelope.fromObject({
  meta: {
    protocolVersion: '13.2.1',
    implementation: {
      name: 'cucumber-js',
      version: '7.0.0',
    },
    runtime: {
      name: 'node.js',
      version: '14.15.1',
    },
    os: {
      name: 'darwin',
      version: '20.1.0',
    },
    cpu: {
      name: 'x64',
    },
  },
});
