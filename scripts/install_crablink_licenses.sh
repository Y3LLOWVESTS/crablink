#!/usr/bin/env bash
# RO:WHAT — Installs CrabLink dual-license, attribution, and experimental-use notices.
# RO:WHY — Makes licensing and project-risk disclosures consistent across CrabLink packages, apps, extensions, and the Tauri Rust crate.
# RO:INTERACTS — package.json, Cargo.toml, apps/, packages/, extensions/, LICENSE*, NOTICE, DISCLAIMER.md.
# RO:INVARIANTS — Dry-run by default; no third-party/vendor/target traversal; backups before manifest edits.
# RO:SECURITY — Does not execute package code, download files, or inspect secrets.
# RO:TEST — bash -n; dry-run; cargo metadata after apply.

set -euo pipefail

PROGRAM_NAME="$(basename "$0")"
AUTHOR="Stevan White"
COPYRIGHT_YEARS="2026"
SPDX_EXPRESSION="MIT OR Apache-2.0"
MODE="dry-run"
UPDATE_MANIFESTS=1
UPDATE_NPM_MANIFESTS=1

usage() {
  cat <<USAGE
Usage:
  bash scripts/${PROGRAM_NAME} [--dry-run | --apply] [--files-only]

Options:
  --dry-run    Show what would change without writing anything. This is the default.
  --apply      Write license/notice files and update first-party Cargo and npm package metadata.
  --files-only Write only LICENSE, LICENSE-MIT, LICENSE-APACHE, NOTICE, and DISCLAIMER.md.
  --help       Show this help text.

Run from the CrabLink repository root, or save this script under CrabLink/scripts/.

Recommended:
  bash scripts/${PROGRAM_NAME} --dry-run
  bash scripts/${PROGRAM_NAME} --apply
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      MODE="dry-run"
      ;;
    --apply)
      MODE="apply"
      ;;
    --files-only)
      UPDATE_MANIFESTS=0
      UPDATE_NPM_MANIFESTS=0
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      printf 'error: unknown argument: %s\n\n' "$arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

find_repo_root() {
  local script_dir current
  script_dir="$(cd "$(dirname "$0")" && pwd -P)"

  for current in "$PWD" "$script_dir" "$script_dir/.."; do
    current="$(cd "$current" 2>/dev/null && pwd -P)" || continue
    if [[ -f "$current/package.json" ]] && \
       [[ -d "$current/apps/crablink-tauri" || -d "$current/extensions/chrome" || -d "$current/packages" ]]; then
      printf '%s\n' "$current"
      return 0
    fi
  done

  return 1
}

if ! REPO_ROOT="$(find_repo_root)"; then
  printf '%s\n' "error: could not locate the CrabLink repository root." >&2
  printf '%s\n' "Expected package.json plus apps/crablink-tauri, extensions/chrome, or packages/ in the current directory or above this script." >&2
  exit 1
fi

cd "$REPO_ROOT"

if [[ ! -f package.json ]]; then
  printf '%s\n' "error: $REPO_ROOT does not look like the CrabLink workspace." >&2
  exit 1
fi

TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/crablink-license.XXXXXX")"
cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT INT TERM

TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
BACKUP_ROOT="$REPO_ROOT/.license-backups/$TIMESTAMP"
CHANGED_COUNT=0
UNCHANGED_COUNT=0
MANIFEST_CHANGED_COUNT=0
MANIFEST_SKIPPED_COUNT=0
NPM_MANIFEST_CHANGED_COUNT=0
NPM_MANIFEST_SKIPPED_COUNT=0
BACKED_UP_COUNT=0
TARGET_COUNT=0

log_change() {
  printf '[change] %s\n' "$1"
}

log_same() {
  printf '[same]   %s\n' "$1"
}

log_warn() {
  printf '[warn]   %s\n' "$1" >&2
}

write_if_changed() {
  local source_file destination_file relative
  source_file="$1"
  destination_file="$2"
  relative="${destination_file#"$REPO_ROOT"/}"

  if [[ -f "$destination_file" ]] && cmp -s "$source_file" "$destination_file"; then
    log_same "$relative"
    UNCHANGED_COUNT=$((UNCHANGED_COUNT + 1))
    return 0
  fi

  log_change "$relative"
  CHANGED_COUNT=$((CHANGED_COUNT + 1))

  if [[ "$MODE" == "apply" ]]; then
    if [[ -f "$destination_file" ]]; then
      local backup_file
      backup_file="$BACKUP_ROOT/$relative"
      mkdir -p "$(dirname "$backup_file")"
      cp "$destination_file" "$backup_file"
      BACKED_UP_COUNT=$((BACKED_UP_COUNT + 1))
    fi
    mkdir -p "$(dirname "$destination_file")"
    cp "$source_file" "$destination_file"
    chmod 0644 "$destination_file"
  fi
}

render_license_selector() {
  local output="$1"
  cat > "$output" <<EOF
CrabLink Dual-License Selection Notice

Copyright (c) ${COPYRIGHT_YEARS} ${AUTHOR}

This project, including its source code, tests, examples, configuration files,
documentation, internal notes, architectural blueprints, and other associated
materials, is licensed, at your option, under either:

1. the Apache License, Version 2.0, contained in LICENSE-APACHE; or
2. the MIT License, contained in LICENSE-MIT.

SPDX-License-Identifier: ${SPDX_EXPRESSION}

You may select either license when using, copying, modifying, or distributing
the covered materials. You do not need to comply with both licenses
simultaneously.

The complete and controlling license terms are contained in LICENSE-APACHE and
LICENSE-MIT.

Project attribution and development-assistance disclosures appear in NOTICE.
Important experimental-use, documentation, ROC, and ROX disclaimers appear in
DISCLAIMER.md.

Neither NOTICE nor DISCLAIMER.md adds restrictions to, expands, replaces, or
modifies the permissions and obligations granted by the MIT License or the
Apache License, Version 2.0. If an explanatory statement conflicts with a
license, the applicable license text controls.

Files and third-party components containing a different license notice remain
subject to their respective licenses.
EOF
}

render_mit_license() {
  local output="$1"
  cat > "$output" <<EOF
MIT License

Copyright (c) ${COPYRIGHT_YEARS} ${AUTHOR}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
}

render_apache_license() {
  local output="$1"
  cat > "$output" <<'EOF'
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright [yyyy] [name of copyright owner]

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
EOF
}

render_notice() {
  local output="$1"
  local package_label="$2"
  cat > "$output" <<EOF
CrabLink / ${package_label}
Copyright (c) ${COPYRIGHT_YEARS} ${AUTHOR}

PROJECT CREATION AND LEADERSHIP

CrabLink and its associated applications, packages, and extensions were
conceived, initiated, directed, architected, integrated, tested, and maintained
under the leadership of
${AUTHOR}.

${AUTHOR} is the project creator and principal human author, designer,
maintainer, and decision-maker. Final decisions concerning project direction,
architecture, inclusion of generated material, integration, testing, and
publication are made by the project maintainer or other authorized human
contributors.

DEVELOPMENT-ASSISTANCE DISCLOSURE

Development of this project has made extensive use of artificial-intelligence
assistance.

ChatGPT, provided by OpenAI, supplied the overwhelming majority of the
AI-assisted development support. That assistance has included substantial help
with software drafting, implementation planning, code generation, debugging,
code review, documentation, test design, architectural analysis, and refinement
of project materials.

Grok, provided by xAI, and Gemini, provided by Google, supplied smaller and more
limited amounts of additional assistance, including occasional review,
analysis, suggestions, and drafting support.

AI-generated or AI-assisted material was used as development input. Such
material may have been selected, modified, combined, rejected, rewritten,
tested, or integrated by the project maintainer. The presence of AI assistance
does not imply that any AI provider reviewed, approved, certified, sponsored,
or endorsed this project or any release of it.

References to ChatGPT, OpenAI, Grok, xAI, Gemini, or Google are provided solely
for transparent attribution of development assistance. All names, trademarks,
and service marks remain the property of their respective owners.

CONTRIBUTOR ATTRIBUTION

Additional human contributors retain attribution for their respective
contributions where identified in source history, contribution records,
copyright notices, or accompanying documentation.

This NOTICE is informational and attributional only. It does not modify the MIT
License or the Apache License, Version 2.0, and it imposes no additional
condition or restriction on the exercise of rights granted by either license.
EOF
}

render_disclaimer() {
  local output="$1"
  cat > "$output" <<'EOF'
# Experimental Software and Project-Materials Disclaimer

## 1. Experimental status

CrabLink and its associated applications, packages, extensions, Rust crates,
tools, tests, configurations, documentation, and supporting materials are
experimental works
under active development.

They may contain incomplete features, defects, security vulnerabilities,
incorrect assumptions, incompatible changes, undocumented behavior, data-loss
risks, performance limitations, or other errors.

No component should be assumed to be production-ready, security-audited,
fault-tolerant, legally compliant, economically reliable, or suitable for
handling sensitive, valuable, safety-critical, or mission-critical data unless
that component has been separately reviewed and expressly designated for such
use.

## 2. No guarantees

The project is provided on an "AS IS" and "AS AVAILABLE" basis.

No representation, warranty, promise, or guarantee is made concerning:

- correctness, completeness, accuracy, or reliability;
- security, privacy, confidentiality, or resistance to attack;
- availability, uptime, durability, or fault tolerance;
- preservation, recovery, or integrity of data;
- compatibility with any platform, service, protocol, or future release;
- economic behavior, balances, receipts, pricing, rewards, settlement, or
  accounting results;
- fitness for a particular purpose;
- merchantability or noninfringement;
- regulatory, contractual, or legal compliance;
- implementation of any roadmap item, planned feature, or architectural idea;
- absence of defects, vulnerabilities, or harmful behavior.

The warranty disclaimers and liability limitations in the selected MIT or
Apache-2.0 license remain controlling.

## 3. ROC and ROX experimental-use notice

ROC is an experimental internal, in-project utility and accounting unit used to
test and demonstrate access-control, creator, storage, service, reward, receipt,
and other software flows inside the RustyOnions and CrabLink environment.

ROX is a future or deferred project concept and is not part of the current
CrabLink runtime unless a later release expressly and unambiguously states
otherwise.

ROC and ROX are intended for experimental, demonstrative, creative, game-like,
and entertainment use. Neither ROC nor ROX is offered or represented as:

- an investment, security, share, bond, deposit, or collective investment;
- legal tender, sovereign currency, a bank account, or insured stored value;
- an ownership interest, equity interest, debt claim, or right to project
  revenue, assets, governance, or profits;
- a promise of appreciation, yield, income, dividends, staking returns, or any
  other financial return;
- a guarantee of access, service availability, permanence, redemption, or
  convertibility.

ROC and ROX have no guaranteed cash value, market value, exchange value,
liquidity, transferability, convertibility, or redemption right. No person is
promised that either unit will be listed, traded, bridged, externally settled,
redeemed, repurchased, or accepted by any third party.

Project documentation, examples, test balances, grants, prices, receipts,
rewards, and economic simulations must not be interpreted as an invitation to
invest or as a representation that real-world monetary value exists or will
develop.

Users and contributors must not market ROC or ROX as an investment or make
promises of profit, appreciation, liquidity, exchange listing, redemption, or
external settlement on behalf of the project.

Any future change that would permit public sale, external trading, redemption,
convertibility, bridging, staking, liquidity, investment-like promotion, or
real-world financial rights requires separate written terms, risk disclosures,
technical review, and review for applicable legal and regulatory requirements.
No current note, blueprint, roadmap, test, or source-code path authorizes such a
change.

## 4. Notes, blueprints, and internal build materials

Project notes, internal blueprints, architectural documents, roadmaps,
carry-over notes, design sketches, code comments, examples, diagrams,
benchmarks, test plans, threat models, specifications marked as drafts, and
other planning materials are working build materials.

These materials document reasoning, experiments, proposals, assumptions, and
development paths used while building the project. They are not necessarily
statements of established fact.

Unless a document is expressly identified as a locked normative specification
and is matched by implemented and validated behavior, such materials:

- may be incomplete, speculative, outdated, superseded, or incorrect;
- may describe future or deferred functionality that does not exist;
- may include illustrative values, estimates, placeholders, or proposed
  interfaces;
- may conflict with later code, tests, documentation, or project decisions;
- do not guarantee that a feature will be implemented or released;
- do not constitute certification, security assurance, professional advice, or
  a promise of future performance.

The running code and its verified behavior may differ from planning documents.
Users and contributors must independently inspect the applicable source code,
release notes, tests, configuration, and deployed environment.

## 5. Tests, demonstrations, and benchmarks

Passing tests, successful demonstrations, green continuous-integration results,
example deployments, or benchmark results show only that specific conditions
were observed in a particular environment.

They do not prove that the software is free from defects, secure under all
conditions, suitable for production, or capable of meeting any particular
service level.

Performance measurements may vary materially across hardware, operating
systems, configurations, workloads, network conditions, dependency versions,
and test methodologies.

## 6. Artificial-intelligence-assisted material

Substantial portions of the project have been created or refined with
artificial-intelligence assistance.

AI-assisted output can contain subtle errors, fabricated assumptions, insecure
patterns, outdated information, incomplete reasoning, licensing issues, or
behavior that differs from its description. AI-assisted material must be
treated as untrusted development input until independently reviewed, tested,
and accepted by a responsible human maintainer.

No AI provider guarantees, certifies, endorses, or assumes responsibility for
the project.

## 7. User responsibility

Anyone using, modifying, deploying, or distributing the project is responsible
for conducting their own:

- code review and security assessment;
- dependency and supply-chain review;
- legal and regulatory evaluation;
- threat modeling and privacy review;
- compatibility and performance testing;
- backup, recovery, and incident-response planning;
- validation of economic, accounting, wallet, ledger, token, or settlement
  behavior;
- determination of suitability for the intended environment.

Users should maintain independent backups and should not rely on experimental
software as the sole custodian of important information, credentials, keys,
funds, receipts, or other valuable state.

## 8. No professional advice

Project materials do not constitute legal, financial, investment, tax,
accounting, medical, cybersecurity, regulatory, or other professional advice.

References to tokens, accounting, wallets, payments, rewards, receipts,
settlement, cryptography, privacy, security, governance, or compliance are
technical development materials and should not be treated as professional
assurances or recommendations.

## 9. Third-party software and services

Third-party libraries, tools, models, services, media, and other components
remain subject to their respective licenses, terms, notices, policies, and
warranties.

The project's MIT/Apache-2.0 licensing does not override the license of any
third-party component.

## 10. Relationship to the licenses

This document explains project status and risk. It does not impose an
additional use restriction and does not modify, narrow, or replace the rights
granted under the MIT License or the Apache License, Version 2.0.

Where this document conflicts with the selected license, the selected license
controls.
EOF
}

extract_package_name() {
  local manifest="$1"
  awk '
    BEGIN { in_package = 0 }
    /^[[:space:]]*\[package\][[:space:]]*$/ { in_package = 1; next }
    /^[[:space:]]*\[/ { if (in_package) exit }
    in_package && /^[[:space:]]*name[[:space:]]*=/ {
      line = $0
      sub(/^[^=]*=[[:space:]]*/, "", line)
      gsub(/^[[:space:]]*"|"[[:space:]]*$/, "", line)
      print line
      exit
    }
  ' "$manifest"
}

render_static_templates() {
  render_license_selector "$TMP_ROOT/LICENSE"
  render_mit_license "$TMP_ROOT/LICENSE-MIT"
  render_apache_license "$TMP_ROOT/LICENSE-APACHE"
  render_disclaimer "$TMP_ROOT/DISCLAIMER.md"

  cat > "$TMP_ROOT/process_package_json.py" <<'PYJSON'
import json
import os
import shutil
import sys
from pathlib import Path

list_file = Path(sys.argv[1])
repo_root = Path(sys.argv[2])
mode = sys.argv[3]
backup_root = Path(sys.argv[4])
license_expression = sys.argv[5]
author = sys.argv[6]

for raw in list_file.read_text(encoding="utf-8").splitlines():
    if not raw.strip():
        continue
    source = Path(raw)
    relative = source.relative_to(repo_root)
    text = source.read_text(encoding="utf-8")
    newline = "\r\n" if "\r\n" in text else "\n"

    try:
        original = json.loads(text)
    except Exception as exc:
        print(f"skip\t{relative}\tinvalid-json:{exc.__class__.__name__}")
        continue

    if not isinstance(original, dict):
        print(f"skip\t{relative}\troot-not-object")
        continue

    data = dict(original)
    changed = False
    notes = []

    if data.get("license") == license_expression:
        notes.append("license-preserved")
    else:
        existed = "license" in data
        data["license"] = license_expression
        changed = True
        notes.append("license-replaced" if existed else "license-added")

    if "author" in data:
        notes.append("author-preserved")
    else:
        data["author"] = author
        changed = True
        notes.append("author-added")

    status = "change" if changed else "same"
    print(f"{status}\t{relative}\t{','.join(notes)}")

    if changed and mode == "apply":
        backup = backup_root / relative
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, backup)
        rendered = json.dumps(data, ensure_ascii=False, indent=2) + newline
        source.write_text(rendered, encoding="utf-8")
        os.chmod(source, 0o644)
PYJSON
}

update_manifest() {
  local manifest="$1"
  local relative backup_path result changed status
  relative="${manifest#"$REPO_ROOT"/}"
  backup_path="$BACKUP_ROOT/$relative"
  result="$TMP_ROOT/manifest.$$.tmp"

  status="$(python3 - "$manifest" "$result" "$SPDX_EXPRESSION" "$AUTHOR" <<'PY'
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
destination = Path(sys.argv[2])
license_expression = sys.argv[3]
author = sys.argv[4]

text = source.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)

section_re = re.compile(r"^\s*\[([^\]]+)\]\s*(?:#.*)?$")
key_re = re.compile(r"^\s*([A-Za-z0-9_.-]+)\s*=")

sections = []
for index, line in enumerate(lines):
    match = section_re.match(line.rstrip("\r\n"))
    if match:
        sections.append((index, match.group(1).strip()))

package_start = None
package_end = None
for position, (index, name) in enumerate(sections):
    if name == "package":
        package_start = index
        package_end = sections[position + 1][0] if position + 1 < len(sections) else len(lines)
        break

if package_start is None:
    destination.write_text(text, encoding="utf-8")
    print("skip:no-package-section")
    raise SystemExit(0)

license_line = None
license_workspace_line = None
license_file_line = None
authors_line = None
authors_workspace_line = None

for index in range(package_start + 1, package_end):
    match = key_re.match(lines[index])
    if not match:
        continue
    key = match.group(1)
    if key == "license":
        license_line = index
    elif key == "license.workspace":
        license_workspace_line = index
    elif key in {"license-file", "license_file"}:
        license_file_line = index
    elif key == "authors":
        authors_line = index
    elif key == "authors.workspace":
        authors_workspace_line = index

changed = False
notes = []

if license_file_line is not None and license_line is None and license_workspace_line is None:
    notes.append("license-file-present")
elif license_workspace_line is not None:
    notes.append("license-inherited")
elif license_line is not None:
    newline = "\r\n" if lines[license_line].endswith("\r\n") else "\n"
    desired = f'license = "{license_expression}"{newline}'
    if lines[license_line] != desired:
        lines[license_line] = desired
        changed = True
        notes.append("license-replaced")
else:
    newline = "\r\n" if any(line.endswith("\r\n") for line in lines) else "\n"
    lines.insert(package_start + 1, f'license = "{license_expression}"{newline}')
    package_end += 1
    changed = True
    notes.append("license-added")

# Preserve existing author lists and workspace inheritance. Add Stevan only when
# the package currently has no authors metadata.
if authors_line is not None:
    notes.append("authors-preserved")
elif authors_workspace_line is not None:
    notes.append("authors-inherited")
else:
    # Recalculate insertion point because the license insertion may have shifted it.
    insertion = package_start + 1
    if insertion < len(lines) and re.match(r'^\s*license\s*=', lines[insertion]):
        insertion += 1
    newline = "\r\n" if any(line.endswith("\r\n") for line in lines) else "\n"
    escaped_author = author.replace("\\", "\\\\").replace('"', '\\"')
    lines.insert(insertion, f'authors = ["{escaped_author}"]{newline}')
    changed = True
    notes.append("authors-added")

updated = "".join(lines)
destination.write_text(updated, encoding="utf-8")
print(("changed:" if changed else "same:") + ",".join(notes))
PY
)"

  case "$status" in
    skip:*)
      log_warn "$relative not changed ($status)"
      MANIFEST_SKIPPED_COUNT=$((MANIFEST_SKIPPED_COUNT + 1))
      return 0
      ;;
    same:*)
      log_same "$relative ($status)"
      return 0
      ;;
    changed:*)
      log_change "$relative ($status)"
      MANIFEST_CHANGED_COUNT=$((MANIFEST_CHANGED_COUNT + 1))
      if [[ "$MODE" == "apply" ]]; then
        mkdir -p "$(dirname "$backup_path")"
        cp "$manifest" "$backup_path"
        cp "$result" "$manifest"
        chmod 0644 "$manifest"
      fi
      return 0
      ;;
    *)
      log_warn "$relative returned unexpected manifest status: $status"
      MANIFEST_SKIPPED_COUNT=$((MANIFEST_SKIPPED_COUNT + 1))
      return 0
      ;;
  esac
}

extract_npm_package_name() {
  local manifest="$1"
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8")).get("name", ""))' "$manifest" </dev/null 2>/dev/null || true
}

collect_cargo_manifests() {
  find "$REPO_ROOT" \
    \( -type d \( \
      -name target -o \
      -name node_modules -o \
      -name vendor -o \
      -name third_party -o \
      -name third-party -o \
      -name .git -o \
      -name dist -o \
      -name build -o \
      -name .vite -o \
      -name .tauri -o \
      -name junkyard -o \
      -name archive -o \
      -name archives -o \
      -name .license-backups \
    \) -prune \) -o \
    \( -type f -name Cargo.toml -print \)
}

collect_npm_manifests() {
  find "$REPO_ROOT" \
    \( -type d \( \
      -name target -o \
      -name node_modules -o \
      -name vendor -o \
      -name third_party -o \
      -name third-party -o \
      -name .git -o \
      -name dist -o \
      -name build -o \
      -name .vite -o \
      -name .tauri -o \
      -name junkyard -o \
      -name archive -o \
      -name archives -o \
      -name .license-backups \
    \) -prune \) -o \
    \( -type f -name package.json -print \)
}

collect_extension_dirs() {
  if [[ -d "$REPO_ROOT/extensions" ]]; then
    find "$REPO_ROOT/extensions" -mindepth 1 -maxdepth 1 -type d \
      ! -name node_modules ! -name target ! -name dist ! -name build -print
  fi
}

render_static_templates

printf 'CrabLink license installer\n'
printf 'Repository: %s\n' "$REPO_ROOT"
printf 'Mode:       %s\n' "$MODE"
printf 'Manifests:  %s\n\n' "$([[ "$UPDATE_MANIFESTS" -eq 1 ]] && printf 'update Cargo and npm package metadata' || printf 'files only')"

TARGET_DIRS_FILE="$TMP_ROOT/target-dirs.txt"
CARGO_MANIFESTS_FILE="$TMP_ROOT/cargo-manifests.txt"
NPM_MANIFESTS_FILE="$TMP_ROOT/npm-manifests.txt"

collect_cargo_manifests | LC_ALL=C sort -u > "$CARGO_MANIFESTS_FILE"
collect_npm_manifests | LC_ALL=C sort -u > "$NPM_MANIFESTS_FILE"
printf '%s\n' "$REPO_ROOT" > "$TARGET_DIRS_FILE"

while IFS= read -r manifest; do
  [[ -n "$manifest" ]] || continue
  dirname "$manifest"
done < "$CARGO_MANIFESTS_FILE" >> "$TARGET_DIRS_FILE"

while IFS= read -r manifest; do
  [[ -n "$manifest" ]] || continue
  dirname "$manifest"
done < "$NPM_MANIFESTS_FILE" >> "$TARGET_DIRS_FILE"

collect_extension_dirs >> "$TARGET_DIRS_FILE"
LC_ALL=C sort -u "$TARGET_DIRS_FILE" -o "$TARGET_DIRS_FILE"

while IFS= read -r target_dir; do
  [[ -n "$target_dir" ]] || continue
  TARGET_COUNT=$((TARGET_COUNT + 1))

  if [[ "$target_dir" == "$REPO_ROOT" ]]; then
    package_label="CrabLink workspace"
  elif [[ -f "$target_dir/Cargo.toml" ]]; then
    package_label="$(extract_package_name "$target_dir/Cargo.toml")"
    [[ -n "$package_label" ]] || package_label="$(basename "$target_dir")"
  elif [[ -f "$target_dir/package.json" ]]; then
    package_label="$(extract_npm_package_name "$target_dir/package.json")"
    [[ -n "$package_label" ]] || package_label="$(basename "$target_dir")"
  elif [[ "$target_dir" == "$REPO_ROOT/extensions/"* ]]; then
    package_label="CrabLink $(basename "$target_dir") extension"
  else
    package_label="$(basename "$target_dir")"
  fi

  render_notice "$TMP_ROOT/NOTICE.current" "$package_label"

  write_if_changed "$TMP_ROOT/LICENSE" "$target_dir/LICENSE"
  write_if_changed "$TMP_ROOT/LICENSE-MIT" "$target_dir/LICENSE-MIT"
  write_if_changed "$TMP_ROOT/LICENSE-APACHE" "$target_dir/LICENSE-APACHE"
  write_if_changed "$TMP_ROOT/NOTICE.current" "$target_dir/NOTICE"
  write_if_changed "$TMP_ROOT/DISCLAIMER.md" "$target_dir/DISCLAIMER.md"
done < "$TARGET_DIRS_FILE"

if [[ "$UPDATE_MANIFESTS" -eq 1 ]]; then
  printf '\nCargo package metadata:\n'
  cargo_found=0
  exec 3< "$CARGO_MANIFESTS_FILE"
  while IFS= read -r manifest <&3; do
    [[ -n "$manifest" ]] || continue
    cargo_found=1
    update_manifest "$manifest"
  done
  exec 3<&-
  if [[ "$cargo_found" -eq 0 ]]; then
    printf '[same]   no Cargo.toml files found\n'
  fi
fi

if [[ "$UPDATE_NPM_MANIFESTS" -eq 1 ]]; then
  printf '\nnpm package metadata:\n'
  NPM_REPORT_FILE="$TMP_ROOT/npm-report.txt"
  python3 "$TMP_ROOT/process_package_json.py" \
    "$NPM_MANIFESTS_FILE" "$REPO_ROOT" "$MODE" "$BACKUP_ROOT" \
    "$SPDX_EXPRESSION" "$AUTHOR" </dev/null > "$NPM_REPORT_FILE"

  while IFS=$'\t' read -r status relative notes; do
    [[ -n "$status" ]] || continue
    case "$status" in
      change)
        log_change "$relative (changed:$notes)"
        NPM_MANIFEST_CHANGED_COUNT=$((NPM_MANIFEST_CHANGED_COUNT + 1))
        ;;
      same)
        log_same "$relative (same:$notes)"
        ;;
      skip)
        log_warn "$relative not changed (skip:$notes)"
        NPM_MANIFEST_SKIPPED_COUNT=$((NPM_MANIFEST_SKIPPED_COUNT + 1))
        ;;
      *)
        log_warn "$relative returned unexpected npm manifest status: $status"
        NPM_MANIFEST_SKIPPED_COUNT=$((NPM_MANIFEST_SKIPPED_COUNT + 1))
        ;;
    esac
  done < "$NPM_REPORT_FILE"
fi

printf '\nSummary:\n'
printf '  Package/root directories scanned: %d\n' "$TARGET_COUNT"
printf '  Files that would change:          %d\n' "$CHANGED_COUNT"
printf '  Files already identical:          %d\n' "$UNCHANGED_COUNT"
printf '  Cargo manifests that would change:%d\n' "$MANIFEST_CHANGED_COUNT"
printf '  Cargo manifests skipped/warned:   %d\n' "$MANIFEST_SKIPPED_COUNT"
printf '  npm manifests that would change:  %d\n' "$NPM_MANIFEST_CHANGED_COUNT"
printf '  npm manifests skipped/warned:     %d\n' "$NPM_MANIFEST_SKIPPED_COUNT"
printf '  Existing files backed up on apply:%d\n' "$BACKED_UP_COUNT"

if [[ "$MODE" == "dry-run" ]]; then
  printf '\nDry-run complete. No files were written.\n'
  printf 'Apply with:\n  bash scripts/%s --apply\n' "$PROGRAM_NAME"
  exit 0
fi

VERIFY_FAILED=0
while IFS= read -r target_dir; do
  [[ -n "$target_dir" ]] || continue
  for required in LICENSE LICENSE-MIT LICENSE-APACHE NOTICE DISCLAIMER.md; do
    if [[ ! -f "$target_dir/$required" ]]; then
      log_warn "missing after apply: ${target_dir#"$REPO_ROOT"/}/$required"
      VERIFY_FAILED=1
    fi
  done
done < "$TARGET_DIRS_FILE"

if [[ "$UPDATE_MANIFESTS" -eq 1 ]]; then
  first_cargo_manifest="$(head -n 1 "$CARGO_MANIFESTS_FILE" 2>/dev/null || true)"
  if [[ -n "$first_cargo_manifest" ]]; then
    printf '\nValidating Cargo metadata...\n'
    if ! command -v cargo >/dev/null 2>&1; then
      log_warn "cargo is not available; skipped cargo metadata validation"
    elif cargo metadata --manifest-path "$first_cargo_manifest" --no-deps --format-version 1 >/dev/null; then
      printf '[ok]     cargo metadata (%s)\n' "${first_cargo_manifest#"$REPO_ROOT"/}"
    else
      printf '%s\n' "error: cargo metadata failed; original changed manifests are under:" >&2
      printf '  %s\n' "$BACKUP_ROOT" >&2
      exit 1
    fi
  fi
fi

if [[ "$UPDATE_NPM_MANIFESTS" -eq 1 ]]; then
  printf '\nValidating package.json files...\n'
  if python3 - "$REPO_ROOT" <<'PYJSON'
import json
import os
import sys
from pathlib import Path

root = Path(sys.argv[1])
excluded = {"node_modules", "target", "vendor", "third_party", "third-party", ".git", "dist", "build", ".vite", ".tauri", "junkyard", "archive", "archives", ".license-backups"}
count = 0
for current, dirs, files in os.walk(root):
    dirs[:] = [d for d in dirs if d not in excluded]
    if "package.json" in files:
        path = Path(current) / "package.json"
        json.loads(path.read_text(encoding="utf-8"))
        count += 1
print(f"[ok]     parsed {count} package.json file(s)")
PYJSON
  then
    :
  else
    printf '%s\n' "error: package.json validation failed; original changed manifests are under:" >&2
    printf '  %s\n' "$BACKUP_ROOT" >&2
    exit 1
  fi
fi

if [[ "$VERIFY_FAILED" -ne 0 ]]; then
  printf '%s\n' "error: one or more required files were not installed." >&2
  exit 1
fi

printf '\nApply complete.\n'
if [[ "$MANIFEST_CHANGED_COUNT" -gt 0 || "$NPM_MANIFEST_CHANGED_COUNT" -gt 0 || "$BACKED_UP_COUNT" -gt 0 ]]; then
  printf 'Backups: %s\n' "$BACKUP_ROOT"
fi
printf '\nRecommended review commands:\n'
printf '  git status --short\n'
printf '  git diff -- package.json apps packages extensions\n'
printf '  find . -name DISCLAIMER.md -o -name NOTICE | sort\n'
printf '  cargo metadata --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml --no-deps --format-version 1 >/dev/null\n'
printf '  python3 -m json.tool package.json >/dev/null\n'
