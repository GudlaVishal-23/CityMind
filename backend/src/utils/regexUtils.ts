/**
 * Utility for escaping regex metacharacters and mitigating ReDoS / NoSQL regex injection (DEF-BE-05).
 * 
 * - Truncates input to maximum 100 characters to cap regex computational complexity.
 * - Escapes regex special characters: . * + ? ^ $ { } ( ) | [ ] \
 * 
 * @param input Raw search or query string from user input
 * @returns Escaped string safe for usage inside new RegExp(...) or MongoDB $regex
 */
export function escapeRegExp(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input
    .slice(0, 100)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default escapeRegExp;
