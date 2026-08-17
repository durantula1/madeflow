# MadeFlow state machines

## Order stage

```text
draft
  -> awaiting_approval
  -> approved
  -> in_production
  -> ready_for_installation
  -> installed
  -> completed
  -> service
```

Order stage describes operational progress. It never determines which specification version is valid for production.

## Specification version

```text
draft row
  -> publish -> published
  -> send -> awaiting_approval
  -> approve -> approved
  -> later approval -> superseded
```

`changes_requested` is stored on a review request. The reviewed version remains immutable and may remain `awaiting_approval` until it is revoked or superseded by a new published revision.

## Production version invariant

- `orders.current_approved_version_id` is the only production-version pointer.
- Creating or publishing a newer revision does not change that pointer.
- Approval changes the pointer in the same transaction that records the approval.
- A repeated approval request returns the existing receipt and makes no duplicate records.

## Installation and service

```text
scheduled -> installed -> accepted | issues
completed -> service -> completed
```

Installation acceptance uses its own scope and evidence. Approval links are never reused for after-sales access.

