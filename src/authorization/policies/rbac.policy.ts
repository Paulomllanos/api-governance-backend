
export const APP_ROLES = [
  'ADMIN',
  'REVIEWER',
  'DEVELOPER',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APP_PERMISSIONS = [
  'apis:read',
  'apis:create',
  'apis:update',

  'versions:read',
  'versions:create',

  'documents:read',
  'documents:upload',

  'evaluations:create',
  'evaluations:read',

  'reviews:request',
  'reviews:approve',
  'reviews:reject',

  'versions:publish',

  'users:read',
  'users:manage',
] as const;

export type AppPermission =
  (typeof APP_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<
  AppRole,
  readonly AppPermission[]
> = {
  ADMIN: APP_PERMISSIONS,

  REVIEWER: [
    'apis:read',
    'versions:read',
    'evaluations:create',
    'evaluations:read',
    'reviews:approve',
    'reviews:reject',
    'documents:read',
  ],

  DEVELOPER: [
    'apis:read',
    'apis:create',
    'apis:update',
    'versions:read',
    'versions:create',
    'documents:upload',
    'documents:read',
    'evaluations:create',
    'evaluations:read',
    'reviews:request',
  ],
};

export function isAppRole(
  value: unknown,
): value is AppRole {
  return (
    typeof value === 'string' &&
    APP_ROLES.some((role) => role === value)
  );
}

export function hasPermission(
  role: unknown,
  permission: AppPermission,
): boolean {
  if (!isAppRole(role)) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyRolePermission(
  roles: readonly unknown[],
  permission: AppPermission,
): boolean {
  return roles.some((role) =>
    hasPermission(role, permission),
  );
}
