import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../index.ts', import.meta.url));
let child;
let restart = false;
let stopping = false;

function start() {
    child = fork(entry, process.argv.slice(2), {
        execArgv: ['--import', 'tsx'],
        env: { ...process.env, YAE_LAUNCHER: '1' },
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });
    child.on('message', message => {
        if (message === 'yae:restart') restart = true;
    });
    child.on('error', error => {
        console.error('[LAUNCHER ERROR]:', error);
        process.exitCode = 1;
    });
    child.on('exit', (code, signal) => {
        if (restart && !stopping) {
            restart = false;
            start();
        } else {
            process.exitCode = code ?? (signal ? 1 : 0);
        }
    });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        stopping = true;
        if (child && !child.killed) child.kill(signal);
    });
}

start();
