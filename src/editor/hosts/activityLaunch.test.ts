import { describe, expect, it } from 'vitest';

import { launchScreen, launchTemplateCode } from './activityLaunch';


describe('launchTemplateCode', () => {
  it('takes the template link they just clicked over the launch the bot noted', () => {
    expect(launchTemplateCode('template:Clicked', {surface: 'template_post', template_code: 'Stored'})).toBe('Clicked');
  });

  it('takes the link when there is no launch', () => {
    expect(launchTemplateCode('template:abcDEF', null)).toBe('abcDEF');
  });

  it("takes the launch's template without a link", () => {
    expect(launchTemplateCode(null, {surface: 'command', template_code: 'Stored'})).toBe('Stored');
    expect(launchTemplateCode(undefined, {surface: 'command', template_code: 'Stored'})).toBe('Stored');
  });

  it("keeps the launch's template when the link is something else", () => {
    expect(launchTemplateCode('invite:abc123def456', {template_code: 'Stored'})).toBe('Stored');
  });

  it("falls back to the launch's when the link's code isn't one", () => {
    expect(launchTemplateCode('template:', {template_code: 'Stored'})).toBe('Stored');
    expect(launchTemplateCode('template:not/a-code', {template_code: 'Stored'})).toBe('Stored');
    expect(launchTemplateCode('template:abcdefghijklm', {template_code: 'Stored'})).toBe('Stored');
  });

  it('is none without a template anywhere', () => {
    expect(launchTemplateCode(null, null)).toBeNull();
    expect(launchTemplateCode(null, {surface: 'entry_point'})).toBeNull();
    expect(launchTemplateCode(null, {template_code: 5})).toBeNull();
    expect(launchTemplateCode(null, {template_code: ''})).toBeNull();
  });
});


describe('launchScreen', () => {
  it('opens the app launcher button and its message\'s Join on the choice', () => {
    expect(launchScreen('entry_point', false)).toBe('choice');
    expect(launchScreen('entry_point_join', false)).toBe('choice');
  });

  it('opens the editor\'s Join on its rooms and the games\' Join on the games', () => {
    expect(launchScreen('join', false)).toBe('editor');
    expect(launchScreen('games_join', false)).toBe('games');
  });

  it('starts a new edit whatever the surface when something was launched on', () => {
    expect(launchScreen('entry_point_join', true)).toBe('start');
  });
});
