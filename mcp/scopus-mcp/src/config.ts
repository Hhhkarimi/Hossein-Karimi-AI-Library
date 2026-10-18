import { ScopusClient } from './client.js';
import { ScopusService } from './service.js';
export function configuredService(env: NodeJS.ProcessEnv = process.env) {
  return new ScopusService(new ScopusClient({ apiKey: env.ELSEVIER_API_KEY?.trim(), instToken: env.ELSEVIER_INST_TOKEN?.trim() }));
}
