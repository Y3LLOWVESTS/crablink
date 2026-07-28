import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function read(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

const app = read('src/app/TvApp.jsx');
const homePanel = read('src/catalog/TvHomeCatalogPanel.jsx');
const creatorBrowsePanel = read('src/catalog/TvCreatorBrowsePanel.jsx');
const creatorProfilePanel = read('src/catalog/TvCreatorProfilePanel.jsx');
const catalogModel = read('src/catalog/tvCatalogModel.js');
const routeHandoff = read('src/catalog/tvCatalogRouteHandoff.js');
const thumbnailModel = read('src/catalog/tvCatalogThumbnailModel.js');
const creatorBrowseModel = read('src/catalog/tvCreatorBrowseModel.js');
const creatorProfileModel = read('src/catalog/tvCreatorProfileModel.js');
const creatorProfileFocusModel = read('src/catalog/tvCreatorProfileFocusModel.js');

const phase8Executable =
  stripComments(
    [
      homePanel,
      creatorBrowsePanel,
      creatorProfilePanel,
      catalogModel,
      routeHandoff,
      thumbnailModel,
      creatorBrowseModel,
      creatorProfileModel,
      creatorProfileFocusModel,
    ].join('\n'),
  );

test('Phase 8 Home catalog surfaces are wired through the TV app', () => {
  for (const fragment of [
    'useTvHomeCatalog',
    'TvHomeCatalogPanel',
    'projectTvCatalogCardRouteHandoff',
    'useTvCreatorBrowse',
    'TvCreatorBrowsePanel',
    'projectTvCreatorProfile',
    'TvCreatorProfilePanel',
    'creatorProfileFocusRequest',
    'focusRequest={creatorProfileFocusRequest}',
  ]) {
    assert.equal(app.includes(fragment), true, `${fragment} missing`);
  }
});

test('Phase 8 Home catalog model stack owns catalog, thumbnails, creator browse, profile, and focus', () => {
  for (const [label, source, fragments] of [
    ['catalog model', catalogModel, ['TV_CATALOG_SCHEMA', 'normalizeThumbnail', 'thumbnailCrabUrl', 'projectTvCatalogResponse']],
    ['route handoff', routeHandoff, ['TV_CATALOG_CARD_HANDOFF_KIND', 'projectTvCatalogCardRouteHandoff', "reviewed.owner === 'site'"]],
    ['thumbnail model', thumbnailModel, ['TV_CATALOG_THUMBNAIL_SCHEMA', 'projectTvCatalogThumbnail', "reviewed.assetKind !== 'image'"]],
    ['creator browse model', creatorBrowseModel, ['TV_CREATOR_BROWSE_SCHEMA', 'projectTvCreatorBrowseFromCatalog', 'searchTvCreatorBrowse']],
    ['creator profile model', creatorProfileModel, ['TV_CREATOR_PROFILE_SCHEMA', 'projectTvCreatorProfile', "reviewed.owner !== 'site'"]],
    ['creator profile focus model', creatorProfileFocusModel, ['TV_CREATOR_PROFILE_FOCUS_SCHEMA', 'createTvCreatorProfileFocusRequest', 'SAFE_FOCUS_KEY']],
  ]) {
    for (const fragment of fragments) {
      assert.equal(source.includes(fragment), true, `${label} missing ${fragment}`);
    }
  }
});

test('Phase 8 Home catalog executable surfaces do not add forbidden authority', () => {
  for (const pattern of [
    /\binvoke\s*\(/u,
    /\bfetch\s*\(/u,
    /\bsetInterval\s*\(/u,
    /\bsetTimeout\s*\(/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
    /tv_creator_profile_read/u,
    /tv_catalog_write/u,
    /\bwallet\b/iu,
    /\bledger\b/iu,
    /\bfinality\b/iu,
  ]) {
    assert.doesNotMatch(
      phase8Executable,
      pattern,
      `Phase 8 executable contains ${pattern}`,
    );
  }
});

test('Phase 8 Home catalog package acceptance includes every focused slice', () => {
  const packageJson = JSON.parse(read('package.json'));
  const scripts = packageJson.scripts ?? {};

  for (const scriptName of [
    'test:catalog-model',
    'test:catalog-route-handoff',
    'test:home-catalog-react',
    'test:catalog-thumbnail',
    'test:creator-browse',
    'test:creator-browse-react',
    'test:creator-profile',
    'test:creator-profile-react',
    'test:creator-profile-focus',
    'test:creator-profile-acceptance',
  ]) {
    assert.equal(Object.hasOwn(scripts, scriptName), true, `${scriptName} missing`);
  }
});
