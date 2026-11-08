# Data Processing AI-worker runtime — Preview implementation notes

**Status:** Provider-neutral orchestration scaffold; synthetic-only test coverage. Not a deployed or production worker.

## Execution boundary

The runtime orchestrator binds one authorized invoice job to the SHA-256 hash of the exact input bytes, authenticates a worker principal through an injected trusted identity verifier, invokes an injected model adapter, validates the returned invoice against the versioned extraction schema, and asks a separately authenticated verifier to assess the output. The result is accepted only when execution and verification refer to the same job, input and output hashes, and the verifier principal differs from the producing worker.

## Explicit limitations

- The committed test adapter is a synthetic fixture, not an AI model.
- No provider API, credentials, document parser, object storage, durable queue, sandbox, tenant-aware persistence or production identity provider is wired.
- The in-memory result uses an ephemeral output reference; it is not a durable audit record.
- The orchestration contract does not itself enforce operating-system isolation, network egress restrictions, CPU/memory quotas or secret isolation. Those must be supplied by the execution host before any real provider is enabled.
- The verifier is an injected interface. The test verifier is a synthetic fixture and does not constitute independent source-to-output quality verification.

## Next gate for an actual AI execution

1. Select and approve a model provider and permitted data region/retention settings.
2. Provision a Preview-only provider credential as a repository/environment secret; never commit or paste it into chat.
3. Implement the provider adapter and trusted worker/verifier identity adapters.
4. Add a real independent source-evidence verifier, not a second ungrounded model opinion.
5. Provide an isolated Preview execution host with strict egress, resource and secret boundaries.
6. Run a synthetic invoice end-to-end, preserve redacted execution/verification evidence, and independently inspect it before considering non-sensitive customer samples.

Production remains FROZEN; public launch and financial execution remain OFF; NO FIAT TRANSACTIONS.
