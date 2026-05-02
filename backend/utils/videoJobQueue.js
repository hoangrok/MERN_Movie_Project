const queue = [];
let running = false;
let activeJob = null;

function createJobMeta(meta = {}) {
  return {
    movieId: meta.movieId ? String(meta.movieId) : "",
    title: typeof meta.title === "string" ? meta.title.trim() : "",
    type: typeof meta.type === "string" ? meta.type.trim() : "video-process",
    queuedAt: meta.queuedAt || Date.now(),
  };
}

function addJob(job, meta = {}) {
  queue.push({
    run: job,
    meta: createJobMeta(meta),
  });
  processQueue();
}

function getQueueSnapshot() {
  return {
    running,
    waiting: queue.length,
    activeJob,
    waitingJobs: queue.slice(0, 12).map((item) => item.meta),
  };
}

async function processQueue() {
  if (running) return;
  running = true;

  while (queue.length > 0) {
    const job = queue.shift();
    activeJob = job?.meta || null;

    try {
      await job.run();
    } catch (err) {
      console.error("Queue job failed:", err);
    } finally {
      activeJob = null;
    }
  }

  running = false;
}

module.exports = {
  addJob,
  getQueueSnapshot,
};
