# Third-Party Licenses & Notices

This repository bundles and adapts open-source Agent Skills under the **MIT License** and **Apache License 2.0**. Every skill preserves its upstream copyright notice and license terms via a bundled `LICENSE`/`LICENSE.txt` file or `SKILL.md` frontmatter metadata, as listed below.

| Bundled Skill Path | License | Copyright Holder & Upstream Source | Adaptation Notes |
| :--- | :--- | :--- | :--- |
| `skills/how` | `MIT` | Antigravity Workflow Skill | Bundled Stage 0 codebase walkthrough skill. |
| `skills/why` | `MIT` | Antigravity Workflow Skill | Bundled Stage 0 git & PR archaeology skill. |
| `skills/architect` | `MIT` | Antigravity Workflow Skill | Bundled Stage 0 design-twice skeleton skill. |
| `skills/grill-me` | `MIT` | Copyright (c) 2026 Rafael Zendron, Matt Pocock, & Hermes Agent ([Source](https://github.com/mattpocock/skills)) | Updated to v2.0.0 frontier-rounds interview and adapted subagent tool references for Antigravity (`invoke_subagent` / `ask_question`). |
| `skills/systematic-debugging` | `MIT` | Hermes Agent (adapted from `obra/superpowers`) ([Source](https://github.com/NousResearch/hermes-agent)) | Adapted for Antigravity investigation tools (`read_file`, `run_command`, `invoke_subagent`). |
| `skills/spike` | `MIT` | Lex Christopherson / GSD (`gsd-build/get-shit-done`) | Adapted for Antigravity tools (`search_web`, `invoke_subagent`, `run_workflow`). |
| `skills/test-value` | `MIT` | Copyright (c) 2026 tt-a1i (`LICENSE` bundled in skill directory) | Bundled Stage 1 test discrimination & feedback-cost skill. |
| `skills/correct` | `MIT` | Antigravity Workflow Skill | Bundled Stage 1 mistake-class elimination skill. |
| `skills/simplify-codebase` | `MIT` | Copyright (c) 2026 simplify-codebase contributors (`LICENSE` bundled in skill directory) | Bundled evidence-backed complexity removal skill. |
| `skills/security-best-practices` | `Apache-2.0` | OpenAI / Codex Skills (`LICENSE.txt` bundled in skill directory) | Bundled Python/JS/TS/Go security review skill. |
| `skills/typescript-best-practices` | `MIT` | Copyright (c) 2026 Lauren Tan ([Source](https://github.com/cursor/plugins/tree/main/pstack)) | Removed Cursor-only frontmatter flag for cross-agent compatibility. |
| `skills/codebase-inspection` | `MIT` | Hermes Agent ([Source](https://github.com/NousResearch/hermes-agent)) | Bundled pygount LOC/language breakdown skill. |
| `skills/localization` | `MIT` | Hermes Agent ([Source](https://github.com/NousResearch/hermes-agent)) | Sanitized workspace package example in `references/android-resources.md`. |
| `skills/node-inspect-debugger` | `MIT` | Hermes Agent ([Source](https://github.com/NousResearch/hermes-agent)) | Bundled Node.js `--inspect` CDP debugging skill. |
| `skills/python-debugpy` | `MIT` | Hermes Agent ([Source](https://github.com/NousResearch/hermes-agent)) | Bundled Python `pdb` / `debugpy` debugging skill. |
| `skills/interrogate` | `MIT` | Antigravity Workflow Skill | Bundled Stage 2 adversarial executed-repro verification skill. |
| `skills/blast-radius` | `MIT` | Copyright (c) 2026 Lauren Tan ([Source](https://github.com/cursor/plugins/tree/main/pstack)) | Removed Cursor-only frontmatter flag for cross-agent compatibility. |
| `skills/statechart` | `MIT` | Copyright (c) 2026 Lauren Tan ([Source](https://github.com/cursor/plugins/tree/main/pstack)) | Added Windows `taskkill` cleanup and portable TLA2TOOLS/JAVA resolution; excluded test corpus. |
| `skills/benchmark-checklist` | `MIT` | Copyright (c) 2026 Lauren Tan ([Source](https://github.com/cursor/plugins/tree/main/pstack)) | Removed Cursor-only frontmatter flag for cross-agent compatibility. |
| `skills/yeet` | `Apache-2.0` | OpenAI / Codex Skills (`LICENSE.txt` bundled in skill directory) | Sanitized repo-routing redlines for generic PR submission. |
| `skills/github` | `MIT` | Hermes Agent ([Source](https://github.com/NousResearch/hermes-agent)) | Sanitized personal repo/path examples and fixed `gh-env.sh` relative script resolution. |
| `skills/gh-fix-ci` | `Apache-2.0` | OpenAI / Codex Skills (`LICENSE.txt` bundled in skill directory) | Adapted plan step for Antigravity `/plan`; excluded `__pycache__`. |
| `skills/gh-address-comments` | `Apache-2.0` | OpenAI / Codex Skills (`LICENSE.txt` bundled in skill directory) | Added BOM-free UTF-8 and `resolveReviewThread` reminders; excluded `__pycache__`. |
| `skills/github-pr-assessment` | `MIT` | Hermes Agent ([Source](https://github.com/NousResearch/hermes-agent)) | Sanitized local scratch path example for public distribution. |
| `skills/react-native-skills` | `MIT` | Copyright (c) 2026 Vercel, Inc. ([Source](https://github.com/vercel-labs/agent-skills)) | Directory normalized to `react-native-skills` for Antigravity skill discovery. |
| `skills/animate-expo` | `MIT` | Copyright (c) 2026 Emil Kowalski ([Source](https://github.com/emilkowalski/skills)) | Removed interactive Initial Response greeting block for background skill loading. |
| `skills/break-ui` | `MIT` | Copyright (c) 2026 Emil Kowalski ([Source](https://github.com/emilkowalski/skills)) | Removed Initial Response greeting block and escaped ZWJ/scanner false-positive strings. |
| `skills/mobile-native` | `MIT` | Copyright (c) 2026 Emil Kowalski ([Source](https://github.com/emilkowalski/skills)) | Removed interactive Initial Response greeting block for background skill loading. |
| `skills/emil-design-eng` | `MIT` | Copyright (c) 2026 Emil Kowalski ([Source](https://github.com/emilkowalski/skills)) | Removed interactive Initial Response greeting block for background skill loading. |
| `skills/impeccable` | `Apache-2.0` | Copyright 2025 Paul Bakaus (derived from anthropics/skills/frontend-design) ([Source](https://github.com/pbakaus/impeccable)) | Unmodified upstream skill. |
| `skills/gemini-frontend-design` | `Apache-2.0` | Google Gemini Frontend Design | Bundled web/app frontend design skill. |
| `skills/humanizer` | `MIT` | Copyright (c) Siqi Chen (@blader), ported by Hermes Agent ([Source](https://github.com/blader/humanizer)) | Updated to v2.5.1 and sanitized tool references for public distribution. |
| `skills/llm-wiki` | `MIT` | Copyright (c) 2026 Nous Research (based on Andrej Karpathy LLM Wiki pattern) ([Source](https://github.com/NousResearch/hermes-agent)) | Updated upstream skill. |

---

## Full MIT License Text

```text
MIT License

Copyright (c) respective authors listed above
Upstream: See table above
Modifications: See table above

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
```


## Full Apache License 2.0 Text

```text

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

```
