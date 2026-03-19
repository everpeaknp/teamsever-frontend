const { execSync } = require('child_process');

try {
  const result = execSync('lsof -t -i:3000').toString().trim();
  if (result) {
    const pids = result.split('\\n');
    for (const pid of pids) {
      if (pid) {
        console.log(`Killing process ${pid} on port 3000`);
        process.kill(parseInt(pid, 10), 9);
      }
    }
  } else {
    console.log('No processes found on port 3000');
  }
} catch (e) {
  console.log('Error or no process on port 3000:', e.message);
}
