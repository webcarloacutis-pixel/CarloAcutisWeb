'use strict';

// Local mitigation for GHSA-vfj7-8cjw-p6xm. This cap is intentionally fixed;
// callers can lower it, but cannot restore unbounded recursive traversal.
const MAX_DEPTH = 100;

const maxDepth = (options = {}) => Number.isFinite(options.maxDepth)
  ? Math.max(0, Math.min(MAX_DEPTH, Math.floor(options.maxDepth)))
  : MAX_DEPTH;

// Validate caller-supplied ASTs before any recursive walker mutates them.
// Traverse children only: parsed AST parent/prev links intentionally point back.
const assertAst = (ast, options = {}) => {
  const limit = maxDepth(options);
  const active = new WeakSet();
  const stack = [{ node: ast, depth: ast && ast.type === 'root' ? 0 : 1, exit: false }];
  while (stack.length) {
    const entry = stack.pop();
    const node = entry.node;
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      throw new TypeError('Invalid braces AST node reference');
    }
    if (entry.exit) {
      active.delete(node);
      continue;
    }
    if (active.has(node)) throw new RangeError('AST child tree contains a cycle');
    if (node.nodes === undefined) continue;
    if (!Array.isArray(node.nodes)) throw new TypeError('Invalid braces AST children');
    if (entry.depth > limit) {
      throw new RangeError(`AST depth (${entry.depth}), exceeds max depth (${limit})`);
    }
    active.add(node);
    stack.push({ node, depth: entry.depth, exit: true });
    for (let index = node.nodes.length - 1; index >= 0; index--) {
      const child = node.nodes[index];
      stack.push({ node: child, depth: child && child.nodes !== undefined ? entry.depth + 1 : entry.depth, exit: false });
    }
  }
};

const queueOwner = (node, options = {}) => {
  const seen = new WeakSet();
  const limit = maxDepth(options);
  let depth = 0;
  while (node.type !== 'brace' && node.type !== 'root' && node.parent) {
    if (seen.has(node)) throw new RangeError('AST parent chain contains a cycle');
    if (++depth > limit) throw new RangeError('AST parent chain exceeds max depth');
    seen.add(node);
    if (typeof node.parent !== 'object' || Array.isArray(node.parent)) {
      throw new TypeError('Invalid braces AST parent reference');
    }
    node = node.parent;
  }
  return node;
};

module.exports = { MAX_DEPTH, maxDepth, assertAst, queueOwner };
