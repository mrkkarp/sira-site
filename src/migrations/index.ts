import * as migration_20260730_132922_initial from './20260730_132922_initial';
import * as migration_20260801_150554_add_specs_connection from './20260801_150554_add_specs_connection';
import * as migration_20260803_122827_add_media_kind from './20260803_122827_add_media_kind';

export const migrations = [
  {
    up: migration_20260730_132922_initial.up,
    down: migration_20260730_132922_initial.down,
    name: '20260730_132922_initial',
  },
  {
    up: migration_20260801_150554_add_specs_connection.up,
    down: migration_20260801_150554_add_specs_connection.down,
    name: '20260801_150554_add_specs_connection',
  },
  {
    up: migration_20260803_122827_add_media_kind.up,
    down: migration_20260803_122827_add_media_kind.down,
    name: '20260803_122827_add_media_kind'
  },
];
