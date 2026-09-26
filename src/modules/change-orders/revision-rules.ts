const openStatuses = ["draft", "sent", "viewed", "changes_requested", "declined", "expired"];

/**
 * Whether a new version can start from a document's current version. An approved offer can be
 * renegotiated: the approved version stays in force until the client approves the new one.
 * An approved change is final; a correction to it is a new change.
 */
export function revisableStatus(kind: "offer" | "change", status: string) {
  return openStatuses.includes(status) || (kind === "offer" && status === "approved");
}
