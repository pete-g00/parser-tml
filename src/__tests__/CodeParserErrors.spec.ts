import { CodeParser } from "../CodeParser";

const emptyProgram = ``;

const invalidStart = `module main():`;

const invalidLetterInAlphabet = `alphabet = [.]`;

const invalidAlphabetLen2 = `alphabet = [ab]`;

const alphabetNoCommas = `alphabet = [a b c]`;

const incompleteBracket = `alphabet = [a, b]
module main()`;

const emptyModule = `alphabet = [a, b]
module main():`;

const invalidDirection = `alphabet = [a, b]
module main():
    move up
`;

const invalidCommand = `alphabet = [a, b]
module main():
    stop
`;

const invalidCoreCommand = `alphabet = [a, b]
module main():
    while a, b:
        accept
`;

const whileMultipleBlocks = `alphabet = [a, b]
module main():
    while blank:
        move left
        move right
`;

const invalidCase = `alphabet = [a, b]
module main():
    if a:
        move left
    when x:
        move right
`;

const missingIndentation = `alphabet = [a, b]
module main():
    if a:
    move left`;

const unexpectedIndentation = `alphabet = [a, b]
module main():
    if a:
        changeto blank
            move left`;

const invalidIndentation = `alphabet = [a, b]
module main():
    if a:
        changeto blank
      move left`;

const unexpectedDeIndentation = `alphabet = [a, b]
module main():
    if a:
move left`;

const ifNoLetter = `alphabet = [a, b]
module main():
    if:
`;

const ifNoBody = `alphabet = [a, b]
module main():
    if a:
`;

const whileNoLetter = `alphabet = [a, b]
module main():
    while:
`;

const whileNoCommand = `alphabet = [a, b]
module main():
    while a:
`;

test("CodeParser throws an error when the program is empty", () => {
    const parser = new CodeParser(emptyProgram);

    expect(() => {
        parser.parse();
    }).toThrow(new Error("Unexpected end of file."));
});

test("CodeParser throws an error when the alphabet is not given", () => {
    const parser = new CodeParser(invalidStart);

    expect(() => {
        parser.parse();
    }).toThrow(new Error(`Expected value "module" to be "alphabet".`));
});

test("CodeParser throws an error when the alphabet contains an invalid letter", () => {
    const parser = new CodeParser(invalidLetterInAlphabet);
    
    expect(() => {
        parser.parse();
    }).toThrow(new Error(`The value "." must be a lowercase character or a number.`));
});

test("CodeParser throws an error when a letter in the alphabet doesn't have length 1", () => {
    const parser = new CodeParser(invalidAlphabetLen2);
    
    expect(() => {
        parser.parse();
    }).toThrow(new Error(`The value "ab" must have length 1.`));
});

test("CodeParser throws an error when a letter in the alphabet has no commas", () => {
    const parser = new CodeParser(alphabetNoCommas);
    
    expect(() => {
        parser.parse();
    }).toThrow(new Error(`Expected value "b" to be "]".`));
});

test("CodeParser throws an error when a bracket isn't finished", () => {
    const parser = new CodeParser(incompleteBracket);

    expect(() => {
        parser.parse();
    }).toThrow(new Error(`Unexpected end of file.`));
});

test("CodeParser throws an error when a module has no commands", () => {
    const parser = new CodeParser(emptyModule);

    expect(() => {
        parser.parse();
    }).toThrow(new Error(`Unexpected end of file.`));
});

test("CodeParser throws an error when the move direction isn't valid", () => {
    const parser = new CodeParser(invalidDirection);

    expect(() => {
        parser.parse();
    }).toThrow(new Error(`Invalid direction "up".`));
});

test("CodeParser throws an error when a command isn't valid", () => {
    const parser = new CodeParser(invalidCommand);
    
    expect(() => {
        parser.parse();
    }).toThrow(new Error(`Invalid basic command "stop".`));
});

test("CodeParser throws an error when a non-core command is given as a core command", () => {
    const parser = new CodeParser(invalidCoreCommand);
        
    expect(() => {
        parser.parse();
    }).toThrow(new Error(`Invalid core command "accept".`));
});

test("CodeParser throws an error when a while block has multiple basic blocks", () => {
    const parser = new CodeParser(whileMultipleBlocks);

    expect(() => {
        parser.parse();
    }).toThrow(new Error(`A core block must only be composed of a changeto and a move command.`));    
});

test("CodeParser throws an error when a case isn't an if or a while case", () => {
    const parser = new CodeParser(invalidCase);

    expect(() => {
        parser.parse();
    }).toThrow(new Error(`Unexpected start of case: "when".`));
});

test("CodeParser throws an error if indentation is missing", () => {
    const missingIndentationParser = new CodeParser(missingIndentation);

    expect(() => {
        missingIndentationParser.parse();
    }).toThrow(new Error("Expected indentation."));
});

test("CodeParser throws an error if there is an unexpected indentation", () => {
    const unexpectedIndentationParser = new CodeParser(unexpectedIndentation);

    expect(() => {
        unexpectedIndentationParser.parse();
    }).toThrow(new Error("Unexpected indentation."));
});

test("CodeParser throws an error if there is an invalid indentation", () => {
    const invalidIndentationParser = new CodeParser(invalidIndentation);

    expect(() => {
        invalidIndentationParser.parse();
    }).toThrow(new Error("Invalid indentation."));
});

test("CodeParser throws an error if there is an unexpected de-indentation", () => {
    const unexpectedDeIndentationParser = new CodeParser(unexpectedDeIndentation);

    expect(() => {
        unexpectedDeIndentationParser.parse();
    }).toThrow(new Error('Unexpected de-indentation.'));
});

test("CodeParser throws an error when an if case doesn't apply to any value", () => {
    const ifNoLetterParser = new CodeParser(ifNoLetter);

    expect(() => {
        ifNoLetterParser.parse()
    }).toThrow(new Error(`Unexpected end of file.`));
});

test("CodeParser throws an error when an if case doesn't have any commands", () => {
    const ifNoBodyParser = new CodeParser(ifNoBody);

    expect(() => {
        ifNoBodyParser.parse();
    }).toThrow(new Error(`Unexpected end of file.`));
});

test("CodeParser throws an error when a while case doesn't apply to any value", () => {
    const whileNoLetterParser = new CodeParser(whileNoLetter);

    expect(() => {
        whileNoLetterParser.parse();
    }).toThrow(new Error(`Unexpected end of file.`));
});

test("CodeParser throws an error when a while case doesn't have any commands", () => {
    const whileNoCommandParser = new CodeParser(whileNoCommand);

    expect(() => {
        whileNoCommandParser.parse();
    }).toThrow(new Error(`Unexpected end of file.`));
});

// TODO: Should actually be allowed
// test("CodeParser throws an error if a switch block is not a final block", () => {
//     const nonFinalSwitchBlockParser = new CodeParser(nonFinalSwitchBlock);

//     expect(() => {
//         nonFinalSwitchBlockParser.parse();
//     }).toThrow(new Error(`Unexpected start of case: "accept".`));
// });
