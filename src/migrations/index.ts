import * as migration_20260730_132922_initial from './20260730_132922_initial';
import * as migration_20260801_150554_add_specs_connection from './20260801_150554_add_specs_connection';
import * as migration_20260803_122827_add_media_kind from './20260803_122827_add_media_kind';
import * as migration_20260804_124500_add_lead_qualification from './20260804_124500_add_lead_qualification';
import * as migration_20261014_120000_add_specs_wall_thickness_volume from './20261014_120000_add_specs_wall_thickness_volume';

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
  {
    up: migration_20260804_124500_add_lead_qualification.up,
    down: migration_20260804_124500_add_lead_qualification.down,
    name: '20260804_124500_add_lead_qualification'
  },
  {
    up: migration_20261014_120000_add_specs_wall_thickness_volume.up,
    down: migration_20261014_120000_add_specs_wall_thickness_volume.down,
    name: '20261014_120000_add_specs_wall_thickness_volume'
  },
];
