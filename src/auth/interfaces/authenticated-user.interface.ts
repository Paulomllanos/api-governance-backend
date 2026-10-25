
import type {
  AppRole,
} from '../../authorization/policies/rbac.policy.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  roles: AppRole[];
}
