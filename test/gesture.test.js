const test = require('node:test');
const assert = require('node:assert/strict');
const gesture = require('../gesture.js');

const path = (...coords) => coords.map(([x, y]) => ({ x, y }));
const on = (strokes) => ({ enabled: true, strokes });
const off = (strokes) => ({ enabled: false, strokes });

const gestures = { back: on('L'), reload: on('UD'), reopenTab: on('DL'), closeTab: off('D') };

test('toDirections ignores movement shorter than the stroke threshold', () => {
  assert.equal(gesture.toDirections(path([0, 0], [5, 3], [10, -4])), '');
  assert.equal(gesture.toDirections(path([0, 0])), '');
});

test('toDirections quantizes diagonal movement to the dominant axis', () => {
  assert.equal(gesture.toDirections(path([0, 0], [-50, 20])), 'L');
  assert.equal(gesture.toDirections(path([0, 0], [10, 40])), 'D');
});

test('toDirections merges consecutive strokes in the same direction', () => {
  assert.equal(gesture.toDirections(path([0, 0], [0, 30], [2, 60], [-1, 90], [40, 92], [80, 95])), 'DR');
});

test('commandFor maps enabled gestures and rejects unknown or disabled ones', () => {
  assert.equal(gesture.commandFor('L', gestures), 'back');
  assert.equal(gesture.commandFor('UD', gestures), 'reload');
  assert.equal(gesture.commandFor('DL', gestures), 'reopenTab');
  assert.equal(gesture.commandFor('D', gestures), null);
  assert.equal(gesture.commandFor('LR', gestures), null);
  assert.equal(gesture.commandFor('', gestures), null);
});

test('validateGestures accepts distinct gestures and ignores disabled ones', () => {
  assert.deepEqual(gesture.validateGestures({ back: on('L'), forward: on('R'), reload: off(''), closeTab: off('L') }), []);
});

test('validateGestures rejects empty, duplicate, repeated, and long gestures', () => {
  assert.equal(gesture.validateGestures({ back: on('') }).length, 1);
  assert.equal(gesture.validateGestures({ back: on('L'), forward: on('L') }).length, 1);
  assert.equal(gesture.validateGestures({ back: on('LL') }).length, 1);
  assert.equal(gesture.validateGestures({ back: on('LRLR') }).length, 1);
});

test('formatDirections renders arrows', () => {
  assert.equal(gesture.formatDirections('DR'), '↓→');
});
