const queue = [];
let running = false;

function addJob(job) {
  queue.push(job);
  processQueue();
}

function getQueueSnapshot() {
  return {
    running,
    waiting: queue.length,
  };
}

async function processQueue() {
  if (running) return;
  running = true;

  while (queue.length > 0) {
    const job = queue.shift();

    try {
      await job();
    } catch (err) {
      console.error("Queue job failed:", err);
    }
  }

  running = false;
}

module.exports = {
  addJob,
  getQueueSnapshot,
};