import { test, expect } from 'vitest';
import { advise, allow, deny, sideEffect } from '../../src/runtime/result-helpers';

test('advise() produces correct shape', () =>
  expect(advise('hello')).toEqual({ kind: 'advise', message: 'hello' }));
test('allow() produces correct shape', () =>
  expect(allow()).toEqual({ kind: 'allow' }));
test('deny() includes reason', () =>
  expect(deny('no way')).toEqual({ kind: 'deny', reason: 'no way' }));
test('sideEffect() produces correct shape', () =>
  expect(sideEffect()).toEqual({ kind: 'side-effect' }));
