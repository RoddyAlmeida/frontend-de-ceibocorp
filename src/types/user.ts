import { parseRole, type Role } from './role';

export type { Role };

export interface User {
  id: number;
  name: string;
  last_name?: string;
  id_card?: string;
  address?: string;
  email: string;
  role: Role;
  headquarter_id?: number;
  status?: string;
}

export function parseUser(json: Record<string, unknown>): User {
  const rawRole = json.role;
  return {
    id: json.id as number,
    name: json.name as string,
    last_name: json.last_name as string | undefined,
    id_card: json.id_card as string | undefined,
    address: json.address as string | undefined,
    email: json.email as string,
    role: parseRole(rawRole),
    headquarter_id: json.headquarter_id as number | undefined,
    status: json.status as string | undefined,
  };
}
