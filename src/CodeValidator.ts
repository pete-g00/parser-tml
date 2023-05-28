import { CodeError } from "./CodeError";
import { CodeVisitor } from "./CodeVisitor";
import { ProgramContext, ModuleContext, BasicBlockContext, CoreBasicBlockContext, SwitchBlockContext, IfCaseContext, WhileCaseContext, ChangeToContext, GoToContext, AlphabetContext, ElseCaseContext, Context } from "./Context";

/**
 * `CodeValidator` ensures that the parsed TM program is valid by performing multiple checks on it.
 * 
 */
export class CodeValidator extends CodeVisitor<void> {
    /**
     * The alphabet of the program
     */
    private _alphabet?:Set<string>;

    /**
     * The name of the modules present with the number of _parameters they have
     */
    private _moduleNames:Map<string, number>;

    private _program:ProgramContext;

    /**
     * The _parameters of the current module
     */
    private _parameters?:Set<string>;
    
    /**
     * `CodeValidator` ensures that the parsed TM program is valid. In particular, it checks the following:
     * 
     * - Every module identifier used in *goto* statements must be defined somewhere in the program;
     * 
     * - The number of parameters in a goto statement matches the number of module arguments;
     * 
     * - In every switch block:
     *      - If there is an else case, then there is nothing to check
     *      - If there is no else case, and the module is parametrised, then we throw
     *      - If there is no else case and the module isn't parametrised, then we throw if all letters have been covered
     * 
     * - A *changeto* command must change to a valid letter in the alphabet, including blank;
     * 
     * - There cannot be two modules with the same identifier;
     * 
     * - Empty entries are not allowed:
     *      - The alphabet must be non-empty
     *      - There must be at least 1 module
     *      - An if case must apply to at least 1 letter
     *      - A while case must apply to at least 1 letter
     * 
     * - The first block of an if/else block must be a basic block
     * 
     * - The module parameter labels cannot be the same as the letters in the alphabet.
     * 
     * - The first module cannot have any parameters.
     * 
     * This is done using the visitor design pattern. 
     * 
     */
    public constructor(program:ProgramContext) {
        super();
        this._program = program;
        this._moduleNames = new Map<string, number>();
    }

    public validate() {
        this.visit(this._program);
    }

    public visitAll(contexts: Context[]): void {
        for (let i = 0; i < contexts.length; i++) {
            this.visit(contexts[i]);        
        }
    }

    /**
     * Adds all the module names into the set `_moduleNames`
     * 
     * @throws if there is a duplicate definition of a module, or if there is a module called accept or reject
     * 
     * @param program the program
     */
    private _addModuleNames(program: ProgramContext): void {
        for (const module of program.modules) {
            if (this._moduleNames.has(module.identifier)) {
                throw new CodeError(module.position, `Duplicate module with name "${module.identifier}".`);
            }
            this._moduleNames.set(module.identifier, module.params.length);
        }
    }
    
    public visitProgram(program: ProgramContext): void {
        this.visit(program.alphabet);
        this._addModuleNames(program);
        if (program.modules.length === 0) {
            throw new CodeError(program.position, "A program should have at least one module.");
        }
        if (program.modules[0].params.length != 0) {
            throw new CodeError(program.modules[0].position, "The first module cannot have parameters.");
        }

        this.visitAll(program.modules);
    }

    public visitAlphabet(context: AlphabetContext): void {
        if (context.values.length === 0) {
            throw new CodeError(context.position, `The alphabet must have at least one letter.`);
        }
        this._alphabet = new Set(context.values);
    }

    public visitModule(module: ModuleContext): void {
        this._parameters = new Set(module.params);
        module.params.forEach((letter) => {
            if (this._alphabet!.has(letter)) {
                throw new CodeError(module.position, `The letter "${letter}" is both in the alphabet and a module parameter.`);
            }
        });

        this.visitAll(module.blocks);
    }

    public visitSwitchBlock(block: SwitchBlockContext): void {
        const alphabetSet = new Set(this._alphabet);
        alphabetSet.add("");

        this._parameters!.forEach(letter => alphabetSet.add(letter));
        let seenElse = false;
        let seenParamValue = false;

        for (let i=0; i<block.cases.length; i++) {
            const switchCase = block.cases[i];
            if (switchCase instanceof ElseCaseContext) {
                if (i != block.cases.length-1) {
                    throw new CodeError(switchCase.position, "A non-final case cannot be an else block");
                }
                seenElse = true;
            } else if (switchCase instanceof IfCaseContext || switchCase instanceof WhileCaseContext) {
                for (const letter of switchCase.values) {
                    const l = letter || "blank";
                    if (this._parameters!.has(letter)) {
                        seenParamValue = true;
                    } else if (letter != "" && !this._alphabet!.has(l)) {
                        throw new CodeError(switchCase.position, `The letter "${l}" is not part of the alphabet.`);
                    }
                    alphabetSet.delete(letter);
                }
            }
        }

        this.visitAll(block.cases);

        if (seenParamValue && !seenElse) {
            throw new CodeError(block.position, `If parametrised letters are used then the switch block must have an else case.`);
        } else if (!seenElse && alphabetSet.size != this._parameters!.size) {
            const missingLetters = Array.from(alphabetSet).filter(
                val => !this._parameters!.has(val)
            ).map(
                val => val.length === 0 ? "blank" : `"${val}"`
            );
            const letter = missingLetters.length === 1 ? "letter" : "letters";
            throw new CodeError(block.position, `The switch block doesn't have a case for the ${letter}: ${missingLetters.join(", ")}.`);
        }
    }

    public visitIf(block: IfCaseContext): void {
        if (block.values.length == 0) {
            throw new CodeError(block.position, "An if case must apply to at least one letter.");
        }

        if (!(block.blocks[0] instanceof BasicBlockContext)) {
            throw new CodeError(block.blocks[0].position, "The first block within an if case must be a basic block.");
        }

        this.visitAll(block.blocks);
    }

    public visitElse(block: ElseCaseContext): void {
        if (!(block.blocks[0] instanceof BasicBlockContext)) {
            throw new CodeError(block.blocks[0].position, "The first block within an else case must be a basic block.");
        }

        this.visitAll(block.blocks);
    }
    
    public visitWhile(block: WhileCaseContext): void {
        if (block.values.length == 0) {
            throw new CodeError(block.position, "A while case must apply to at least one letter.");
        }
        this.visit(block.block);
    }

    public visitChangeTo(command: ChangeToContext): void  {
        if (command.value !== "" && !this._alphabet!.has(command.value)) {
            throw new CodeError(command.position, `The letter "${command.value}" is not part of the alphabet.`);
        }
    }

    public visitGoTo(command: GoToContext) : void {
        const paramCount = this._moduleNames.get(command.identifier);
        if (paramCount === undefined) {
            throw new CodeError(command.position, `Undefined module "${command.identifier}".`);
        } else if (command.args.length != paramCount) {
            const argument = paramCount == 1 ? "argument" : "arguments";
            throw new CodeError(command.position, `Expected ${paramCount} ${argument}.`);
        }
    }    

    public visitBasicBlock(block: BasicBlockContext): void {
        this.maybeVisit(block.changeToCommand);
        this.maybeVisit(block.flowCommand);
        this.maybeVisit(block.moveCommand);
    }
    
    public visitCoreBlock(block: CoreBasicBlockContext): void {
        this.maybeVisit(block.changeToCommand);
    }

    public visitTermination(): void {
        return undefined;
    }

    public visitMove(): void {
        return undefined;
    }
    
    public visitCoreBasicBlock(): void { 
        return undefined;
    }
}