import readline from 'readline';
import { spawn, ChildProcess } from 'child_process';

// A mapping of test names to their file paths
const tests = {
  '1': { name: 'Terminal Loop Test', path: 'src/tests/terminalLoop.ts' },
  '2': { name: 'CLI Test', path: 'src/tests/cli.ts' },
  '3': { name: 'Chat Room Test', path: 'src/tests/chatRoomTest.ts' },
  '4': { name: 'Tool Calling Test', path: 'src/tests/toolCalling.ts' },
  '5': { name: 'Infinite Backrooms Test', path: 'src/tests/infiniteBackrooms.ts' },
  '6': { name: 'Structured Output Test', path: 'src/tests/structuredOutput.ts' }
};

// Track current running test process
let currentTestProcess: ChildProcess | null = null;
// Track if test was interrupted
let wasTestInterrupted = false;

function showMenu() {
  console.log('\nAvailable Tests:');
  for (const [key, test] of Object.entries(tests)) {
    console.log(`${key}. ${test.name}`);
  }
  console.log('\nSelect a test number to run it, or type "exit" to quit:');
}

function cleanExit() {
  if (currentTestProcess) {
    currentTestProcess.kill('SIGINT');
  }
  console.log('\nGoodbye!');
  process.exit(0);
}

// Handle SIGINT (Ctrl+C) for the main process
function setupMainProcessHandlers(rl: readline.Interface) {
  process.on('SIGINT', () => {
    if (currentTestProcess) {
      // If a test is running, kill it and return to menu
      wasTestInterrupted = true;
      currentTestProcess.kill('SIGINT');
      currentTestProcess = null;
      console.log('\nTest interrupted. Returning to menu...');
    } else {
      // If no test is running, confirm exit
      console.log('\nAre you sure you want to exit? (y/n)');
      rl.question('', (answer) => {
        if (answer.toLowerCase() === 'y') {
          cleanExit();
        } else {
          showMenu();
        }
      });
    }
  });

  // Handle normal process exit
  process.on('exit', () => {
    if (currentTestProcess) {
      currentTestProcess.kill('SIGINT');
    }
  });
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Setup SIGINT handlers
  setupMainProcessHandlers(rl);

  showMenu();

  rl.on('line', (input: string) => {
    const trimmed = input.trim();
    if (trimmed.toLowerCase() === 'exit') {
      cleanExit();
    } else if (tests[trimmed]) {
      const test = tests[trimmed];
      console.log(`\nRunning "${test.name}"...\n`);
      
      // Reset interrupted flag
      wasTestInterrupted = false;
      
      // Spawn a child process to run the selected test with ts-node
      currentTestProcess = spawn('npx', ['ts-node', test.path], { stdio: 'inherit' });
      
      currentTestProcess.on('close', (code) => {
        if (!wasTestInterrupted) {
          console.log(`\n"${test.name}" ${code === null ? 'was interrupted' : `exited with code ${code}`}.`);
          showMenu();
        }
        currentTestProcess = null;
      });

      // Handle test process errors
      currentTestProcess.on('error', (err) => {
        console.error(`Error running test: ${err.message}`);
        currentTestProcess = null;
        showMenu();
      });
    } else {
      console.log('Invalid selection. Please try again.');
      showMenu();
    }
  });
}

main().catch((err) => {
  console.error('Error running CLI:', err);
  process.exit(1);
});