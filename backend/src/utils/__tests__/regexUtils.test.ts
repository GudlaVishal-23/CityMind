import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegExp } from '../regexUtils';

void describe('regexUtils Unit Tests (DEF-BE-05 ReDoS & NoSQL Injection)', () => {
  void describe('Metacharacter Escaping', () => {
    void it('escapes all standard regex metacharacters: .*+?^${}()|[]\\', () => {
      const input = '.*+?^${}()|[]\\';
      const escaped = escapeRegExp(input);
      assert.strictEqual(escaped, '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');

      const re = new RegExp(escaped);
      assert.strictEqual(re.test('.*+?^${}()|[]\\'), true);
      assert.strictEqual(re.test('foobar'), false);
    });

    void it('does not treat wildcards as patterns', () => {
      const escaped = escapeRegExp('pothole*');
      const re = new RegExp(escaped, 'i');
      assert.strictEqual(re.test('pothole*'), true);
      assert.strictEqual(re.test('potholeeeee'), false);
    });
  });

  void describe('Length Truncation (Max 100 Characters)', () => {
    void it('truncates inputs exceeding 100 characters down to 100 characters', () => {
      const longInput = 'A'.repeat(150);
      const escaped = escapeRegExp(longInput);
      assert.strictEqual(escaped.length, 100);
      assert.strictEqual(escaped, 'A'.repeat(100));
    });

    void it('preserves inputs under 100 characters without truncation', () => {
      const normalInput = 'Broken streetlight near Hitec City';
      const escaped = escapeRegExp(normalInput);
      assert.strictEqual(escaped, normalInput);
    });

    void it('handles empty strings and null/undefined gracefully', () => {
      assert.strictEqual(escapeRegExp(''), '');
      assert.strictEqual(escapeRegExp((null as unknown) as string), '');
      assert.strictEqual(escapeRegExp((undefined as unknown) as string), '');
    });
  });

  void describe('ReDoS Immunity & Backtracking Benchmark', () => {
    void it('neutralizes nested quantifier ReDoS patterns and executes in < 10ms', () => {
      const redosPayloads = [
        '(a+)+$',
        '(a|aa)+$',
        '(a*)*$',
        '(a|a?)+$'
      ];

      const attackSubject = 'a'.repeat(5000) + '!';

      for (const payload of redosPayloads) {
        const safeRegexStr = escapeRegExp(payload);
        const re = new RegExp(safeRegexStr);

        const start = performance.now();
        const matched = re.test(attackSubject);
        const duration = performance.now() - start;

        assert.strictEqual(matched, false);
        assert.ok(
          duration < 10,
          `Execution of escaped payload "${payload}" took ${duration.toFixed(2)}ms (must be < 10ms)`
        );
      }
    });
  });
});
