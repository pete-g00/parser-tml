import { BasicBlockContext, BlockContext, CoreBasicBlockContext, Direction, ElseCaseContext, GoToContext, IfCaseContext, NormalBlockContext, ProgramContext, SwitchBlockContext, TerminationContext, TerminationState } from "./Context";
import { TapeExecutor } from "./TapeExecutor";

export class CodeExecutor extends TapeExecutor {
    private _terminationStatus:TerminationState|undefined;
    private _program:ProgramContext;
    private _currentBlockIndexStack:number[];
    private _currentBlocksStack:NormalBlockContext[][];
    private _argumentMapStack:Map<string, string>[];
    private _topLevelModuleStack:boolean[];

    /**
     * The current blocks being executed
     */
    private get _currentBlocks(): NormalBlockContext[] {
        return this._currentBlocksStack[this._currentBlocksStack.length-1];
    }

    /**
     * The current block index
     */
    private get _currentBlockIndex(): number {
        return this._currentBlockIndexStack[this._currentBlockIndexStack.length-1];
    }

    /**
     * The current argument map
     */
    private get _currentArgumentMap(): Map<string, string> {
        return this._argumentMapStack[this._argumentMapStack.length-1];
    }

    /**
     * Whether the current execution stack represents the blocks of a module
     */
    private get _topLevelIsModule(): boolean {
        return this._topLevelModuleStack[this._topLevelModuleStack.length-1];
    }

    /**
     * Pushes the blocks given to the execution stack
     * 
     * @param blocks the blocks to push to the execution stack
     * @param pushingModule whether we are pushing the blocks of a module
     */
    private _pushBlocks(blocks:NormalBlockContext[], pushingModule:boolean):void {
        this._currentBlocksStack.push(blocks);
        this._currentBlockIndexStack.push(0);
        this._topLevelModuleStack.push(pushingModule);
    }

    /**
     * Increments the index of the executing block
     * 
     * @returns true if this block wasn't the final block; false otherwise
     */
    private _incrementIndex(): boolean{
        const currentBlocks = this._currentBlocksStack[this._currentBlocksStack.length-1];
        const currentBlockIndex = this._currentBlockIndexStack[this._currentBlockIndexStack.length-1];

        this._currentBlockIndexStack[this._currentBlockIndexStack.length-1] ++;

        return currentBlockIndex+1 < currentBlocks.length;
    }

    /**
     * Pops blocks from the execution stack as long as we are at the final index
     */
    private _incrementIndexAndPop(): void {
        while (this._currentBlocksStack.length > 0 && !this._incrementIndex()) {
            this._currentBlocksStack.pop();
            this._currentBlockIndexStack.pop();
            if (this._topLevelIsModule) {
                this._argumentMapStack.pop();
            }
            this._topLevelModuleStack.pop();   
        }
    }
    
    public get terminationStatus(): TerminationState | undefined {
        return this._terminationStatus;
    }

    private _validateTapeValue(value:string) {
        for (let i = 0; i < value.length; i++) {
            if (value[i].trim().length !== 0 && !this._program.alphabet.values.includes(value[i])) {
                throw new Error("The tape is not valid for the given TM Program.");
            }
        }
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
            argumentMap.set(args[i], params[i]);
        }

        this._argumentMapStack.push(argumentMap);
    }

    public constructor(value:string, program:ProgramContext) {
        super(value);
        this._program = program;
        this._validateTapeValue(value);
        
        this._currentBlocksStack = [program.modules[0].blocks];
        this._currentBlockIndexStack = [0];
        this._argumentMapStack = [new Map()];
        this._topLevelModuleStack = [true];
    }

    /**
     * The current block being executed.
     * 
     * The value is undefined if the execution has terminated.
     */
    public get currentBlock(): BlockContext | undefined {
        if (this._terminationStatus === undefined) {
            return this._currentBlocks[this._currentBlockIndex];
        } 
        return undefined;
    }

    /**
     * Executes the given block. In particular, changes the tapehead value and moves in the 
     * direction specified by the block. If either value isn't given, then the default value is taken.
     * 
     * @param block the basic block to execute
     * @param letter the next letter
     */
    private _execute(block:BasicBlockContext | CoreBasicBlockContext, letter: string): void {
        this.tape.change(block.changeToCommand?.value ?? letter);
        this.tape.move(block.moveCommand?.direction ?? Direction.LEFT);
    }

    /**
     * Finds the block to be executed for the given tapehead value.
     * 
     * @param tapehead the tapehead value
     * @returns the current execution block
     */
    private _findExecutionBlock(tapehead: string): BasicBlockContext| CoreBasicBlockContext {
        const currentBlock = this.currentBlock;
        // determine the executing block
        let executionBlock:BasicBlockContext | CoreBasicBlockContext;
        // basic block => it is this
        if (currentBlock instanceof BasicBlockContext) {
            executionBlock = currentBlock;
        }
        // switch block => identify the relevant case and extract the first while/if block it matches (or the else block)
        else if (currentBlock instanceof SwitchBlockContext) {
            const caseBlock = currentBlock.cases.find((_case) => _case.applies(tapehead, this._currentArgumentMap))!;
            executionBlock = caseBlock.firstBlock;
            if (caseBlock instanceof IfCaseContext || caseBlock instanceof ElseCaseContext) {
                this._pushBlocks(caseBlock.blocks, false);
            }
        }

        return executionBlock!;
    }

    /**
     * Move from the current execution block to the next one.
     * 
     * @param executionBlock the current execution block
     */
    private _findNextBlock(executionBlock:BasicBlockContext): void {
        // case 1: flow command present => take it
        const flowCommand = executionBlock.flowCommand;
        // goto statement => go to that module
        if (flowCommand instanceof GoToContext) {
            const nextModule = this._program.modules.find((module) => {
                return module.identifier === flowCommand.identifier;
            })!;
            this._pushBlocks(nextModule.blocks, true);
            this._generateAndPushArgumentMap(nextModule.params, flowCommand.args);
        }
        // flow command => terminate with that status
        else if (flowCommand instanceof TerminationContext) {
            this._terminationStatus = flowCommand.state;
        }
        // case 2: increment index (and pop if not possible)
        else {
            this._incrementIndexAndPop();

            // case 3: execution stack is empty => reject
            if (this._currentBlocksStack.length === 0) {
                this._terminationStatus = TerminationState.REJECT;
            } 
        }
    }

    public execute(): boolean {
        if (this.terminationStatus !== undefined) {
            return false;
        }
        
        const tapehead = this.tape.get(0);

        const executionBlock = this._findExecutionBlock(tapehead);
        this._execute(executionBlock, tapehead);

        // move to the next block if we didn't execute a while block (i.e. a core basic block)
        if (executionBlock instanceof BasicBlockContext) {
            this._findNextBlock(executionBlock);
        }
        
        return true;
    }    
}