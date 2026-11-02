import { checkName, sqlInList } from './sql';

describe('sqlInList', () => {
  it('quotes each value and joins them', () => {
    expect(sqlInList(['admin', 'member'])).toBe(`'admin', 'member'`);
  });

  it('escapes single quotes', () => {
    expect(sqlInList(["o'reilly"])).toBe(`'o''reilly'`);
  });
});

describe('checkName', () => {
  it('appends a stable hash of the expression', () => {
    const name = checkName('chk_books_language', `"language" IN ('en')`);

    expect(name).toMatch(/^chk_books_language_[0-9a-f]{8}$/);
    expect(checkName('chk_books_language', `"language" IN ('en')`)).toBe(name);
  });

  it('shortens a name Postgres would truncate, keeping it stable', () => {
    const base =
      'chk_password_reset_tokens_expires_at_after_created_at_and_used_at';
    const name = checkName(base, `"expires_at" > "created_at"`);

    expect(name).toHaveLength(63);
    expect(name.startsWith(base.slice(0, 54))).toBe(true);
    expect(checkName(base, `"expires_at" > "created_at"`)).toBe(name);
  });

  it('changes the name when the expression changes', () => {
    expect(
      checkName('chk_books_language', `"language" IN ('en', 'fr')`),
    ).not.toBe(checkName('chk_books_language', `"language" IN ('en')`));
  });
});
