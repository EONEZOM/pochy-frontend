import 'server-only';

import type { AgentLogPayload } from '@/lib/debug-agent-log';

const DEBUG_SESSION_ID = '4fabf0';
const DEBUG_LOG_FILE = 'debug-4fabf0.log';

export const agentDebugLogServer = (payload: AgentLogPayload): void => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { appendFileSync } = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require('path') as typeof import('path');
    const line = JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      timestamp: Date.now(),
      ...payload,
    });
    appendFileSync(join(process.cwd(), DEBUG_LOG_FILE), `${line}\n`);
  } catch {
    // ignore
  }
};
