/**
 * Client-safe account identity shape.
 *
 * Separate from `session.ts`, which is `server-only`. Client Components import
 * from here so the server-only poison pill never reaches a browser bundle.
 */
export type AccountIdentity = {
  authUserId: string;
  customerId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  marketingOptIn: boolean;
};
