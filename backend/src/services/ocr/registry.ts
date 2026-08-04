import { config } from '../../config/env';
import { OcrEngine } from './types';
import { FakeEngine } from './fakeEngine';

let fakeInstance: FakeEngine | null = null;

export function getFakeEngine(): FakeEngine {
  if (!fakeInstance) fakeInstance = new FakeEngine();
  return fakeInstance;
}

export async function getOcrEngine(): Promise<OcrEngine> {
  switch (config.ocr.engine) {
    case 'paddle':
    case 'textract': {
      const { HttpOcrEngine } = await import('./httpEngine');
      return new HttpOcrEngine(config.ocr.engine);
    }
    case 'fake':
    default:
      return getFakeEngine();
  }
}
