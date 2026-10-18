import { describe, expect, it } from "vitest";
import {
  deserializeWorkingChanges,
  serializeWorkingChanges,
} from "./working_changes_storage.ts";
import type { WorkingChanges } from "./types.ts";
import {
  generateAccountCredentials,
  createSignedModuleCommitEvent,
} from "./auth.ts";
import { extractModuleCommit } from "./cbor.ts";

describe("working_changes_storage", () => {
  it("round-trips WorkingChanges preserving deeply nested Uint8Array instances", () => {
    const sampleBytes = new Uint8Array([10, 20, 30, 40]);
    const changes: WorkingChanges = {
      parts: new Map([
        [
          "math.test",
          {
            moduleDefinitionEventHash: "module-hash",
            partDefinitionEventHash: "part-hash",
            name: "test",
            description: [{ language: "en", text: "Test description" }],
            partType: "number",
            expression: {
              If: {
                condition: { Boolean: { value: true } },
                then_expr: {
                  Add: {
                    left: { Number: { value: 1 } },
                    right: {
                      PartReference: {
                        part_definition_event_hash: sampleBytes,
                      },
                    },
                  },
                },
                else_expr: { Number: { value: 0 } },
              },
            },
          },
        ],
      ]),
    };

    const serialized = serializeWorkingChanges(changes);
    expect(serialized).toContain('"$bytes"');

    const restored = deserializeWorkingChanges(serialized);
    expect(restored.parts.size).toBe(1);
    const restoredPart = restored.parts.get("math.test");
    expect(restoredPart).toBeDefined();

    const restoredExpr = restoredPart?.expression as {
      If?: {
        then_expr?: {
          Add?: {
            right?: {
              PartReference?: {
                part_definition_event_hash?: unknown;
              };
            };
          };
        };
      };
    };

    const targetHash =
      restoredExpr.If?.then_expr?.Add?.right?.PartReference
        ?.part_definition_event_hash;
    expect(targetHash).toBeInstanceOf(Uint8Array);
    expect(targetHash).toEqual(sampleBytes);
  });

  it("produces valid 32-byte Uint8Array part_definition_event_hash through signed module commit pipeline", async () => {
    const creds = await generateAccountCredentials("test-author");
    const partHashBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      partHashBytes[i] = (i * 3 + 5) & 0xff;
    }

    const originalChanges: WorkingChanges = {
      parts: new Map([
        [
          "sample.calc",
          {
            moduleDefinitionEventHash: "mod-hash",
            partDefinitionEventHash: "part-hash",
            name: "calc",
            description: [{ language: "en", text: "Calc part" }],
            partType: "number",
            expression: {
              PartReference: {
                part_definition_event_hash: partHashBytes,
              },
            },
          },
        ],
      ]),
    };

    const serialized = serializeWorkingChanges(originalChanges);
    const restored = deserializeWorkingChanges(serialized);
    const restoredPart = restored.parts.get("sample.calc");
    expect(restoredPart).toBeDefined();

    const { signedEventBytes } = await createSignedModuleCommitEvent(
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

    const decodedCommit = extractModuleCommit(signedEventBytes);
    expect(decodedCommit).not.toBeNull();
    expect(decodedCommit?.parts.length).toBe(1);

    const decodedExpr = decodedCommit?.parts[0]?.expression as {
      PartReference?: {
        part_definition_event_hash?: unknown;
      };
    };
    expect(decodedExpr.PartReference).toBeDefined();

    const decodedHash = decodedExpr.PartReference?.part_definition_event_hash;
    expect(decodedHash).toBeInstanceOf(Uint8Array);
    expect(decodedHash).toEqual(partHashBytes);
    expect((decodedHash as Uint8Array).length).toBe(32);
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
