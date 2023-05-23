import { CodeError } from "./CodeError";
import { CodePosition } from "./CodePosition";
import { CodeWrapper } from "./CodeWrapper";
import { AlphabetContext, BasicBlockContext, CaseContext, ChangeToContext, CoreBasicBlockContext, Direction, ElseCaseContext, FlowChangeContext, GoToContext, IfCaseContext, ModuleContext, MoveContext, NormalBlockContext, ProgramContext, SwitchBlockContext, TerminationContext, TerminationState, WhileCaseContext } from "./Context";

export class CodeParser {
    /**
     * The wrapper for the code present
     */
    private _wrapper:CodeWrapper;

    /**
     * Whether we have reached the end of code
     */
    private reachedEnd:boolean;
    
    /**
     * Constructs a parser for the given code
     * 
     * @param code the code to parse
     */
    public constructor(code:string) {
        this._wrapper = new CodeWrapper(code);
        this.reachedEnd = false;
    }

    /**
     * Moves to the next line (or end of file) given that this line is a comment line now
     * 
     */
     private _ignoreComments() {
        let couldMove:boolean;
        const startLine = this._wrapper.currentPosition.startLineNumber;
        do {
            couldMove = this._wrapper.moveNext();
        } while (couldMove && startLine === this._wrapper.currentPosition.startLineNumber);
        
        // couldn't move => reached the end
        if (!couldMove) {
            this.reachedEnd = true;
        }
    }

    /**
     * Matches full-line comment(s) in the program
     * 
     */
    private _matchComments() {
        while (this._wrapper.currentValue === "##") {
             this._ignoreComments();
        }
    }
    
    /**
     * Moves to the next value, ignoring comments.
     * Throws an error if encounters the end of file.
     *  
     * @throws syntax error if there is no next value
     * 
     * @returns whether we should move
     * 
     * @param shouldThrow whether an error should be thrown
     */
     private _moveNext(deIndentAllowed?:boolean, indentAllowed?:boolean, shouldThrow?:boolean) {
        shouldThrow ??= true;
        indentAllowed ??= false;
        deIndentAllowed ??= false;

        const prevStackLength = this._wrapper.indentationStack.length;
        if (!this._wrapper.moveNext()) {
            this.reachedEnd = true;
        } else {
            this._matchComments();
        }
        const newStack = this._wrapper.indentationStack;
        if (newStack[newStack.length-1] == -1) {
            throw new CodeError(this._wrapper.currentPosition, "Invalid indentation.");
        } else if (!deIndentAllowed && newStack.length < prevStackLength) {
            throw new CodeError(this._wrapper.currentPosition, "Unexpected de-indentation.");
        } else if (!indentAllowed && newStack.length > prevStackLength) {
            throw new CodeError(this._wrapper.currentPosition, "Unexpected indentation.");
        }

        if (this.reachedEnd && shouldThrow) {
            throw new CodeError(this._wrapper.currentPosition, `Unexpected end of file.`);
        }
    }

    /**
     * Parses the given code.
     * 
     * @throws SyntaxError if there is a syntax error
     * 
     * @returns the parsed version of the program
     */
    public parse(): ProgramContext {
        this._moveNext();
        return this._parseProgram();
    }

    /**
     * Matches the given value to the current value
     * 
     * @param value the expected value to be present
     * 
     * @throws syntax error if there is a mismatch
     */
    private _matchValue(value:string) {
        if (this._wrapper.currentValue !== value) {
            throw new CodeError(this._wrapper.currentPosition, `Expected value "${this._wrapper.currentValue}" to be "${value}".`);
        }
    }

    /**
     * Expects moveNext to result in indentation
     * 
     * If this does not happen, then we throw
     */
    private _matchIndent() {
        const prevStackLength = this._wrapper.indentationStack.length;
        this._moveNext(false, true);
        const newIndentStack = this._wrapper.indentationStack;
        
        // the stack has been updated and the top value isn't -1 then we're good
        if (prevStackLength != newIndentStack.length - 1 || newIndentStack[newIndentStack.length-1] == -1) {
            throw new CodeError(this._wrapper.currentPosition, `Expected indentation.`);
        }
    }

    /**
     * Checks whether moveNext results in a de-indentation (or end of file)
     * 
     * @returns true if we have de-indented; false otherwise
     */
    private _checkDeIndent(): boolean {
        const prevStackLength = this._wrapper.indentationStack.length;
        this._moveNext(true, false, false);
        const newIndentStack = this._wrapper.indentationStack;
        
        // the indentation stack must have popped (or we're at the end)
        return this.reachedEnd || prevStackLength > newIndentStack.length;
    }

    /**
     * Keeps executing the callback until we have de-indented (or reached the end of file)
     *  
     * @param callback the function to call every time we have not de-indented
     */
    private _doUntilDeIndent(callback: () => void) {
        const prevStackLength = this._wrapper.indentationStack.length;
        while (!this.reachedEnd && this._wrapper.indentationStack.length >= prevStackLength) {
            callback(); 
        }
    }

    /**
     * The parser for program
     * 
     */
    private _parseProgram(): ProgramContext {
        const startPosition = this._wrapper.currentPosition;
        
        const alphabet = this._parseAlphabet();
        this._moveNext(false, false, false);
        
        const modules:ModuleContext[] = [];

        while (!this.reachedEnd) {
            modules.push(this._parseModule());
        }
        
        const endPosition = this._wrapper.currentPosition;
        const position = CodePosition.combine(startPosition, endPosition);
        
        // if (modules.length === 0) {
        //     throw new CodeError(position, `A program should have at least one module.`);
        // }
        
        return new ProgramContext(position, alphabet, modules);
    }

    /**
     * Parse letters in the alphabet/case. 
     * 
     * @param finishedValue the value that marks the parsing is complete (e.g. "}")
     * @param includesBlank whether the blank value can be included
     * 
     * @returns the values in the alphabet/case
     * 
     */
    private _parseValues(finishedValue:string, includesBlank?:boolean): string[] {
        includesBlank ??= false;
        const values:string[] = [];
        let noComma = false;

        while (this._wrapper.currentValue !== finishedValue) {
            // if next character isn't comma => must have been past the last entry
            if (noComma) {
                throw new CodeError(this._wrapper.currentPosition, `Expected value "${this._wrapper.currentValue}" to be "${finishedValue}".`);
            }
            if (includesBlank && this._wrapper.currentValue === "blank") {
                values.push("");
            } else {
                if (this._wrapper.currentValue.length !== 1) {
                    throw new CodeError(this._wrapper.currentPosition, `The value "${this._wrapper.currentValue}" must have length 1.`);
                }
                if (!this._wrapper.currentValue.match(/[a-z|0-9]/)) {
                    throw new CodeError(this._wrapper.currentPosition, `The value "${this._wrapper.currentValue}" must be a lowercase character or a number.`);
                }
                
                values.push(this._wrapper.currentValue);    
            }
            
            this._moveNext();
            if (this._wrapper.currentValue === ",") {
                this._moveNext();
            } else {
                noComma = true;
            }
        }
        return values;
    }

    /**
     * The parser of the alphabet
     * 
     * @returns the set of alphabet
     */
    private _parseAlphabet(): AlphabetContext {
        const startPosition = this._wrapper.currentPosition;
        this._matchValue("alphabet");
        this._moveNext();
        
        this._matchValue("=");
        this._moveNext();
        
        this._matchValue("[");
        this._moveNext();

        const alphabet =  this._parseValues("]");
        
        const endPosition = this._wrapper.currentPosition;
        const position = CodePosition.combine(startPosition, endPosition);

        return new AlphabetContext(position, alphabet);
    }

    /**
     * The parser of the module
     *  
     */
    private _parseModule(): ModuleContext {
        const startPosition = this._wrapper.currentPosition;
        
        this._matchValue("module");
        this._moveNext();

        const label = this._wrapper.currentValue;
        this._moveNext();

        this._matchValue("(");
        this._moveNext();
        
        const params = this._parseValues(")");
        this._moveNext();
        
        this._matchValue(":");
        this._matchIndent();

        const blocks:NormalBlockContext[] = [];
        let endPosition = this._wrapper.currentPosition;
        this._doUntilDeIndent(() => {
            const block = this._parseBlock();
            blocks.push(block);
            endPosition = block.position;
        });

        const position = CodePosition.combine(startPosition, endPosition);

        return new ModuleContext(position, label, params, blocks);
    }

    private _parseBlock(): NormalBlockContext {
        if (["if", "else", "while"].includes(this._wrapper.currentValue)) {
            return this._parseSwitchBlock();
        } else {
            return this._parseBasicBlock();
        }
    }

    private _parseSwitchBlock(): SwitchBlockContext {
        const startPosition = this._wrapper.currentPosition;
        const cases:CaseContext[] = [];

        let endPosition:CodePosition;

        this._doUntilDeIndent(() => {
            let newCase:CaseContext;
            if (this._wrapper.currentValue === "if") {
                newCase = this._parseIf();
            } else if (this._wrapper.currentValue === "while") {
                newCase = this._parseWhile();
            } else if (this._wrapper.currentValue === "else") {
                newCase = this._parseElse();
            } else {
                throw new CodeError(this._wrapper.currentPosition, `Unexpected start of case: "${this._wrapper.currentValue}".`);
            }
            cases.push(newCase);
            endPosition = newCase.position;
        });
        
        const position = CodePosition.combine(startPosition, endPosition!);
        
        return new SwitchBlockContext(position, cases);
    }

    private _parseElse(): ElseCaseContext {
        const startPosition = this._wrapper.currentPosition;
        
        this._matchValue("else");
        this._moveNext();

        this._matchValue(":");
        this._matchIndent();
        
        const blocks:NormalBlockContext[] = [];
        let endPosition = this._wrapper.currentPosition;
        this._doUntilDeIndent(() => {
            const block = this._parseBlock();
            blocks.push(block);
            endPosition = block.position;
        });
        
        const position = CodePosition.combine(startPosition, endPosition);

        return new ElseCaseContext(position, blocks);
    }

    private _parseIf(): IfCaseContext {
        const startPosition = this._wrapper.currentPosition;
        
        this._matchValue("if");
        this._moveNext();

        const values = this._parseValues(":", true);
        this._matchIndent();
        
        const blocks:NormalBlockContext[] = [];
        let endPosition = this._wrapper.currentPosition;
        this._doUntilDeIndent(() => {
            const block = this._parseBlock();
            blocks.push(block);
            endPosition = block.position;
        });

        const position = CodePosition.combine(startPosition, endPosition);

        return new IfCaseContext(position, values, blocks);
    }

    private _parseWhile(): WhileCaseContext {
        const startPosition = this._wrapper.currentPosition;
     
        this._matchValue("while");
        this._moveNext();

        const values = this._parseValues(":", true);
        this._matchIndent();
        
        const block = this._parseCoreBlock();

        const position = CodePosition.combine(startPosition, block.position);
        
        return new WhileCaseContext(position, values, block);
    }

    private _parseBasicBlock(): BasicBlockContext {
        const startPosition = this._wrapper.currentPosition;
        let endPosition = startPosition;
        
        let changeToCommand:ChangeToContext|undefined;
        let moveCommand:MoveContext|undefined;
        let flowCommand:FlowChangeContext|undefined;

        let finished = false;
        
        if (this._wrapper.currentValue === "changeto") {
            endPosition = this._wrapper.currentPosition;
            changeToCommand = this._parseChangeTo();
            if (this._checkDeIndent()) {
                finished = true;
            }
        } 

        if (!finished && this._wrapper.currentValue === "move") {
            moveCommand = this._parseMove();
            endPosition = this._wrapper.currentPosition;
            if (this._checkDeIndent()) {
                finished = true;
            }
        }

        if (!finished && ["accept", "reject", "halt"].includes(this._wrapper.currentValue)) {
            flowCommand = this._parseTermination();
            endPosition = this._wrapper.currentPosition;
            this._moveNext(true, false, false);
        } else if (!finished && this._wrapper.currentValue === "goto") {
            flowCommand = this._parseGoTo();
            endPosition = this._wrapper.currentPosition;
            this._moveNext(true, false, false);
        }

        if (startPosition === endPosition) {
            throw new CodeError(startPosition, `Invalid basic command "${this._wrapper.currentValue}".`);
        }
        
        const position = CodePosition.combine(startPosition, endPosition);

        return new BasicBlockContext(position, changeToCommand, moveCommand, flowCommand);
    }

    private _parseCoreBlock(): CoreBasicBlockContext {
        const startPosition = this._wrapper.currentPosition;
        let endPosition = startPosition;

        let changeToCommand:ChangeToContext|undefined;
        let moveCommand:MoveContext|undefined;

        let finished = false;

        if (this._wrapper.currentValue === "changeto") {
            changeToCommand = this._parseChangeTo();
            endPosition = this._wrapper.currentPosition;
            if (this._checkDeIndent()) {
                finished = true;
            }
        } 
        
        if (!finished && this._wrapper.currentValue === "move") {
            moveCommand = this._parseMove();
            endPosition = this._wrapper.currentPosition;
            if (this._checkDeIndent()) {
                finished = true;
            }
        } 
        
        if (startPosition === endPosition) {
            throw new CodeError(startPosition, `Invalid core command "${this._wrapper.currentValue}".`);
        }
        
        if (!finished) {
            throw new CodeError(this._wrapper.currentPosition, "A core block must only be composed of a changeto and a move command.");
        }

        const position = CodePosition.combine(startPosition, endPosition);
        
        return new CoreBasicBlockContext(position, changeToCommand, moveCommand);
    }

    private _parseChangeTo(): ChangeToContext {
        const startPosition = this._wrapper.currentPosition;
        this._moveNext();

        const value = this._wrapper.currentValue === "blank" ? "" : this._wrapper.currentValue;
        
        const endPosition = this._wrapper.currentPosition;
        const position = CodePosition.combine(startPosition, endPosition);

        return new ChangeToContext(position, value);
    }

    private _parseMove(): MoveContext {
        const startPosition = this._wrapper.currentPosition;
        this._moveNext();
        
        let direction:Direction;
        switch (this._wrapper.currentValue) {
            case "left":
                direction = Direction.LEFT;
                break;
            case "right":
                direction = Direction.RIGHT;
                break;
            case "start":
                direction = Direction.START;
                break;
            case "end":
                direction = Direction.END;
                break;
            default:
                throw new CodeError(this._wrapper.currentPosition, `Invalid direction "${this._wrapper.currentValue}".`);
        }
        const endPosition = this._wrapper.currentPosition;
        const position = CodePosition.combine(startPosition, endPosition);

        return new MoveContext(position, direction);
    }

    private _parseGoTo(): GoToContext {
        const startPosition = this._wrapper.currentPosition;
        this._moveNext();
        
        const identifier = this._wrapper.currentValue;
        this._moveNext();

        this._matchValue("(");
        this._moveNext();

        const args = this._parseValues(")");

        const endPosition = this._wrapper.currentPosition;
        const position = CodePosition.combine(startPosition, endPosition);

        return new GoToContext(position, args, identifier);
    }
    

    private _parseTermination(): TerminationContext {
        const position = this._wrapper.currentPosition;
        let state:TerminationState;
        switch (this._wrapper.currentValue) {
            case "reject":
                state = TerminationState.REJECT;
                break;
            case "accept":
                state = TerminationState.ACCEPT;
                break;
            case "halt":
                state = TerminationState.HALT;
                break;
        }
        return new TerminationContext(position, state!);
    }
}