import { createContext, useContext } from 'react';

import type { EditorStep } from './types';


// Values and formulas (the api's compiler.py "values and formulas"): a Value step names a number, a number setting after
// it can be `{expr: 'crunch * 2'}`. Numbers, value names, + - * / ( ) and min/max/round/abs. The api checks them again
export const VALUE_EFFECT_ID = 'value';
export const FORMULA_FUNCTIONS = ['min', 'max', 'round', 'abs'];
export const MAX_FORMULA_LENGTH = 120;

export interface Formula {
  expr: string,
}

export function isFormula(value: unknown): value is Formula {
  return typeof value === 'object' && value !== null && typeof (value as Formula).expr === 'string';
}


// the values a step can use: visible Value steps before it, name -> its number (kept in its own range)
export function valuesBefore(steps: Array<EditorStep>, stepId: string | null): Map<string, number> {
  const values = new Map<string, number>();
  for (const step of steps) {
    if (step.id === stepId) {
      break;
    }
    if (step.effect !== VALUE_EFFECT_ID || step.hidden) {
      continue;
    }
    const name = String(step.params.name ?? '').trim().toLowerCase();
    const minimum = Number(step.params.minimum ?? 0);
    const maximum = Number(step.params.maximum ?? 100);
    const raw = step.params.number;
    const number = (isFormula(raw)) ? evaluateFormula(raw.expr, values) : Number(raw);
    if (name && number !== null && Number.isFinite(number)) {
      values.set(name, Math.min(Math.max(number, minimum), maximum));
    }
  }
  return values;
}


type Token = {kind: 'number', value: number} | {kind: 'name', value: string} | {kind: 'op', value: string};

function tokenize(text: string): Array<Token> | null {
  const tokens: Array<Token> = [];
  const pattern = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|([-+*/(),]))/y;
  let position = 0;
  const trimmed = text.trimEnd();
  while (position < trimmed.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(trimmed);
    if (!match || match.index !== position || pattern.lastIndex === position) {
      return null;
    }
    if (match[1] !== undefined) {
      tokens.push({kind: 'number', value: Number(match[1])});
    } else if (match[2] !== undefined) {
      tokens.push({kind: 'name', value: match[2].toLowerCase()});
    } else {
      tokens.push({kind: 'op', value: match[3]});
    }
    position = pattern.lastIndex;
  }
  return tokens;
}


// what a formula comes to with these values, null when it can't be worked out (a typo, an unknown name)
export function evaluateFormula(text: string, values: Map<string, number>): number | null {
  const tokens = tokenize(text);
  if (!tokens || !tokens.length) {
    return null;
  }
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const expect = (op: string) => {
    const token = take();
    if (!token || token.kind !== 'op' || token.value !== op) {
      throw new Error(op);
    }
  };
  const primary = (): number => {
    const token = take();
    if (!token) {
      throw new Error('end');
    }
    if (token.kind === 'number') {
      return token.value;
    }
    if (token.kind === 'op' && token.value === '(') {
      const value = sum();
      expect(')');
      return value;
    }
    if (token.kind === 'op' && token.value === '-') {
      return -primary();
    }
    if (token.kind === 'name') {
      const next = peek();
      if (next?.kind === 'op' && next.value === '(') {
        take();
        const args = [sum()];
        while (peek()?.kind === 'op' && peek()!.value === ',') {
          take();
          args.push(sum());
        }
        expect(')');
        switch (token.value) {
          case 'min': return Math.min(...args);
          case 'max': return Math.max(...args);
          case 'abs': return Math.abs(args[0]);
          case 'round': return (args.length > 1) ? Math.round(args[0] * 10 ** args[1]) / 10 ** args[1] : Math.round(args[0]);
          default: throw new Error(token.value);
        }
      }
      const value = values.get(token.value);
      if (value === undefined) {
        throw new Error(token.value);
      }
      return value;
    }
    throw new Error('token');
  };
  const product = (): number => {
    let value = primary();
    while (peek()?.kind === 'op' && (peek()!.value === '*' || peek()!.value === '/')) {
      const op = take().value;
      const right = primary();
      value = (op === '*') ? value * right : value / right;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (peek()?.kind === 'op' && (peek()!.value === '+' || peek()!.value === '-')) {
      const op = take().value;
      const right = product();
      value = (op === '+') ? value + right : value - right;
    }
    return value;
  };
  try {
    const value = sum();
    return (index === tokens.length && Number.isFinite(value)) ? value : null;
  } catch {
    return null;
  }
}


// what the step being edited can use: the values before it, and a Value step's own range for its number
export interface FormulaContextValue {
  values: Map<string, number>,
  range?: {minimum: number, maximum: number},
}

export const FormulaContext = createContext<FormulaContextValue>({values: new Map()});

export function useFormulaContext(): FormulaContextValue {
  return useContext(FormulaContext);
}
