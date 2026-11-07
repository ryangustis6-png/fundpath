// Public identifier only. This is not an API key and does not start a conversation.
const DEFAULT_MEETING_AGENT_ID = 'agent_8901m6w3h3tpf5fr9qsgkkwr8gc2';
// Locked off for the user's no-credit-card-charges demo. Changing this requires
// a separate billing decision; credentials alone must never enable provider use.
const PAID_SERVICES_ENABLED = false;
if (typeof module !== 'undefined') module.exports = { agentId: DEFAULT_MEETING_AGENT_ID, paidServicesEnabled: PAID_SERVICES_ENABLED };
