// Controls the mocked session that `sessionMiddleware` / `requirePermission`
// read. `test/setup.ts` wires `@/lib/auth` to read from this mutable state, so
// a test just calls `loginAs(...)` / `logout()` before hitting an endpoint.

type Session = {
  user: { id: string; role: string };
  session: { activeOrganizationId: string | null };
};

export const authState: {
  session: Session | null;
  hasPermission: boolean;
} = {
  session: null,
  hasPermission: true,
};

export function loginAs(opts: {
  userId: string;
  orgId: string | null;
  role?: string;
}) {
  authState.session = {
    user: { id: opts.userId, role: opts.role ?? "user" },
    session: { activeOrganizationId: opts.orgId },
  };
  authState.hasPermission = true;
}

/** Simulate a request with no session → `sessionMiddleware` throws 401. */
export function logout() {
  authState.session = null;
}

/** Simulate `auth.api.hasPermission` denying → `requirePermission` throws 403. */
export function denyPermission() {
  authState.hasPermission = false;
}
