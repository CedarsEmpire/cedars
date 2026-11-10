const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
let token = "";

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(init.method && init.method !== "GET" ? { "Content-Type": "application/json" } : {})
    }
  });

  const text = await response.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    // keep text as-is
  }

  return { status: response.status, ok: response.ok, body: json };
}

async function main() {
  const health = await request("/api/health");
  if (!health.ok || health.status !== 200) {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }

  const authConfig = await request("/api/auth/config");
  if (!authConfig.ok || authConfig.status !== 200 ||
      typeof authConfig.body !== "object" || authConfig.body === null ||
      !("localDevelopment" in authConfig.body) || authConfig.body.localDevelopment !== true) {
    throw new Error(`Local auth configuration check failed: ${JSON.stringify(authConfig)}`);
  }

  const deniedLocalToken = await request("/api/auth/local-token", { method: "POST" });
  if (deniedLocalToken.status !== 403) {
    throw new Error(`Local sign-in origin check failed: ${deniedLocalToken.status}.`);
  }

  const localToken = await request("/api/auth/local-token", {
    method: "POST",
    headers: { Origin: new URL(baseUrl).origin }
  });
  if (!localToken.ok || localToken.status !== 200 ||
      typeof localToken.body !== "object" || localToken.body === null ||
      !("access_token" in localToken.body) || typeof localToken.body.access_token !== "string") {
    throw new Error(`Local sign-in check failed (${localToken.status}).`);
  }
  token = localToken.body.access_token;

  const localApprover = await request("/api/auth/local-approver-token", {
    method: "POST",
    headers: { Origin: new URL(baseUrl).origin }
  });
  if (!localApprover.ok || localApprover.status !== 200 ||
      typeof localApprover.body !== "object" || localApprover.body === null ||
      !("access_token" in localApprover.body) || typeof localApprover.body.access_token !== "string") {
    throw new Error(`Local reviewer sign-in check failed (${localApprover.status}).`);
  }
  const approverToken = localApprover.body.access_token;

  const modules = await request("/api/modules", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!modules.ok || modules.status !== 200) {
    throw new Error(`Modules check failed: ${JSON.stringify(modules)}`);
  }

  const workers = await request("/api/workers", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!workers.ok || workers.status !== 200 ||
      typeof workers.body !== "object" || workers.body === null ||
      !("workers" in workers.body) || !Array.isArray(workers.body.workers)) {
    throw new Error(`Workers check failed: ${JSON.stringify(workers)}`);
  }

  const grids = await request("/api/grids", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!grids.ok || grids.status !== 200 ||
      typeof grids.body !== "object" || grids.body === null ||
      !("grids" in grids.body) || !Array.isArray(grids.body.grids)) {
    throw new Error(`Grids check failed: ${JSON.stringify(grids)}`);
  }

  const gridTasksEnable = await request("/api/admin/modules/grid_tasks", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ enabled: true, reason: "Smoke test restricted task access" })
  });
  const approvalBody = gridTasksEnable.body as { approval?: { id?: string }; approvalRequired?: boolean };
  if (gridTasksEnable.status !== 202 || approvalBody.approvalRequired !== true || !approvalBody.approval?.id) {
    throw new Error(`Grid Tasks activation did not enter approval: ${JSON.stringify(gridTasksEnable)}`);
  }
  const approvalDecision = await request(`/api/admin/approvals/${encodeURIComponent(approvalBody.approval.id)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${approverToken}` },
    body: JSON.stringify({ decision: "APPROVE", reason: "Smoke test independent review" })
  });
  const decisionBody = approvalDecision.body as { approval?: { applied?: boolean } };
  if (!approvalDecision.ok || decisionBody.approval?.applied !== true) {
    throw new Error(`Grid Tasks independent approval failed: ${JSON.stringify(approvalDecision)}`);
  }

  const taskCreate = await request("/api/tasks", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      gridId: "research",
      title: "Smoke test paid work order",
      description: "Validate the internal Grid Task API lifecycle.",
      acceptanceCriteria: "Task is persisted, assigned, and remains unpaid.",
      agreedAmount: "1.00",
      currency: "USD"
    })
  });
  const createdTaskBody = taskCreate.body as { task?: { id?: string; status?: string; settlementStatus?: string } };
  if (!taskCreate.ok || taskCreate.status !== 201 || !createdTaskBody.task?.id ||
      createdTaskBody.task.status !== "OPEN" || createdTaskBody.task.settlementStatus !== "NOT_RECORDED") {
    throw new Error(`Grid Task creation check failed: ${JSON.stringify(taskCreate)}`);
  }
  const taskId = createdTaskBody.task.id;

  const taskList = await request("/api/tasks", { headers: { Authorization: `Bearer ${token}` } });
  const taskListBody = taskList.body as { tasks?: Array<{ id?: string }> };
  if (!taskList.ok || taskList.status !== 200 || !taskListBody.tasks?.some((task) => task.id === taskId)) {
    throw new Error(`Grid Task listing check failed: ${JSON.stringify(taskList)}`);
  }

  const taskAssign = await request(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "assign", workerId: "research", reason: "Smoke test task assignment" })
  });
  if (!taskAssign.ok || taskAssign.status !== 200 ||
      typeof taskAssign.body !== "object" || taskAssign.body === null ||
      !("task" in taskAssign.body) || taskAssign.body.task.status !== "ASSIGNED") {
    throw new Error(`Grid Task assignment check failed: ${JSON.stringify(taskAssign)}`);
  }

  const taskStart = await request(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "start", reason: "Smoke test start task" })
  });
  if (!taskStart.ok || taskStart.status !== 200 ||
      typeof taskStart.body !== "object" || taskStart.body === null ||
      !("task" in taskStart.body) || taskStart.body.task.status !== "IN_PROGRESS" ||
      taskStart.body.task.settlementStatus !== "NOT_RECORDED") {
    throw new Error(`Grid Task start check failed: ${JSON.stringify(taskStart)}`);
  }

  const taskDeliver = await request(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${approverToken}` },
    body: JSON.stringify({
      action: "deliver",
      evidence: "Smoke test delivery evidence reviewed by the independent operator.",
      reason: "Smoke test records operator delivery"
    })
  });
  if (!taskDeliver.ok || taskDeliver.status !== 200 ||
      typeof taskDeliver.body !== "object" || taskDeliver.body === null ||
      !("task" in taskDeliver.body) || taskDeliver.body.task.status !== "DELIVERED" ||
      taskDeliver.body.task.settlementStatus !== "NOT_RECORDED") {
    throw new Error(`Grid Task delivery check failed: ${JSON.stringify(taskDeliver)}`);
  }

  const taskAccept = await request(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "accept", reason: "Smoke test buyer accepts delivery" })
  });
  if (!taskAccept.ok || taskAccept.status !== 200 ||
      typeof taskAccept.body !== "object" || taskAccept.body === null ||
      !("task" in taskAccept.body) || taskAccept.body.task.status !== "ACCEPTED" ||
      taskAccept.body.task.settlementStatus !== "NOT_RECORDED") {
    throw new Error(`Grid Task buyer acceptance check failed: ${JSON.stringify(taskAccept)}`);
  }

  const cancelTask = await request("/api/tasks", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      gridId: "research",
      title: "Smoke test cancellation work order",
      description: "Validate cancellation of an open internal task.",
      acceptanceCriteria: "The task can be cancelled while still open.",
      agreedAmount: "1.00",
      currency: "USD"
    })
  });
  const cancelTaskBody = cancelTask.body as { task?: { id?: string; status?: string } };
  if (cancelTask.status !== 201 || !cancelTaskBody.task?.id || cancelTaskBody.task.status !== "OPEN") {
    throw new Error(`Grid Task cancellation fixture creation failed: ${JSON.stringify(cancelTask)}`);
  }
  const taskCancel = await request(`/api/tasks/${encodeURIComponent(cancelTaskBody.task.id)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "cancel", reason: "Smoke test cancels open task" })
  });
  if (!taskCancel.ok || taskCancel.status !== 200 ||
      typeof taskCancel.body !== "object" || taskCancel.body === null ||
      !("task" in taskCancel.body) || taskCancel.body.task.status !== "CANCELLED") {
    throw new Error(`Grid Task cancellation check failed: ${JSON.stringify(taskCancel)}`);
  }

  const gridTasksDisable = await request("/api/admin/modules/grid_tasks", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ enabled: false, reason: "Smoke test closes task access" })
  });
  if (!gridTasksDisable.ok || gridTasksDisable.status !== 200) {
    throw new Error(`Grid Tasks shutdown failed: ${JSON.stringify(gridTasksDisable)}`);
  }

  const readiness = await request("/api/ready");
  if (!readiness.ok || readiness.status !== 200 ||
      typeof readiness.body !== "object" || readiness.body === null ||
      !("status" in readiness.body) || readiness.body.status !== "ready") {
    throw new Error(`Readiness check failed: ${JSON.stringify(readiness)}`);
  }

  const summary = await request("/api/operations/summary", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!summary.ok || summary.status !== 200) {
    throw new Error(`Operations summary check failed: ${JSON.stringify(summary)}`);
  }

  const audit = await request("/api/admin/audit", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!audit.ok || audit.status !== 200) {
    throw new Error(`Audit check failed: ${JSON.stringify(audit)}`);
  }

  const treasury = await request("/api/admin/treasury", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!treasury.ok || treasury.status !== 200 ||
      typeof treasury.body !== "object" || treasury.body === null ||
      !("ledgerMode" in treasury.body) || treasury.body.ledgerMode !== "READ_ONLY_CHAIN_OBSERVATIONS" ||
      !("payableBalances" in treasury.body) || treasury.body.payableBalances !== false) {
    throw new Error(`Treasury observation check failed: ${JSON.stringify(treasury)}`);
  }

  const blocked = await request("/api/admin/modules/wallet", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ enabled: true, reason: "Smoke check block" })
  });
  if (blocked.status !== 403) {
    throw new Error(`Financial guardrail check failed: ${JSON.stringify(blocked)}`);
  }

  console.log("SMOKE_OK");
  console.log(JSON.stringify({
    health,
    authConfig: authConfig.status,
    localSignIn: localToken.status,
    localApproverSignIn: localApprover.status,
    modules: modules.status,
    workers: workers.status,
    grids: grids.status,
    gridTaskCreate: taskCreate.status,
    gridTaskList: taskList.status,
    gridTaskAssign: taskAssign.status,
    gridTaskStart: taskStart.status,
    approval: approvalDecision.status,
    readiness: readiness.status,
    summary: summary.status,
    audit: audit.status,
    treasury: treasury.status,
    blocked
  }, null, 2));
}

main().catch((error) => {
  console.error("SMOKE_FAIL");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
