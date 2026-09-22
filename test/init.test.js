const { describe, test } = require('node:test');
const assert = require('node:assert');
const { generateTemplateVars, renderTemplate } = require('../src/commands/init');

describe('init command utilities', () => {
  test('generateTemplateVars creates correct vars', () => {
    const vars = generateTemplateVars('my-project', { description: 'Test desc', author: 'Alice' });
    assert.strictEqual(vars.name, 'my-project');
    assert.strictEqual(vars.className, 'MyProject');
    assert.strictEqual(vars.camelName, 'myProject');
    assert.strictEqual(vars.description, 'Test desc');
    assert.strictEqual(vars.author, 'Alice');
  });

  test('generateTemplateVars sanitizes names', () => {
    const vars = generateTemplateVars('My_App-Name');
    assert.strictEqual(vars.name, 'my-app-name');
  });

  test('renderTemplate replaces all placeholders', () => {
    const vars = generateTemplateVars('test-project', { description: 'A test', author: 'Bob' });
    const result = renderTemplate('Name: {{name}} | Class: {{className}} | Desc: {{description}}', vars);
    assert.strictEqual(result, 'Name: test-project | Class: TestProject | Desc: A test');
  });

  test('renderTemplate handles missing placeholders gracefully', () => {
    const vars = { name: 'test' };
    const result = renderTemplate('Hello {{name}} and {{unknown}}', vars);
    assert.strictEqual(result, 'Hello test and {{unknown}}');
  });
});
