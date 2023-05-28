import { Direction, IfCaseContext, SwitchBlockContext, TerminationState } from "../Context";
import { TMTape } from "../TMTape";
import { CodeParser } from "../CodeParser";
import { CodeExecutor } from "../CodeExecutor";
import { readFileSync } from "fs";

const palindrome = readFileSync("./src/examples/palindrome.txt", "utf-8");
const palindromeParser = new CodeParser(palindrome);
const palindromeProgram = palindromeParser.parse();

const rejectIfNoTermination = `alphabet = [a, b]
module simple():
    move left
    move right`;
const rejectIfNoTerminationParser = new CodeParser(rejectIfNoTermination);
const rejectIfNoTerminationProgram = rejectIfNoTerminationParser.parse();

test("CodeExecutor throws an error if the tape is not valid for the program", () => {
    expect(() => {
        new CodeExecutor("11", palindromeProgram);
    }).toThrow(new Error("The tape is not valid for the given TM Program."));
});

test("CodeExecutor initialises the tape as expected", () => {
    const executor = new CodeExecutor("ab", palindromeProgram);
    const tape = new TMTape("ab");

    const firstBlock = palindromeProgram.modules[0].blocks[0] as SwitchBlockContext;

    expect(executor.currentBlock).toBe(firstBlock);
    expect(executor.tape).toEqual(tape);
});

test("CodeExecutor executes the tape correctly", () => {
    const executor = new CodeExecutor("ab", palindromeProgram);
    const tape = new TMTape("ab");

    const block = palindromeProgram.modules[1].blocks[0] as SwitchBlockContext;

    expect(executor.execute()).toBe(true);
    expect(executor.currentBlock).toBe(block);
    tape.change("");
    tape.move(Direction.END);
    expect(executor.tape).toEqual(tape);

    expect(executor.execute()).toBe(true);
    expect(executor.currentBlock).toBeUndefined();
    tape.move(Direction.LEFT);
    expect(executor.tape).toEqual(tape);
});

test("CodeExecutor terminates with the correct reject status", () => {
    const executor = new CodeExecutor("ab", palindromeProgram);
    
    while (executor.execute()) {
        continue;
    }

    expect(executor.execute()).toBe(false);
    expect(executor.terminationStatus).toBe(TerminationState.REJECT);
});

test("CodeExecutor terminates with the correct accept status", () => {
    const executor = new CodeExecutor("aba", palindromeProgram);
    
    while (executor.execute()) {
        continue;
    }

    expect(executor.terminationStatus).toBe(TerminationState.ACCEPT);
});

test("CodeExecutor rejects if there is no flow command at the end", () => {
    const executor = new CodeExecutor("ab", rejectIfNoTerminationProgram);

    while (executor.execute()) {
        continue;
    }
    
    expect(executor.terminationStatus).toBe(TerminationState.REJECT);
});