import { readFileSync } from "fs";
import { CodeParser } from "../CodeParser";
import { CodePosition } from "../CodePosition";
import { BasicBlockContext, Direction, ElseCaseContext, GoToContext, IfCaseContext, SwitchBlockContext, TerminationContext, TerminationState, WhileCaseContext } from "../Context";

const simple = `alphabet = [a, b]
module block1():
    move right
    changeto blank
    goto block2()
module block2():
    while 0:
        move left
    if 1, blank:
        changeto a
        accept`;

const isDiv2Iterative = readFileSync("./src/examples/isDiv2.txt", "utf-8");
const isDiv2Recursive = readFileSync("./src/examples/isDiv2Rec.txt", "utf-8");

const simpleParser = new CodeParser(simple);
const simpleProgram = simpleParser.parse();

const isDiv2IterativeParser = new CodeParser(isDiv2Iterative);
const isDiv2IterativeProgram = isDiv2IterativeParser.parse();   

const isDiv2RecursiveParser = new CodeParser(isDiv2Recursive);
const isDiv2RecursiveProgram = isDiv2RecursiveParser.parse();

test("CodeParser parses an alphabet correctly", () => {
    const alphabet = simpleProgram.alphabet;

    expect(alphabet.values).toEqual(["a", "b"]);
    expect(alphabet.position).toEqual(new CodePosition(0, 1, 0, 17));
});

test("CodeParser parses a module correctly", () => {
    const modules = simpleProgram.modules;
    
    expect(modules.length).toBe(2);
    expect(modules[0].identifier).toBe("block1");
    expect(modules[0].blocks.length).toBe(2);
    
    expect(modules[0].position).toEqual(new CodePosition(1, 5, 0, 17));
    expect(modules[1].position).toEqual(new CodePosition(5, 11, 0, 14));
});

test("CodeParser parses a basic block correctly", () => {
    const module = simpleProgram.modules[1];
    const switchBlock = module.blocks[0] as SwitchBlockContext;
    const ifBlock = switchBlock.cases[1] as IfCaseContext;
    const basicBlock = ifBlock.blocks[0] as BasicBlockContext;

    expect(basicBlock.changeToCommand).toBeDefined();
    expect(basicBlock.moveCommand).toBeUndefined();
    expect(basicBlock.flowCommand).toBeDefined();
    
    expect(basicBlock.position).toEqual(new CodePosition(9, 11, 8, 14));
});

test("CodeParser parses a while command correctly", () => {
    const module = simpleProgram.modules[1];
    const switchBlock = module.blocks[0] as SwitchBlockContext;
    const whileCase = switchBlock.cases[0] as WhileCaseContext;
    
    expect(whileCase.values).toEqual(["0"]);
    
    expect(whileCase.block.changeToCommand).toBeUndefined();
    expect(whileCase.block.moveCommand).toBeDefined();

    expect(whileCase.position).toEqual(new CodePosition(6, 8, 4, 17));
});

test("CodeParser parses an if command correctly", () => {
    const module = isDiv2IterativeProgram.modules[0];
    const switchBlock = module.blocks[1] as SwitchBlockContext;
    const ifCase = switchBlock.cases[0] as IfCaseContext;

    expect(ifCase.values).toEqual(["0"]);
    expect(ifCase.blocks.length).toBe(1);

    expect(ifCase.blocks[0]).toBeInstanceOf(BasicBlockContext);

    expect(ifCase.position).toEqual(new CodePosition(4, 6, 4, 14));
});

test("CodeParser parses an else command correctly", () => {
    const module = isDiv2IterativeProgram.modules[0];
    const switchBlock = module.blocks[1] as SwitchBlockContext;
    const elseCase = switchBlock.cases[1] as ElseCaseContext;

    expect(elseCase.blocks.length).toBe(1);

    expect(elseCase.blocks[0]).toBeInstanceOf(BasicBlockContext);

    expect(elseCase.position).toEqual(new CodePosition(6, 8, 4, 14));
});

test("CodeParser parses a switch block correctly", () => {
    const module = isDiv2RecursiveProgram.modules[0];
    const switchBlock = module.blocks[0] as SwitchBlockContext;
    expect(switchBlock.cases.length).toBe(2);

    const cases = switchBlock.cases;

    expect(cases[0]).toBeInstanceOf(IfCaseContext);
    const ifCase = cases[0] as IfCaseContext;
    expect(ifCase.values).toEqual([""]);

    expect(cases[1]).toBeInstanceOf(ElseCaseContext);

    expect(switchBlock.position).toEqual(new CodePosition(2, 11, 4, 24));
});

test("CodeParser parses a move command correctly", () => {
    const module = isDiv2IterativeProgram.modules[0];
    const block = module.blocks[0] as BasicBlockContext;
    const moveCommand = block.moveCommand!;

    expect(moveCommand.direction).toBe(Direction.END);
    expect(moveCommand.position).toEqual(new CodePosition(3, 4, 4, 12));
});

test("CodeParser parses a changeto command correctly", () => {
    const module = simpleProgram.modules[1];
    const switchBlock = module.blocks[0] as SwitchBlockContext;
    const whileBlock = switchBlock.cases[1] as IfCaseContext;
    const basicBlock = whileBlock.blocks[0] as BasicBlockContext;
    const changeToCommand = basicBlock.changeToCommand!;

    expect(changeToCommand.value).toBe("a");
    expect(changeToCommand.position).toEqual(new CodePosition(9, 10, 8, 18));
});

test("CodeParser parses an accept command correctly", () => {
    const module = simpleProgram.modules[1];
    const switchBlock = module.blocks[0] as SwitchBlockContext;
    const ifBlock = switchBlock.cases[1] as IfCaseContext;
    const basicBlock = ifBlock.blocks[0] as BasicBlockContext;
    const terminationCommand = basicBlock.flowCommand! as TerminationContext;

    expect(terminationCommand.state).toBe(TerminationState.ACCEPT);
    expect(terminationCommand.position).toEqual(new CodePosition(10, 11, 8, 14));
});

test("CodeParser parses a reject command correctly", () => {
    const module = isDiv2RecursiveProgram.modules[0];
    const switchBlock = module.blocks[0] as SwitchBlockContext;
    const ifCase = switchBlock.cases[0] as IfCaseContext;
    const nestedSwitchBlock = ifCase.blocks[1] as SwitchBlockContext;
    const nestedElseCase = nestedSwitchBlock.cases[1] as IfCaseContext;
    const basicBlock = nestedElseCase.blocks[0] as BasicBlockContext;
    const terminationCommand = basicBlock.flowCommand! as TerminationContext;
    
    expect(terminationCommand.state).toBe(TerminationState.REJECT);
    expect(terminationCommand.position).toEqual(new CodePosition(7, 8, 12, 18));
});

test("CodeParser parses a goto command correctly", () => {
    const module = isDiv2RecursiveProgram.modules[0];
    const switchBlock = module.blocks[0] as SwitchBlockContext;
    const elseCase = switchBlock.cases[1] as ElseCaseContext;
    const basicBlock = elseCase.blocks[0] as BasicBlockContext;
    const goToCommand = basicBlock.flowCommand! as GoToContext;

    expect(goToCommand.identifier).toBe("isDiv2Rec");
    expect(goToCommand.args.length).toBe(0);
    expect(goToCommand.position).toEqual(new CodePosition(10, 11, 8, 24));
});