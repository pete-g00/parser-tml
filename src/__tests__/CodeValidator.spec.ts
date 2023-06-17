import { CodeParser } from "../CodeParser";
import { CodeValidator } from "../CodeValidator";

const goToValid = `alphabet = [a, b]
module a():
    move left
    goto b()
module b():
    accept
`;

const goToInvalid = `alphabet = [a, b]
module a():
    move left
    goto b()
`;

const goToRecursive = `alphabet = [a, b]
module a():
    move left
    goto a()
`;

const switchInvalid = `alphabet = [a, b]
module a():
    while x:
        move left
`;

const switchIncomplete = `alphabet = [a, b]
module a():
    if a, blank:
        accept
`;

const switchMissingBlank = `alphabet = [a, b]
module a():
    if a:
        accept
`;

const validSwitch = `alphabet = [a, b]
module a():
    if a, blank:
        accept
    while b:
        changeto a
        move right
`;

const validElseSwitch = `alphabet = [a, b]
module a():
    while b:
        changeto a
        move right
    else:
        accept
`;

const noFlowModule = `alphabet = [a, b]
module a():
    move left
    move right
    changeto blank
`;

const finalIfFlow = `alphabet = [a, b]
module a():
    if a, b, blank:
        move left
        move right
        reject
`;

const noFlowIf = `alphabet = [a, b]
module a():
    if a, b, blank:
        move left
        move right
        changeto blank
`;

const changeToInvalid = `alphabet = [a, b]
module a():
    changeto x
`;

const changeToBlank = `alphabet = [a, b]
module a():
    changeto blank
`;

const changeToValid = `alphabet = [a, b]
module a():
    changeto b
`;

const duplicateModules = `alphabet = [a, b]
module a():
    goto a()
module a():
    goto a()
`;

const firstIfBlockSwitch = `alphabet = [a, b]
module simple():
    if a, b:
        if a, b:
            move right
        if blank:
            reject
    if blank:
        reject
`;

const firstElseBlockSwitch = `alphabet = [a, b]
module simple():
    if a, b:
        move left
    else:
        if blank:
            move right`;

const validProgram = `alphabet = [0, 1]
module isDiv2():
    move end
    if 0:
        accept
    else:
        reject
`;

const noAlphabet = `alphabet = []`;

const noModules = `alphabet = [a, b]`;

const duplicateAlphabetAndParamLetter = `alphabet = [a, b]
module main():
    move right
module a(b):
    move left`;

const nonFinalElse = `alphabet = [a, b]
module a():
    else:
        move right
    if a:
        move left`;

const invalidGoArgLength = `alphabet = [a, b]
module main():
    move right
module b(x):
    goto b()`;

const ifNoLetter = `alphabet = [a, b]
module main():
    if:
        move left
`;

const whileNoLetter = `alphabet = [a, b]
module main():
    while:
        move left
`;

const parametrisedNoParameterSwitch = `alphabet = [a, b]
module main():
    move right
module b(x):
    if a:
        move left
    if b, blank:
        move right`;
        
const parametrisedWithParameterSwitch = `alphabet = [a, b]
module main():
    move right
module b(x):
    if a:
        move left
    if b, x:
        move right`;

const parametrisedFirstModule = `alphabet = [a, b]
module main(x):
    move right`;

test("CodeValidator does not throw an error in a valid program with a goto command", () => {
    const goToValidParser = new CodeParser(goToValid);
    const goToValidProgram = goToValidParser.parse();
    const codeValidator = new CodeValidator(goToValidProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator throws an error if there is an invalid goto reference", () => {
    const goToInvalidParser = new CodeParser(goToInvalid);
    const goToInvalidProgram = goToInvalidParser.parse();
    const codeValidator = new CodeValidator(goToInvalidProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`Undefined module "b".`));
});

test("CodeValidator does not throw an error if there is a recursive goto reference", () => {
    const goToRecursiveParser = new CodeParser(goToRecursive);
    const goToRecursiveProgram = goToRecursiveParser.parse();
    const codeValidator = new CodeValidator(goToRecursiveProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator throws an error if there is a switch case with a letter not present in the alphabet", () => {
    const switchInvalidParser = new CodeParser(switchInvalid);
    const switchInvalidProgram = switchInvalidParser.parse();
    const codeValidator = new CodeValidator(switchInvalidProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`Undefined letter: "x".`));
});

test("CodeValidator throws an error if there is no switch case applying to a letter in the alphabet", () => {
    const switchIncompleteParser = new CodeParser(switchIncomplete);
    const switchIncompleteProgram = switchIncompleteParser.parse();
    const codeValidator = new CodeValidator(switchIncompleteProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`The switch block doesn't have a case for the letter: "b".`));
});

test("CodeValidator throws an error if there is no switch case applying to blank", () => {
    const switchMissingBlankParser = new CodeParser(switchMissingBlank);
    const switchMissingBlankProgram = switchMissingBlankParser.parse();
    const codeValidator = new CodeValidator(switchMissingBlankProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`The switch block doesn't have a case for the letters: "b", blank.`));
});

test("CodeValidator doesn't throw an error for a valid switch block", () => {
    const validSwitchParser = new CodeParser(validSwitch);
    const validSwitchProgram = validSwitchParser.parse();
    const codeValidator = new CodeValidator(validSwitchProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator doesn't throw an error for a valid switch block with an else case", () => {
    const validElseSwitchParser = new CodeParser(validElseSwitch);
    const validElseSwitchProgram = validElseSwitchParser.parse();
    const codeValidator = new CodeValidator(validElseSwitchProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator doesn't throw an error if there are no flow commands present in a module", () => {
    const noFlowModuleParser = new CodeParser(noFlowModule);
    const noFlowModuleProgram = noFlowModuleParser.parse();
    const codeValidator = new CodeValidator(noFlowModuleProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator doesn't throw an error if the final if body block has a flow command", () => {
    const finalIfFlowParser = new CodeParser(finalIfFlow);
    const finalIfFlowProgram = finalIfFlowParser.parse();
    const codeValidator = new CodeValidator(finalIfFlowProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator doesn't throw an error if the if block has no flow command", () => {
    const noFlowIfParser = new CodeParser(noFlowIf);
    const noFlowIfProgram = noFlowIfParser.parse();
    const codeValidator = new CodeValidator(noFlowIfProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator throws an error for an invalid letter in a changeto command", () => {
    const changeToInvalidParser = new CodeParser(changeToInvalid);
    const changeToInvalidProgram = changeToInvalidParser.parse();
    const codeValidator = new CodeValidator(changeToInvalidProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`Undefined letter: "x".`));
});

test("CodeValidator doesn't throw an error for \"changeto blank\" command", () => {
    const changeToBlankParser = new CodeParser(changeToBlank);
    const changeToBlankProgram = changeToBlankParser.parse();
    const codeValidator = new CodeValidator(changeToBlankProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator doesn't throw an error for a changeto command with a valid letter from the alphabet", () => {
    const changeToValidParser = new CodeParser(changeToValid);
    const changeToValidProgram = changeToValidParser.parse();
    const codeValidator = new CodeValidator(changeToValidProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator throws an error if there are two modules with the same name.", () => {
    const duplicateModulesParser = new CodeParser(duplicateModules);
    const duplicateModulesProgram = duplicateModulesParser.parse();
    const codeValidator = new CodeValidator(duplicateModulesProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`Duplicate module with name "a".`));
});

test("CodeValidator throws an error if the first block within an if block is a switch block", () => {
    const firstIfBlockSwitchParser = new CodeParser(firstIfBlockSwitch);
    const firstIfBlockSwitchProgram = firstIfBlockSwitchParser.parse();
    const codeValidator = new CodeValidator(firstIfBlockSwitchProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`The first block within an if case must be a basic block.`));
});

test("CodeValidator throws an error if the first block within an else block is a switch block", () => {
    const firstElseBlockSwitchParser = new CodeParser(firstElseBlockSwitch);
    const firstElseBlockSwitchProgram = firstElseBlockSwitchParser.parse();
    const codeValidator = new CodeValidator(firstElseBlockSwitchProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`The first block within an else case must be a basic block.`));
});

test("CodeValidator doesn't throw an error in a valid program", () => {
    const validProgramParser = new CodeParser(validProgram);
    const validProgramProgram = validProgramParser.parse();
    const codeValidator = new CodeValidator(validProgramProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator throws an error when the alphabet is empty", () => {
    const noAlphabetParser = new CodeParser(noAlphabet);
    const noAlphabetProgram = noAlphabetParser.parse();
    const codeValidator = new CodeValidator(noAlphabetProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`The alphabet must have at least one letter.`));
});

test("CodeValidator throws an error when a program has no modules", () => {
    const noModulesParser = new CodeParser(noModules);
    const noModulesProgram = noModulesParser.parse();
    const codeValidator = new CodeValidator(noModulesProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`A program should have at least one module.`));
});

test("CodeValidator throws an error when a module has duplicate parameters and alphabet labels", () => {
    const duplicateAlphabetAndParamLetterParser = new CodeParser(duplicateAlphabetAndParamLetter);
    const duplicateAlphabetAndParamLetterProgram = duplicateAlphabetAndParamLetterParser.parse();
    const codeValidator = new CodeValidator(duplicateAlphabetAndParamLetterProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`The letter "b" is both in the alphabet and a module parameter.`));
});

test("CodeValidator throws an error when a non-final block is an else block", () => {
    const nonFinalElseParser = new CodeParser(nonFinalElse);
    const nonFinalElseProgram = nonFinalElseParser.parse();
    const codeValidator = new CodeValidator(nonFinalElseProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error("A non-final case cannot be an else block"));    
});

test("CodeValidator throws an error when a goto command doesn't have the right number of arguments", () => {
    const invalidGoArgLengthParser = new CodeParser(invalidGoArgLength);
    const invalidGoArgLengthProgram = invalidGoArgLengthParser.parse();
    const codeValidator = new CodeValidator(invalidGoArgLengthProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error("Expected 1 argument."));
});

test("CodeValidator throws an error when an if case doesn't apply to any value", () => {
    const ifNoLetterParser = new CodeParser(ifNoLetter);
    const ifNoLetterProgram = ifNoLetterParser.parse();
    const codeValidator = new CodeValidator(ifNoLetterProgram);

    expect(() => {
        codeValidator.validate()
    }).toThrow(new Error(`An if case must apply to at least one letter.`));
});

test("CodeValidator throws an error when a while case doesn't apply to any value", () => {
    const whileNoLetterParser = new CodeParser(whileNoLetter);
    const whileNoLetterProgram = whileNoLetterParser.parse();
    const codeValidator = new CodeValidator(whileNoLetterProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`A while case must apply to at least one letter.`));
});

test("CodeValidator doesn't throw an error for a non-parametrised switch block without an else inside a parametrised module", () => {
    const parametrisedNoParameterSwitchParser = new CodeParser(parametrisedNoParameterSwitch);
    const parametrisedNoParameterSwitchProgram = parametrisedNoParameterSwitchParser.parse();
    const codeValidator = new CodeValidator(parametrisedNoParameterSwitchProgram);

    expect(() => {
        codeValidator.validate();
    }).not.toThrow();
});

test("CodeValidator throws an error for a parametrised switch block without an else inside a parametrised module", () => {
    const parametrisedWithParameterSwitchParser = new CodeParser(parametrisedWithParameterSwitch);
    const parametrisedWithParameterSwitchProgram = parametrisedWithParameterSwitchParser.parse();
    const codeValidator = new CodeValidator(parametrisedWithParameterSwitchProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error(`If parametrised letters are used then the switch block must have an else case.`));
});

test("CodeValidator throws an error if the first module is parametrised", () => {
    const parametrisedFirstModuleParser = new CodeParser(parametrisedFirstModule);
    const parametrisedFirstModuleProgram = parametrisedFirstModuleParser.parse();
    const codeValidator = new CodeValidator(parametrisedFirstModuleProgram);

    expect(() => {
        codeValidator.validate();
    }).toThrow(new Error("The first module cannot have parameters."));
});