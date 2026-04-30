const HASH_RE = /^[0-9a-f]{64}$/;
const B3_RE = /^b3:([0-9a-f]{64})$/;
const CRAB_ASSET_RE = /^crab:\/\/([0-9a-f]{64})\.([a-z][a-z0-9_-]*)$/;
const CRAB_SITE_RE = /^crab:\/\/([a-zA-Z0-9][a-zA-Z0-9._-]{0,127})$/;

export function normalizeCrabInput(input) {
  const value = String(input || '').trim();

  if (!value) {
    throw new Error('Enter a crab:// URL, b3 CID, or raw 64-character hash.');
  }

  const crabAsset = value.match(CRAB_ASSET_RE);
  if (crabAsset) {
    return {
      type: 'asset',
      hash: crabAsset[1],
      kind: crabAsset[2],
      url: value
    };
  }

  const crabSite = value.match(CRAB_SITE_RE);
  if (crabSite) {
    return {
      type: 'site',
      name: crabSite[1],
      url: value
    };
  }

  const b3 = value.match(B3_RE);
  if (b3) {
    return {
      type: 'asset',
      hash: b3[1],
      kind: 'image',
      url: `crab://${b3[1]}.image`
    };
  }

  if (HASH_RE.test(value)) {
    return {
      type: 'asset',
      hash: value,
      kind: 'image',
      url: `crab://${value}.image`
    };
  }

  if (value.startsWith('crab://')) {
    return {
      type: 'crab',
      url: value
    };
  }

  throw new Error('Invalid CrabLink input.');
}
