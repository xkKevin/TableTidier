let template_case3 = [
  [
    {
      position: {
        x: StartPoint.x,
        y: [StartPoint.y, StartPoint.y + 1], // Range(StartPoint.y, StartPoint.y + 1),
      },
      target: {
        column: (i) => {
          return ["Phone", "Price"][i];
        },
      },
    },
    {
      position: {
        x: [StartPoint.x + 1, StartPoint.x + 3, StartPoint.x + 5],
        y: StartPoint.y + 1,
      },
      context: [
        {
          position: {
            x: () => this.position.x,
            y: () => this.position.y - 1,
          },
          value: (value) => value != "",
        },
      ],
      target: {
        column: () =>
          this.context[0].value === "Announced Date"
            ? "Release Date"
            : this.context[0].value,
      },
    },
    {
      position: {
        x: StartPoint.x + 2,
        y: Range(StartPoint.y + 2, StartPoint.y + 6, 2),
      },
      context: [
        {
          position: {
            x: () => this.position.x,
            y: () => StartPoint.y,
          },
          value: (value) => value === "Dimensions",
        },
        {
          position: {
            x: () => this.position.x,
            y: () => this.position.y - 1,
          },
          // value: (value) => value != "",
          value: (value) =>
            ["Height", "H", "Width", "W", "Depth", "D"].includes(value),
        },
      ],
      target: {
        column: () => {
          if (this.context[1].value === "Height" || "H") return "Height";
          if (this.context[1].value === "Width" || "W") return "Width";
          if (this.context[1].value === "Depth" || "D") return "Depth";
        },
      },
    },
    {
      position: {
        x: StartPoint.x + 4,
        y: Range(StartPoint.y + 1, StartPoint.y + 2, 1),
      },
      context: [
        {
          position: {
            x: () => this.position.x,
            y: () => StartPoint.y,
          },
          value: (value) => value === "Camera",
        },
      ],
      target: {
        column: (i) => {
          let neighbor_posi = { x: this.position.x, y: this.position.y + 1 };
          if (i) neighbor_posi.y = this.position.y - 1;
          let neighbor_value = getValuebyPosition(neighbor_posi);
          if (this.value < neighbor_value) return "Front Camera";
          else return "Rear Camera";
        },
      },
    },
  ],
];
