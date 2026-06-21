import assert from 'node:assert/strict';
import test from 'node:test';
import { GuildPlayer } from '../src/music/PlayerManager.js';

test('volume is clamped to Discord resource limits', () => {
  const player = new GuildPlayer('volume-test');

  player.setVolume(2);
  assert.equal(player.volume, 1);

  player.setVolume(-1);
  assert.equal(player.volume, 0);

  player.disconnect();
});

test('playback controls reject invalid states', () => {
  const player = new GuildPlayer('controls-test');

  assert.throws(() => player.pause(), /Nothing is currently playing/);
  assert.throws(() => player.resume(), /Playback is not paused/);
  assert.throws(() => player.skip(), /Nothing is currently playing/);

  player.disconnect();
});

test('disconnect clears transient playback state', () => {
  const player = new GuildPlayer('disconnect-test');
  player.queue.push({ title: 'Queued track' });
  player.history.push({ title: 'Old track' });
  player.current = { title: 'Current track' };
  player.status = 'playing';

  player.disconnect();

  assert.deepEqual(player.queue, []);
  assert.deepEqual(player.history, []);
  assert.equal(player.current, null);
  assert.equal(player.currentResource, null);
  assert.equal(player.status, 'idle');
});
