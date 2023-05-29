import { CodeParser } from "../CodeParser";
import { CodeConverter } from "../CodeConverter";
import { TMChange } from "../TuringMachine";
import { Direction } from "../Context";
import { readFileSync } from "fs";

const singleBlock = `alphabet = [a, b]
module simple():
    changeto blank
    move right
`;

const moduleWithGoto = `alphabet = [a, b]
module simple():
    move right
    changeto b
    move left
    goto simple()
`;

const moduleWithIf = `alphabet = [a, b]
module simple():
    if a, b:
        move right
        accept
    else:
        move left
        reject
`;

const moduleWithWhile = `alphabet = [a, b]
module simple():
    while b:
        move right
    if a:
        changeto blank
        accept
    else:
        reject
`;

const moduleWithIfBlock = `alphabet = [a, b]
module simple():
    if a:
        move left
    while b:
        move right
    if blank:
        move right
        changeto b
        move left
        goto simple()
`;

const moduleWithIfBlocks = `alphabet = [a, b]
module simple():
    changeto blank
    if a:
        move left
        changeto a
        move left
        reject
    while b:
        move right
    else:
        move right
        changeto b
        move right
        goto simple()
`;

const multipleModules = `alphabet = [a, b]
module simple():
    move right
    goto basic()
module basic():
    move left
    goto simple()
`;

const palindrome = readFileSync("./src/examples/palindrome.txt", "utf-8");

test("CodeConverter can convert a module with a single block", () => {
    const singleBlockParser = new CodeParser(singleBlock);
    const singleBlockProgram = singleBlockParser.parse();
    const codeConverter = new CodeConverter(singleBlockProgram);
    const singleBlockTM = codeConverter.convert();

    expect(singleBlockTM.initialState).toBe("simple.0");
    expect(singleBlockTM.states.length).toBe(1);
    
    const state = singleBlockTM.getState("simple.0")!;
    const change:TMChange = {
        nextState: "reject",
        direction: Direction.RIGHT,
        letter: ""
    };
    expect(state.transition("")).toEqual(change);
    expect(state.transition("a")).toEqual(change);
    expect(state.transition("b")).toEqual(change);
});

test("CodeConverter can convert a module with a goto statement", () => {
    const moduleWithGotoParser = new CodeParser(moduleWithGoto);
    const moduleWithGotoProgram = moduleWithGotoParser.parse();
    const codeConverter = new CodeConverter(moduleWithGotoProgram);
    const moduleWithGotoTM = codeConverter.convert();

    expect(moduleWithGotoTM.states.length).toBe(2);

    let state = moduleWithGotoTM.getState("simple.0")!;
    let change:TMChange = {
        nextState: "simple.1",
        direction: Direction.RIGHT,
        letter: ""
    };    
    expect(state.transition("")).toEqual(change);
    
    change.letter = "a";
    expect(state.transition("a")).toEqual(change);
    
    change.letter = "b";
    expect(state.transition("b")).toEqual(change);
    
    state = moduleWithGotoTM.getState("simple.1")!;
    change = {
        nextState: "simple.0",
        direction: Direction.LEFT,
        letter: "b"
    };
    expect(state.transition("")).toEqual(change);
    expect(state.transition("a")).toEqual(change);
    expect(state.transition("b")).toEqual(change);
});

test("CodeConverter can convert a single module that has if/else cases", () => {
    const moduleWithIfParser = new CodeParser(moduleWithIf);
    const moduleWithIfProgram = moduleWithIfParser.parse();
    const codeConverter = new CodeConverter(moduleWithIfProgram);
    const moduleWithIfTM = codeConverter.convert();

    expect(moduleWithIfTM.states.length).toBe(1);

    const state = moduleWithIfTM.getState("simple.0")!;
    let change:TMChange = {
        nextState: "accept",
        direction: Direction.RIGHT,
        letter: "a"
    };
    expect(state.transition("a")).toEqual(change);
    
    change.letter = "b";
    expect(state.transition("b")).toEqual(change);

    change = {
        nextState: "reject",
        direction: Direction.LEFT,
        letter: ""
    };
    expect(state.transition("")).toEqual(change);
});

test("CodeConverter can convert a single module that has while cases", () => {
    const moduleWithWhileParser = new CodeParser(moduleWithWhile);
    const moduleWithWhileProgram = moduleWithWhileParser.parse();
    const codeConverter = new CodeConverter(moduleWithWhileProgram);
    const moduleWithWhileTM = codeConverter.convert();

    expect(moduleWithWhileTM.states.length).toBe(1);

    let state = moduleWithWhileTM.getState("simple.0")!;
    let change:TMChange = {
        nextState: "simple.0",
        direction: Direction.RIGHT,
        letter: "b"
    };
    expect(state.transition("b")).toEqual(change);

    change = {
        nextState: "accept",
        direction: Direction.LEFT,
        letter: ""
    };
    expect(state.transition("a")).toEqual(change);

    change = {
        nextState: "reject",
        direction: Direction.LEFT,
        letter: ""
    };
    expect(state.transition("")).toEqual(change);
});

test("CodeConverter can convert a module with an if block body", () => {
    const moduleWithIfBlockParser = new CodeParser(moduleWithIfBlock);
    const moduleWithIfBlockProgram = moduleWithIfBlockParser.parse();
    const codeConverter = new CodeConverter(moduleWithIfBlockProgram);
    const moduleWithIfBlockTM = codeConverter.convert();

    expect(moduleWithIfBlockTM.states.length).toBe(2);

    let state = moduleWithIfBlockTM.getState("simple.0")!;
    let change:TMChange = {
        nextState: "simple.0",
        direction: Direction.RIGHT,
        letter: "b"
    };
    expect(state.transition("b")).toEqual(change);

    change = {
        nextState: "reject",
        direction: Direction.LEFT,
        letter: "a"
    };
    expect(state.transition("a")).toEqual(change); 
    
    change = {
        nextState: "simple.0.blank.1",
        direction: Direction.RIGHT,
        letter: ""
    };
    expect(state.transition("")).toEqual(change);

    state = moduleWithIfBlockTM.getState("simple.0.blank.1")!;
    change = {
        nextState: "simple.0",
        direction: Direction.LEFT,
        letter: "b"
    };
    expect(state.transition("a")).toEqual(change);
    expect(state.transition("b")).toEqual(change);
    expect(state.transition("")).toEqual(change);
});

test("CodeConverter can convert a module with multiple if/else block bodies", () => {
    const moduleWithIfBlocksParser = new CodeParser(moduleWithIfBlocks);
    const moduleWithIfBlocksProgram = moduleWithIfBlocksParser.parse();
    const codeConverter = new CodeConverter(moduleWithIfBlocksProgram);
    const moduleWithIfBlocksTM = codeConverter.convert();

    expect(moduleWithIfBlocksTM.states.length).toBe(4);

    let state = moduleWithIfBlocksTM.getState("simple.0")!;
    let change:TMChange = {
        nextState: "simple.1",
        direction: Direction.LEFT,
        letter: ""
    };
    expect(state.transition("a")).toEqual(change);
    expect(state.transition("b")).toEqual(change);
    expect(state.transition("")).toEqual(change);
    
    state = moduleWithIfBlocksTM.getState("simple.1")!;
    change = {
        nextState: "simple.1",
        direction: Direction.RIGHT,
        letter: "b"
    };
    expect(state.transition("b")).toEqual(change);

    change = {
        nextState: "simple.1.a.1",
        direction: Direction.LEFT,
        letter: "a"
    };
    expect(state.transition("a")).toEqual(change); 
    
    change = {
        nextState: "simple.1.else.1",
        direction: Direction.RIGHT,
        letter: ""
    };
    expect(state.transition("")).toEqual(change);

    state = moduleWithIfBlocksTM.getState("simple.1.a.1")!;
    change = {
        nextState: "reject",
        direction: Direction.LEFT,
        letter: "a"
    };
    expect(state.transition("a")).toEqual(change);
    expect(state.transition("b")).toEqual(change);
    expect(state.transition("")).toEqual(change);

    state = moduleWithIfBlocksTM.getState("simple.1.else.1")!;
    change = {
        nextState: "simple.0",
        direction: Direction.RIGHT,
        letter: "b"
    };
    expect(state.transition("a")).toEqual(change);
    expect(state.transition("b")).toEqual(change);
    expect(state.transition("")).toEqual(change);
});

test("CodeConverter can convert multiple modules", () => {
    const multipleModulesParser = new CodeParser(multipleModules);
    const multipleModulesProgram = multipleModulesParser.parse();
    const codeConverter = new CodeConverter(multipleModulesProgram);
    const multipleModulesTM = codeConverter.convert();

    expect(multipleModulesTM.initialState).toBe("simple.0");
    expect(multipleModulesTM.states.sort()).toEqual(["basic.0", "simple.0"]);

    let state = multipleModulesTM.getState("simple.0")!;
    let change:TMChange = {
        letter: "a",
        direction: Direction.RIGHT,
        nextState: "basic.0"
    };
    expect(state.transition("a")).toEqual(change);

    state = multipleModulesTM.getState("basic.0")!;
    change = {
        letter: "a",
        direction: Direction.LEFT,
        nextState: "simple.0"
    };
    expect(state.transition("a")).toEqual(change);
});

test("CodeConverter can convert parametrised modules", () => {
    const palindromeParser = new CodeParser(palindrome);
    const palindromeProgram = palindromeParser.parse();
    const codeConverter = new CodeConverter(palindromeProgram);
    const palindromeProgramTM = codeConverter.convert();

    expect(palindromeProgramTM.initialState).toBe("palindrome.0");
    expect(palindromeProgramTM.states.sort()).toEqual(["check-a.0", "check-b.0", "palindrome.0"]);

    let state = palindromeProgramTM.getState("palindrome.0")!;
    let change:TMChange = {
        letter: "",
        direction: Direction.END,
        nextState: "check-a.0"
    };
    expect(state.transition("a")).toEqual(change);

    change.nextState = "check-b.0";
    expect(state.transition("b")).toEqual(change);

    change = {
        letter: "",
        direction: Direction.LEFT,
        nextState: "accept"
    };
    expect(state.transition("")).toEqual(change);

    state = palindromeProgramTM.getState("check-a.0")!;
    change = {
        letter: '',
        direction: Direction.START,
        nextState: "palindrome.0"
    };
    expect(state.transition("")).toEqual(change);
    expect(state.transition("a")).toEqual(change);

    change = {
        letter: "b",
        direction: Direction.LEFT,
        nextState: "reject"
    };
    expect(state.transition("b")).toEqual(change);

    state = palindromeProgramTM.getState("check-b.0")!;
    change = {
        letter: '',
        direction: Direction.START,
        nextState: "palindrome.0"
    };
    expect(state.transition("")).toEqual(change);
    expect(state.transition("b")).toEqual(change);

    change = {
        letter: "a",
        direction: Direction.LEFT,
        nextState: "reject"
    };
    expect(state.transition("a")).toEqual(change);

});