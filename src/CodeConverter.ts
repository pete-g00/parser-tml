import { CodeVisitor } from "./CodeVisitor";
import { ProgramContext,ModuleContext, BasicBlockContext, SwitchBlockContext, IfCaseContext, GoToContext, TerminationContext, ElseCaseContext, WhileCaseContext, NormalBlockContext, CaseContext, CoreBasicBlockContext } from "./Context";
import { ConstantTMState, TuringMachine, VariableTMState, IncompleteTMChange } from "./TuringMachine";

/**
 * The class `CodeConverter` converts a valid TM program into a valid TM.
 */
export class CodeConverter extends CodeVisitor<string|undefined> {
    // the TM being created
    private _turingMachine: TuringMachine;

    // the alphabet of the TM
    private _alphabet:Set<string>;

    // the program
    private _program:ProgramContext;

    // the stack of execution blocks
    private _currentBlocksStack: NormalBlockContext[][];
    
    // the stack of current index within the execution blocks
    private _currentBlockIndexStack:number[];    

    // the stack of argument maps
    private _argumentMapStack:Map<string, string>[];

    // the stack of identifiers (for both module and if/else blocks)
    private _identifierStack:string[];
    
    // the map that converts the module identifier to the actual module
    private _idToModule:Map<string, ModuleContext>;

    // the modules that have been constructed
    private _constructedModules:Map<string, string[][]>;

    // the map that converts an identifier to the next available index
    private _identifierIndexMap:Map<string, number>;

    /**
     * Creates a `CodeConverter`.
     * 
     * The class `CodeConverter` converts a valid TM program into a valid TM.
     * 
     */
    public constructor(program:ProgramContext) {
        super();
        this._program = program;
        this._turingMachine = new TuringMachine();

        this._turingMachine.alphabet = new Set(program.alphabet.values);
        this._alphabet = new Set(program.alphabet.values);

        this._currentBlocksStack = [];
        this._currentBlockIndexStack = [];
        this._argumentMapStack = [];
        this._identifierStack = [];
        this._idToModule = new Map();
        this._constructedModules = new Map();
        this._identifierIndexMap = new Map();
    }

    /**
     * The current argument map
     */
    private get _currentArgumentMap(): Map<string, string> {
        return this._argumentMapStack[this._argumentMapStack.length-1];
    }

    /**
     * The current arguments
     */
    private get _currentArgs(): string[] {
        return new Array(...this._currentArgumentMap.values());
    }

    /**
     * Pushes the blocks given to the execution stack
     * 
     * @param blocks the blocks to push to the execution stack
     * @param identifier the identifier for the current module (if pushing module blocks)
     */
    private _pushBlocks(blocks:NormalBlockContext[], identifier:string, isModule:boolean):void {
        this._currentBlocksStack.push(blocks);
        this._currentBlockIndexStack.push(0);
        this._identifierStack.push(identifier);
        if (!isModule) {
            this._argumentMapStack.push(this._currentArgumentMap);
        }
    }

    /**
     * The current module being converted. Goes through the execution stack until finding a module
     */
    private get _currentIdentifier(): string {
        return this._identifierStack[this._identifierStack.length-1];
    }

    /**
     * Increments the index of the executing block
     * 
     */
    private _incrementIndex(){
        this._currentBlockIndexStack[this._currentBlockIndexStack.length-1] ++;
        this._generateNextLabel(this._currentIdentifier, this._currentArgs);
    }

    /**
     * Returns the label of the current state
     * 
     * @param addArgs whether the arguments should be added to the label
     * @returns the current label
     */
    private _getCurrentLabel(addArgs?:boolean): string {
        addArgs ??= true;
        let moduleLabel:string;
        let showLabel: string;
        if (this._currentArgs.length == 0) {
            moduleLabel = this._currentIdentifier;
            showLabel = this._currentIdentifier;
        } else {
            moduleLabel = this._currentIdentifier + "-" + this._currentArgs.join(",");
            showLabel = this._currentIdentifier + (addArgs ? "-" + this._currentArgs.join(",") : "");
        }
        const i = this._identifierIndexMap.get(moduleLabel)!;
        return showLabel + "-" + i.toString();
    }

    /**
     * Imitates incrementing the index and popping the execution stack, 
     * trying to find if from the current execution stack it is possible for us
     * to continue execution somewhere within the program.
     * 
     * @returns the identifier where execution could be continued if possible
     */
    private _incrementIndexAndFindNextState(): string|undefined {
        for (let i=this._currentBlocksStack.length-1; i>=0; i--) {
            const blockStack = this._currentBlocksStack[i];
            const j = this._currentBlockIndexStack[i];
            // if we're not at the final index within this block stack, then the next label for this module will be the label we want
            if (j+1 < blockStack.length) {
                return this._findNextLabel(i);
            }
        }

        return undefined;
    }

    /**
     * Pops blocks from the execution stack
     */
    private _popBlocks(): void {
        this._currentBlocksStack.pop();
        this._currentBlockIndexStack.pop();
        this._argumentMapStack.pop();
        this._identifierStack.pop();
    }

    /**
     * Given a list of module parameter values and the goto statement argument values, 
     * computes the argument map and pushes it to the argument map stack.
     * 
     * @param params the module parameter values
     * @param args the goto statement argument values
     */
    private _generateAndPushArgumentMap(params:string[], args:string[]) {
        const argumentMap:Map<string, string> = new Map();
        for (let i=0; i<args.length; i++) {
            argumentMap.set(params[i], args[i]);
        }

        this._argumentMapStack.push(argumentMap);
    }

    /**
     * Generates the next available label for the given module identifier with respect to the arguments
     * 
     * @param identifier the module identifier
     * @param args the arguments of the module
     * 
     */
    private _generateNextLabel(identifier:string, args:string[], startWith?:number): string {
        let moduleIdentifier:string;
        if (args.length == 0) {
            moduleIdentifier = identifier;
        } else {
            moduleIdentifier = identifier + "-" + args.join(",");
        }
        const i = this._identifierIndexMap.get(moduleIdentifier) ?? (startWith ?? 0) - 1;
        this._identifierIndexMap.set(moduleIdentifier, i+1);
        const label = moduleIdentifier + "-" + (i+1).toString();
        return label;
    }

    private _findNextLabel(n:number): string {
        const moduleLabel = this._identifierStack[n] + Array(...this._argumentMapStack[n].keys()).join(",");
        const i = this._identifierIndexMap.get(moduleLabel)!;
        return moduleLabel + "-" + (i+1).toString();
    }
    
    /**
     * 
     * Converts the program into a Turing Machine.
     * 
     * @returns the turing machine
     */
    public convert(): TuringMachine {
        this.visit(this._program);

        return this._turingMachine;
    }

    /**
     * Converts the program into a Turing Machine.
     * 
     * @param program the program
     */
    public visitProgram(program: ProgramContext):undefined {
        this._turingMachine.initialState = program.modules[0].identifier + "-0";
        for (const module of program.modules) {
            this._idToModule.set(module.identifier, module);
        }

        this._argumentMapStack.push(new Map());
        this.visit(program.modules[0]);
        return undefined;
    }
    
    /**
     * Converts a module into states within the Turing Machine.
     * 
     * @param module the module
     */
    public visitModule(module: ModuleContext):undefined {
        this._generateNextLabel(module.identifier, this._currentArgs);
        this._pushBlocks(module.blocks, module.identifier, true);
        
        const currentConstructed = this._constructedModules.get(module.identifier) ?? [];
        currentConstructed.push(this._currentArgs);
        this._constructedModules.set(module.identifier, currentConstructed);
        
        for (let i = 0; i < module.blocks.length; i++) {
            this.visit(module.blocks[i]);
            this._incrementIndex();
        }
        
        this._popBlocks();

        return undefined;
    }

    /**
     * Given a module identifier and the argument list, checks whether 
     * we have already visited this module with the given list of arguments.
     * 
     * @param identifier the module identifier
     * @param args the arguments of the module
     */
    private _isModuleConstructed(identifier:string, args:string[]):boolean {
        const constructedModules = this._constructedModules.get(identifier) ?? [];

        for (let i = 0; i < constructedModules.length; i++) {
            const constructedArgs = constructedModules[i];
            let matched = true;
            for (let j = 0; j < constructedArgs.length; j++) {
                if (constructedArgs[j] !== args[j]) {
                    matched = false;
                }
            }
            if (matched) {
                return true;
            }
        }

        return false;
    }

    /**
     * Retrieves the nextState from the goto command
     * 
     * @param command the command
     * @returns the label of the nextState
     */
    public visitGoTo(command: GoToContext): string {
        const module = this._idToModule.get(command.identifier)!;
        
        // if not already generated the map for the module (with respect to its arguments), then generate it
        if (!this._isModuleConstructed(module.identifier, command.args)) {
            this._generateAndPushArgumentMap(module.params, command.args);
            this.visit(module);
        }

        // after that is done, come back and set the goto state to be that
        if (command.args.length == 0) {
            return command.identifier + "-0";
        } else {
            return command.identifier + "-" + command.args.join(",") + "-0";
        }
    }

    /**
     * Retrieves the nextState from the termination command
     * 
     * @param command the termination command
     * @returns the label of the nextState
     */
    public visitTermination(command: TerminationContext): string {
        return command.state.toString();
    }

    /**
     * Given a basic block within a list of blocks, finds the TM Change for it.
     * 
     * @param block the basic block
     * @returns the TM change for the basic block
     */
    private _getTMChangeForBasicBlock(block: BasicBlockContext): IncompleteTMChange {
        const direction = block.moveCommand?.direction;
        let nextState:string;
        // flow command present => visit and generate next state
        if (block.flowCommand !== undefined) {
            nextState = this.visit(block.flowCommand)!;
        } else {
            // otherwise, backtrack and find the next state if possible. If not possible, then reject
            nextState = this._incrementIndexAndFindNextState() ?? "reject";
        }

        const letter = block.changeToCommand?.getNextValue(this._currentArgumentMap);

        return { nextState, letter, direction };
    }

    /**
     * Given a switch block within a list of blocks, finds the TM Change for it.
     * 
     * @param switchCase the switch case
     * @returns the TM change for the switch block
     */
    private _getTMChangeForSwitchCase(switchCase: CaseContext): IncompleteTMChange {
        const block = switchCase.firstBlock;
        const direction = block.moveCommand?.direction;
        let nextState:string|undefined;
        
        // have flow command => use it to find the next state
        if (!(block instanceof CoreBasicBlockContext) && block.flowCommand !== undefined) {
            nextState = this.visit(block.flowCommand)!;
        } else {
            // try finding the next state using the switch case
            nextState = this.visit(switchCase);
            // if unsuccessful, try backtracking to find some state
            // if this also fails, reject
            if (nextState === undefined) {
                nextState = this._incrementIndexAndFindNextState() ?? "reject"; 
            }
        }
        
        const letter = block.changeToCommand?.getNextValue(this._currentArgumentMap);

        return { nextState, letter, direction };
    }

    /**
     * Converts a basic block into a state.
     * 
     * @param block the basic block
     */
    public visitBasicBlock(block: BasicBlockContext):undefined {
        const change = this._getTMChangeForBasicBlock(block);
        const state = new ConstantTMState(this._getCurrentLabel(), this._alphabet!, change);
        this._turingMachine.addState(state);

        return undefined;
    }

    /**
     * Converts a switch block into a state.
     * 
     * @param block the switch block
     */
    public visitSwitchBlock(block: SwitchBlockContext):undefined {
        const state = new VariableTMState(this._getCurrentLabel());
        this._turingMachine.addState(state);
        
        const remainingLetters = new Set(this._alphabet);
        remainingLetters.add("");
        
        for (const switchCase of block.cases) {
            const change = this._getTMChangeForSwitchCase(switchCase);
            // add transition to the relevant letters
            if (switchCase instanceof ElseCaseContext) {
                remainingLetters.forEach((letter) => {
                    state.addTransition(letter, change);
                });
            } else if (switchCase instanceof IfCaseContext || switchCase instanceof WhileCaseContext) {
                switchCase.values.forEach((value) => {
                    const letter = this._currentArgumentMap.get(value) || value;
                    remainingLetters.delete(letter);
                    state.addTransition(letter, change);
                });
            }
        }

        return undefined;
    }
    
    private _visitIfOrElse(blocks: NormalBlockContext[], extraLabel:string): string|undefined {
        // the first block is part of the switch case; the remaining blocks form a new sequence of blocks
        if (blocks.length > 1) {
            const newIdentifier = this._getCurrentLabel(false) + "-" + extraLabel;
            const newLabel = this._generateNextLabel(newIdentifier, this._currentArgs, 1);
            this._pushBlocks(blocks, newIdentifier, false);
            
            for (let i = 1; i < blocks.length; i++) {
                this.visit(blocks[i]);
                this._incrementIndex();
            }
            this._popBlocks();
            
            return newLabel;
        }

        return undefined;
    }

    /**
     * Converts an if block into states.
     * 
     * @param block the if block
     */
    public visitIf(block: IfCaseContext): string|undefined {
        return this._visitIfOrElse(block.blocks, 
            block.values.map((v) => v || "blank").join(",")
        );
    }

    public visitElse(block: ElseCaseContext): string|undefined {
        return this._visitIfOrElse(block.blocks, "else");
    }

    public visitMove(): undefined {
        return undefined;
    }

    public visitChangeTo(): undefined {
        return undefined;
    }
    
    public visitCoreBasicBlock(): undefined {
        return undefined;
    }
    
    public visitWhile(): string {
        return this._getCurrentLabel();
    }
    
    public visitAlphabet(): undefined {
        return undefined;
    }
}