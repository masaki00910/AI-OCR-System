/**
 * 条件評価ユーティリティ
 * シンプルなjsonLogic風の条件評価を実装
 */

export interface ConditionExpression {
  [operator: string]: any;
}

export class ConditionEvaluator {
  /**
   * 条件式を評価する
   * @param expression 条件式（jsonLogic形式）
   * @param context 評価用のコンテキストデータ
   * @returns 評価結果
   */
  static evaluate(expression: ConditionExpression, context: any): boolean {
    if (!expression || typeof expression !== 'object') {
      return true;
    }

    const operator = Object.keys(expression)[0];
    const operand = expression[operator];

    switch (operator) {
      case '==':
      case '===':
        return this.evaluateEquals(operand, context);
      
      case '!=':
      case '!==':
        return !this.evaluateEquals(operand, context);
      
      case '>':
        return this.evaluateGreaterThan(operand, context);
      
      case '>=':
        return this.evaluateGreaterThanOrEqual(operand, context);
      
      case '<':
        return this.evaluateLessThan(operand, context);
      
      case '<=':
        return this.evaluateLessThanOrEqual(operand, context);
      
      case 'and':
        return this.evaluateAnd(operand, context);
      
      case 'or':
        return this.evaluateOr(operand, context);
      
      case 'not':
        return !this.evaluate(operand, context);
      
      case 'in':
        return this.evaluateIn(operand, context);
      
      case 'var':
        return this.getVariable(operand, context);
      
      default:
        // 未知の演算子は真とする
        return true;
    }
  }

  private static evaluateEquals(operand: any[], context: any): boolean {
    if (!Array.isArray(operand) || operand.length !== 2) {
      return false;
    }
    
    const [left, right] = operand.map(val => this.resolveValue(val, context));
    return left === right;
  }

  private static evaluateGreaterThan(operand: any[], context: any): boolean {
    if (!Array.isArray(operand) || operand.length !== 2) {
      return false;
    }
    
    const [left, right] = operand.map(val => this.resolveValue(val, context));
    return Number(left) > Number(right);
  }

  private static evaluateGreaterThanOrEqual(operand: any[], context: any): boolean {
    if (!Array.isArray(operand) || operand.length !== 2) {
      return false;
    }
    
    const [left, right] = operand.map(val => this.resolveValue(val, context));
    return Number(left) >= Number(right);
  }

  private static evaluateLessThan(operand: any[], context: any): boolean {
    if (!Array.isArray(operand) || operand.length !== 2) {
      return false;
    }
    
    const [left, right] = operand.map(val => this.resolveValue(val, context));
    return Number(left) < Number(right);
  }

  private static evaluateLessThanOrEqual(operand: any[], context: any): boolean {
    if (!Array.isArray(operand) || operand.length !== 2) {
      return false;
    }
    
    const [left, right] = operand.map(val => this.resolveValue(val, context));
    return Number(left) <= Number(right);
  }

  private static evaluateAnd(operand: any[], context: any): boolean {
    if (!Array.isArray(operand)) {
      return false;
    }
    
    return operand.every(condition => this.evaluate(condition, context));
  }

  private static evaluateOr(operand: any[], context: any): boolean {
    if (!Array.isArray(operand)) {
      return false;
    }
    
    return operand.some(condition => this.evaluate(condition, context));
  }

  private static evaluateIn(operand: any[], context: any): boolean {
    if (!Array.isArray(operand) || operand.length !== 2) {
      return false;
    }
    
    const [value, array] = operand.map(val => this.resolveValue(val, context));
    return Array.isArray(array) && array.includes(value);
  }

  private static getVariable(path: string, context: any): any {
    if (!path || typeof path !== 'string') {
      return null;
    }

    return path.split('.').reduce((obj, key) => {
      return obj && typeof obj === 'object' ? obj[key] : undefined;
    }, context);
  }

  private static resolveValue(value: any, context: any): any {
    if (typeof value === 'object' && value !== null) {
      if (value.var) {
        return this.getVariable(value.var, context);
      }
      return this.evaluate(value, context);
    }
    return value;
  }
}

/**
 * サンプル条件式の例:
 * 
 * 金額条件:
 * { ">": [{ "var": "amount" }, 100000] }
 * 
 * 複合条件:
 * { "and": [
 *   { ">": [{ "var": "amount" }, 50000] },
 *   { "==": [{ "var": "priority" }, "high"] }
 * ] }
 * 
 * 配列条件:
 * { "in": [{ "var": "status" }, ["pending", "active"]] }
 */