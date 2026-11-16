// ============================================================
// Password policy
// Must match the Supabase Auth settings (supabase/config.toml and the
// hosted project's Auth → Policies):
//   minimum_password_length = 12
//   password_requirements   = "lower_upper_letters_digits"
// The server is the authority; this check gives users the reason early.
// ============================================================

export const MIN_PASSWORD_LENGTH = 12;

/** Returns a user-facing reason the password is not acceptable, or null if it is. */
export function passwordProblem(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include an upper-case letter, a lower-case letter and a number';
  }
  return null;
}
