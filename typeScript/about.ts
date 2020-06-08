import * as ui from "./ui";

export const about = (): ui.Panel =>
  ui.scroll(
    {
      key: "aboutContainer",
      width: { _: "Stretch" },
      height: { _: "Stretch" },
    },
    ui.wrappedRow(
      {
        key: "about",
        width: { _: "Stretch" },
        height: { _: "Stretch" },
        oneLineCount: 3,
        padding: 8,
        gap: 8,
      },
      new Array(100).fill(0).map((_, index) => item(index))
    )
  );

const item = (index: number) =>
  ui.text(
    {
      key: index.toString(),
      width: { _: "Stretch" },
      height: { _: "Auto" },
      backgroundColor: "Dark",
      padding: 8,
    },
    index.toString()
  );
