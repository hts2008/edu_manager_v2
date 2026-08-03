const DEFAULT_POLL_DELAY_MS = 750;
const DEFAULT_MAX_POLLS = 20;

const defaultWait = (duration) =>
  new Promise((resolve) => globalThis.setTimeout(resolve, duration));

export async function pollBulkPaymentBatch({
  batchId,
  getStatus,
  isCancelled = () => false,
  waitFor = defaultWait,
  pollDelayMs = DEFAULT_POLL_DELAY_MS,
  maxPolls = DEFAULT_MAX_POLLS,
}) {
  if (!batchId) throw new Error('Thiếu mã đợt thu để đối soát');
  if (typeof getStatus !== 'function') throw new Error('Thiếu hàm kiểm tra trạng thái đợt thu');

  let response = await getStatus(batchId);
  let pollCount = 1;

  while (
    response.success &&
    response.data?.status === 'processing' &&
    pollCount < maxPolls &&
    !isCancelled()
  ) {
    await waitFor(pollDelayMs);
    if (isCancelled()) return response;
    response = await getStatus(batchId);
    pollCount += 1;
  }

  return response;
}
