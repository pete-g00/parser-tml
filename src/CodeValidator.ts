import { CodeError } from "./CodeError";
import { CodeVisitor } from "./CodeVisitor";
import { ProgramContext, ModuleContext, BasicBlockContext, CoreBasicBlockContext, SwitchBlockContext, IfCaseContext, WhileCaseContext, ChangeToContext, GoToContext, BlockContext, AlphabetContext, ElseCaseContext } from "./Context";

/**
 * `CodeValidator` ensures that the parsed TM program is valid by performing multiple checks on it.
 * 
 */
export class CodeValidator extends CodeVisitor<boolean> {
    /**
     * The alphabet of the program
     */
    private _alphabet?:Set<string>;

    /**
     * The name of the modules present with the number of parameters they have
     */
    private _moduleNames:Map<string, number>;

    private _program:ProgramContext;

    /**
     * The parameters of the current module
     */
    private parameters?:Set<string>;
    
    /**
     * `CodeValidator` ensures that the parsed TM program is valid. In particular, it checks the following:
     * 
     * 1a. Every module identifier used in *goto* statements must be defined somewhere in the program;
     * 1b. The number of parameters in a goto statement matches the number of module arguments;
     * 
     * 2. In every switch block:
     * 2a. If there is an else case, then there is nothing to check
     * 2b. If there is no else case, and the module is parametrised, then we throw
     * 2c. If there is no else case and the module isn't parametrised, then we throw if all letters have been covered
     * 
     * 3. A non-final block must not have a *flow* command; (ALLOWED)
     * 
     * 4. A *changeto* command must change to a valid letter in the alphabet, including blank;
     * 5. There cannot be two modules with the same identifier;
     * 
     * 6. A switch block must be the final block present; (ALLOWED)
     * 
     * 7a. The alphabet must be non-empty
     * 7b. There must be at least 1 module
     * 
     * 8. The first block within an if block cannot be a switch block.
     * 
     * 9. The module parameter labels cannot be the same as the letters in the alphabet
     * 
     * This is done using the visitor design pattern. 
     * 
     * We use boolean to record whether a block has a *flow* command, and returns false in every other case.
     */
    public constructor(program:ProgramContext) {
        super();
        this._program = program;
        this._moduleNames = new Map<string, number>();
    }

    public validate() {
        this.visit(this._program);
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
    
    public visitProgram(program: ProgramContext): boolean {
        this.visit(program.alphabet);
        this._addModuleNames(program);
        if (program.modules.length === 0) {
            throw new CodeError(program.position, "A program should have at least one module.");
        }
        
        for (const module of program.modules) {
            this.visit(module);
        }

        return true;
    }

    public visitAlphabet(context: AlphabetContext): boolean {
        if (context.values.length === 0) {
            throw new CodeError(context.position, `The alphabet must have at least one letter.`);
        }
        this._alphabet = new Set(context.values);

        return true;
    }

    /**
     * Validates whether a sequence of blocks only has a terminating command at its final block and a switch block is a final block if present
     * 
     * @param blocks the blocks to validate
     * @returns  whether the last block is a flow block
     */
    private _validateBlocks(blocks:BlockContext[], isIfBlock:boolean): boolean {
        let hasFlow = false;
        let hasSwitch = false;
        for (let i = 0; i < blocks.length; i++) {
            if (hasSwitch) {
                throw new CodeError(blocks[i-1].position, `A non-final block in a sequence of blocks cannot be a switch block.`);
            }
            if (hasFlow) {
                throw new CodeError(blocks[i-1].position, `A non-final block in a sequence of blocks cannot have a flow command.`);
            } 

            if (blocks[i] instanceof SwitchBlockContext) {
                if (isIfBlock && i === 0) {
                    throw new CodeError(blocks[i].position, `The first block within an if case cannot be a switch block.`);
                }
                hasSwitch = true;
            }

            if (this.visit(blocks[i])) {
                hasFlow = true;
            }
        }
        
        return hasFlow;
    }

    public visitModule(module: ModuleContext): boolean {
        this.parameters = new Set(module.params);
        module.params.forEach((letter) => {
            if (this._alphabet!.has(letter)) {
                throw new CodeError(module.position, `The letter "${letter}" is both in the alphabet and a module parameter.`);
            }
        });
        if (module.blocks.length == 0) {
            throw new CodeError(module.position, "A program should have at least one module.");
        }

        this._validateBlocks(module.blocks, false);
        return true;
    }

    public visitBasicBlock(block: BasicBlockContext): boolean {
        if (block.changeToCommand !== undefined) {
            this.visit(block.changeToCommand);
        }

        if (block.flowCommand !== undefined) {
            this.visit(block.flowCommand);
        }
        
        return block.flowCommand !== undefined;
    }
    
    public visitCoreBlock(block: CoreBasicBlockContext): boolean {
        if (block.changeToCommand !== undefined) {
            this.visit(block.changeToCommand);
        }

        return false;
    }

    public visitSwitchBlock(block: SwitchBlockContext): boolean {
        let hasFlow = false;
        const alphabetSet = new Set(this._alphabet);
        alphabetSet.add("");

        this.parameters!.forEach(letter => alphabetSet.add(letter));
        let seenElse = false;

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
                    if (letter != "" && !this._alphabet?.has(l)) {
                        throw new CodeError(block.position, `The letter "${l}" is not part of the alphabet.`);
                    }
                    if (!alphabetSet.delete(letter)) {
                        throw new CodeError(block.position, `Multiple cases present for letter "${l}".`);
                    }
                }
            }
            
            if (this.visit(switchCase)) {
                hasFlow = true;
            }
        }

        // not seen else and missing letters then throw
        if (!seenElse && alphabetSet.size !== 0) {
            const missingLetters = Array.from(alphabetSet).map(
                val => val.length === 0 ? "blank" : `"${val}"`
            );
            const letter = missingLetters.length === 1 ? "letter" : "letters";
            throw new CodeError(block.position, `The switch block doesn't have a case for the ${letter}: ${missingLetters.join(", ")}.`);
        }
        
        return hasFlow;
    }

    public visitIf(block: IfCaseContext): boolean {
        return this._validateBlocks(block.blocks, true);
    }

    public visitElse(block: ElseCaseContext): boolean {
        return this._validateBlocks(block.blocks, true);
    }
    
    public visitWhile(block: WhileCaseContext): boolean {
        this.visit(block.block);

        return false;
    }

    public visitChangeTo(command: ChangeToContext): boolean  {
        if (command.value !== "" && !this._alphabet!.has(command.value)) {
            throw new CodeError(command.position, `The letter "${command.value}" is not part of the alphabet.`);
        }

        return true;
    }

    public visitGoTo(command: GoToContext) : boolean {
        const paramCount = this._moduleNames.get(command.identifier);
        if (paramCount === undefined) {
            throw new CodeError(command.position, `Undefined module "${command.identifier}".`);
        } else if (command.args.length != paramCount) {
            throw new CodeError(command.position, `Expected ${paramCount} number of arguments.`);
        }

        return true;
    }

    public visitTermination(): boolean {
        return true;
    }

    public visitMove(): boolean {
        return true;
    }
    
    public visitCoreBasicBlock(): boolean {
        return true;
    }
}