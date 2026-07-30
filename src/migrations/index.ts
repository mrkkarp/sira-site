import * as migration_20260730_132922_initial from './20260730_132922_initial';

export const migrations = [
  {
    up: migration_20260730_132922_initial.up,
    down: migration_20260730_132922_initial.down,
    name: '20260730_132922_initial'
  },
];
