import { describe, expect, it } from 'vitest';

import type { RoomMember } from '@/editor/room';

import { joinTargetKey, joinTargets } from './counts';


function member(user_id: string, fields: Partial<RoomMember> = {}): RoomMember {
  return {user_id, username: `user${user_id}`, avatar_url: null, ...fields};
}


describe('joinTargets', () => {
  it('lists the others in a lobby or a game room, never you', () => {
    const targets = joinTargets([
      member('1', {editing: 'lobby1'}),
      member('2', {playing: {game_id: 'room1', game: 'letter_trail'}}),
      member('3', {screen: 'editor'}),
      member('4', {screen: null}),
      member('9', {editing: 'lobby2'}),
    ], '9');
    expect(targets.map(joinTargetKey)).toEqual(['editor:lobby1', 'game:room1']);
    expect(targets[1]).toMatchObject({kind: 'game', gameId: 'room1', game: 'letter_trail'});
  });

  it('lists a room once, the busiest first', () => {
    const targets = joinTargets([
      member('1', {editing: 'lobby1'}),
      member('2', {playing: {game_id: 'room1', game: 'flag_guesser'}}),
      member('3', {playing: {game_id: 'room1', game: 'flag_guesser'}}),
    ], null);
    expect(targets.map(joinTargetKey)).toEqual(['game:room1', 'editor:lobby1']);
    expect(targets[0].member.user_id).toBe('2');
  });

  it('skips a game this client has never heard of', () => {
    expect(joinTargets([member('1', {playing: {game_id: 'room1', game: 'chess'}})], null)).toEqual([]);
  });

  it('puts the room of whose Join it was first, with their row', () => {
    const members = [
      member('1', {editing: 'lobby1'}),
      member('2', {editing: 'lobby1'}),
      member('3', {playing: {game_id: 'room1', game: 'letter_trail'}}),
      member('4', {playing: {game_id: 'room2', game: 'flag_guesser'}}),
      member('5', {playing: {game_id: 'room2', game: 'flag_guesser'}}),
    ];
    // the quietest room goes first
    expect(joinTargets(members, null, '3').map(joinTargetKey)).toEqual(['game:room1', 'editor:lobby1', 'game:room2']);
    // someone else in their room was listed before them: the row is theirs
    const [ target ] = joinTargets(members, null, '2');
    expect(joinTargetKey(target)).toBe('editor:lobby1');
    expect(target.member.user_id).toBe('2');
  });

  it('keeps the usual order when whose Join it was is in no room, or is you', () => {
    const members = [
      member('1', {editing: 'lobby1'}),
      member('2', {playing: {game_id: 'room1', game: 'letter_trail'}}),
      member('3', {playing: {game_id: 'room1', game: 'letter_trail'}}),
      member('4', {screen: 'games'}),
    ];
    const usual = joinTargets(members, null).map(joinTargetKey);
    expect(joinTargets(members, null, '4').map(joinTargetKey)).toEqual(usual);
    expect(joinTargets(members, null, '9').map(joinTargetKey)).toEqual(usual);
    expect(joinTargets(members, '1', '1').map(joinTargetKey)).toEqual(['game:room1']);
  });

  it('takes the lobby when a member is in both (two tabs)', () => {
    const [ target ] = joinTargets([member('1', {editing: 'lobby1', playing: {game_id: 'room1', game: 'letter_trail'}})], null);
    expect(joinTargetKey(target)).toBe('editor:lobby1');
  });
});
