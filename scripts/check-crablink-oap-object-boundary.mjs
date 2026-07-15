import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const rustPath =
  'apps/crablink-tauri/src-tauri/src/commands/oap_object.rs';
const libPath =
  'apps/crablink-tauri/src-tauri/src/lib.rs';
const modPath =
  'apps/crablink-tauri/src-tauri/src/commands/mod.rs';

const failures = [];

function read(relative) {
  return readFileSync(join(root, relative), 'utf8');
}

function need(relative, source, tokens) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(
        `${relative} is missing ${JSON.stringify(token)}`,
      );
    }
  }
}

for (const relative of [rustPath, libPath, modPath]) {
  if (!existsSync(join(root, relative))) {
    failures.push(`missing required file: ${relative}`);
  }
}

if (failures.length === 0) {
  const rust = read(rustPath);
  const lib = read(libPath);
  const mod = read(modPath);

  need(rustPath, rust, [
    'MAX_OAP_FRAME_BYTES: usize = 1024 * 1024',
    'MAX_OAP_CHUNK_BYTES: usize = 64 * 1024',
    'MAX_OAP_OBJECT_BYTES: usize = 4 * 1024 * 1024',
    'OBJ_GET_APP_PROTO_ID: u16 = 0x0101',
    'FLAG_REQ | FLAG_START | FLAG_END',
    'application/oap',
    '/oap/obj-get',
    'verify_oap_object_stream',
    'OAP full BLAKE3 digest mismatch',
    'local OAP storageBaseUrl must remain loopback-only',
    'policy_mutation: false',
    'persistence_mutation: false',
    'provider_mutation: false',
    'wallet_mutation: false',
    'ledger_mutation: false',
    'confirmed_roc: None',
  ]);

  need(modPath, mod, [
    'pub mod oap_object;',
  ]);

  need(libPath, lib, [
    'commands::oap_object::service_node_oap_object_fetch',
  ]);
}

function walk(directory) {
  const output = [];

  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry);
    const stats = statSync(absolute);

    if (stats.isDirectory()) {
      output.push(...walk(absolute));
    } else if (
      entry.endsWith('.js') ||
      entry.endsWith('.jsx') ||
      entry.endsWith('.ts') ||
      entry.endsWith('.tsx')
    ) {
      output.push(absolute);
    }
  }

  return output;
}

const frontendRoot = join(
  root,
  'apps/crablink-tauri/src',
);

if (existsSync(frontendRoot)) {
  for (const file of walk(frontendRoot)) {
    const source = readFileSync(file, 'utf8');

    if (
      source.includes('/oap/obj-get') ||
      source.includes('application/oap')
    ) {
      failures.push(
        `${file.slice(root.length + 1)} directly handles OAP; ` +
          'OAP wire behavior must remain inside Tauri Rust',
      );
    }
  }
}

if (failures.length > 0) {
  console.error(
    'CrabLink OAP object boundary check failed:',
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  'CrabLink native OAP object boundary check passed.',
);

console.log(
  'OAP wire parsing remains Rust-only, loopback-bounded, ' +
    'frame/chunk/object-limited, and full-BLAKE3 verified.',
);
