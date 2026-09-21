'use strict';

const { generateTemplateVars, renderTemplate } = require('../src/commands/init');

describe('init command utilities', () => {
  test('generateTemplateVars creates correct vars', () => {
    const vars = generateTemplateVars('my-project', { description: 'Test desc', author: 'Alice' });
    expect(vars.name).toBe('my-project');
    expect(vars.className).toBe('MyProject');
    expect(vars.camelName).toBe('myProject');
    expect(vars.description).toBe('Test desc');
    expect(vars.author).toBe('Alice');
  });

  test('generateTemplateVars sanitizes names', () => {
    const vars = generateTemplateVars('My_App-Name');
    expect(vars.name).toBe('my-app-name');
  });

  test('renderTemplate replaces all placeholders', () => {
    const vars = generateTemplateVars('test-project', { description: 'A test', author: 'Bob' });
    const result = renderTemplate('Name: {{name}} | Class: {{className}} | Desc: {{description}}', vars);
    expect(result).toBe('Name: test-project | Class: TestProject | Desc: A test');
  });

  test('renderTemplate handles missing placeholders gracefully', () => {
    const vars = { name: 'test' };
    const result = renderTemplate('Hello {{name}} and {{unknown}}', vars);
    expect(result).toBe('Hello test and {{unknown}}');
  });
});
