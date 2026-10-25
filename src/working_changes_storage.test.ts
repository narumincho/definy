import { describe, expect, it } from "vitest";
import {
  deserializeWorkingChanges,
  serializeWorkingChanges,
} from "./working_changes_storage.ts";
import type { WorkingChanges } from "./types.ts";
import { generateAccountCredentials } from "./auth.ts";
import { extractProjectCommit } from "./cbor.ts";
import { createSignedSingleModuleCommitEvent } from "./test_commit.ts";
import { withCachedContents } from "./content_store.ts";

describe("working_changes_storage", () => {
  it("パーツの式と型を JSON のまま保存して復元する", () => {
    const changes: WorkingChanges = {
      parts: new Map([
        [
          "math.test",
          {
            moduleDefinitionEventHash: "module-hash",
            partDefinitionEventHash: "part-hash",
            name: "test",
            description: [{ language: "en", text: "Test description" }],
            partType: { "#number": null },
            expression: {
              "#call": {
                function: {
                  "#part_reference": { part_definition_event_hash: "AQID" },
                },
                arguments: [{ name: "left", value: { "#number": 1 } }],
              },
            },
          },
        ],
      ]),
    };
    const restored = deserializeWorkingChanges(
      serializeWorkingChanges(changes),
    );
    expect(restored.parts.get("math.test")).toEqual(
      changes.parts.get("math.test"),
    );
  });

  it("復元した式で署名したコミットからパーツ ID の文字列が戻る", async () => {
    const creds = await generateAccountCredentials("test-author");
    const partId = "AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA";
    const restored = deserializeWorkingChanges(
      serializeWorkingChanges({
        parts: new Map([
          [
            "sample.calc",
            {
              moduleDefinitionEventHash: "mod-hash",
              partDefinitionEventHash: "part-hash",
              name: "calc",
              description: [{ language: "en", text: "Calc part" }],
              partType: { "#number": null },
              expression: {
                "#part_reference": { part_definition_event_hash: partId },
              },
            },
          ],
        ]),
      }),
    );
    const restoredPart = restored.parts.get("sample.calc");
    expect(restoredPart).toBeDefined();

    const { signedEventBytes } = await createSignedSingleModuleCommitEvent(
      {
        credentials: creds,
        moduleName: "sample",
        moduleDescription: [{ language: "en", text: "Sample module" }],
        message: "Test commit with restored expression",
        parts: [
          {
            name: restoredPart!.name,
            description: restoredPart!.description,
            partType: restoredPart!.partType,
            expression: restoredPart!.expression,
          },
        ],
      },
      1700000000,
    );

    const decodedCommit = extractProjectCommit(signedEventBytes)?.modules[0];
    expect(withCachedContents(decodedCommit?.parts ?? [])[0]).toMatchObject({
      partType: { "#number": null },
      expression: {
        "#part_reference": { part_definition_event_hash: partId },
      },
    });
  });

  it("モジュールの公開/非公開の変更を保存して復元する", () => {
    const restored = deserializeWorkingChanges(
      serializeWorkingChanges({
        parts: new Map(),
        moduleVisibilities: new Map([["app", "private"]]),
      }),
    );
    expect([...(restored.moduleVisibilities ?? [])]).toEqual([
      ["app", "private"],
    ]);
  });

  it("returns empty WorkingChanges on corrupted or invalid JSON", () => {
    const emptyResult = deserializeWorkingChanges("not valid json {");
    expect(emptyResult.parts.size).toBe(0);

    const nonObjectResult = deserializeWorkingChanges("123");
    expect(nonObjectResult.parts.size).toBe(0);

    const nullResult = deserializeWorkingChanges("null");
    expect(nullResult.parts.size).toBe(0);

    const arrayResult = deserializeWorkingChanges("[]");
    expect(arrayResult.parts.size).toBe(0);

    const missingPartsResult = deserializeWorkingChanges("{}");
    expect(missingPartsResult.parts.size).toBe(0);

    const invalidPartsTypeResult = deserializeWorkingChanges(
      JSON.stringify({ parts: "not-an-object" }),
    );
    expect(invalidPartsTypeResult.parts.size).toBe(0);
  });
});
