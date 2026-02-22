import { tool } from "langchain";
import z from "zod";

const add = tool(({ x, y }) => x + y, {
  name: "add",
  description: "Add two numbers together",
  schema: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

const subtract = tool(({ x, y }) => x - y, {
  name: "subtract",
  description: "Subtract two numbers",
  schema: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

const multiply = tool(({ x, y }) => x * y, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

const divide = tool(({ x, y }) => x / y, {
  name: "divide",
  description: "Divide two numbers",
  schema: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

type Tools = typeof add | typeof subtract | typeof multiply | typeof divide;

export const toolsByName: Record<string, Tools> = {
  [add.name]: add,
  [subtract.name]: subtract,
  [multiply.name]: multiply,
  [divide.name]: divide,
};

export { add, subtract, multiply, divide };
